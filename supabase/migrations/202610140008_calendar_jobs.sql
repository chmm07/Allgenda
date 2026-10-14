begin;
-- Prioridade persistente evita que falhas de uma conta bloqueiem as demais.
alter table public.calendar_bindings add column last_attempted_at timestamptz;
create function private.calendar_next_sync() returns jsonb
language plpgsql security definer set search_path='' as $$
declare binding public.calendar_bindings;
begin
  select b.* into binding from public.calendar_bindings b
  join auth.users u on u.id=b.user_id
  join private.invited_users i on i.email=lower(u.email)
  where u.email_confirmed_at is not null
    and exists(select 1 from auth.identities identity where identity.user_id=u.id and identity.provider='google')
    and (b.enabled or (b.removed_environment_id is not null and exists(select 1 from private.calendar_links l where l.binding_id=b.id)))
    and (b.lease_until is null or b.lease_until<=now())
    and (b.last_attempted_at is null or b.last_attempted_at<=now()-interval '1 minute')
  order by b.last_attempted_at nulls first,b.id
  limit 1 for update of b skip locked;
  if not found then return null; end if;
  update public.calendar_bindings set last_attempted_at=clock_timestamp() where id=binding.id;
  return jsonb_build_object('id',binding.id,'user_id',binding.user_id,'account_id',binding.account_id,'calendar_id',binding.calendar_id);
end $$;
create function public.calendar_next_sync() returns jsonb
language sql security invoker set search_path='' as $$select private.calendar_next_sync();$$;
revoke all on function private.calendar_next_sync(),public.calendar_next_sync() from public,anon,authenticated;
grant execute on function private.calendar_next_sync(),public.calendar_next_sync() to service_role;
-- last_attempted_at é interna: não expandir grants de coluna aos clientes.
create or replace function private.calendar_sync(owner_id uuid,target_binding uuid,operation text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare binding public.calendar_bindings; lease uuid; item public.appointments; draft public.appointments; tombstone private.calendar_tombstones; item_id uuid; expected timestamptz; result jsonb; exception public.appointment_exceptions; exception_draft public.appointment_exceptions; reset private.calendar_exception_resets; original timestamptz;
begin
  if not exists(select 1 from auth.users u join private.invited_users i on i.email=lower(u.email) join auth.identities identity on identity.user_id=u.id and identity.provider='google' where u.id=owner_id and u.email_confirmed_at is not null) then raise exception 'Acesso revogado'; end if;
  select * into binding from public.calendar_bindings where id=target_binding and user_id=owner_id for update;
  if not found then raise exception 'Calendário indisponível'; end if;
  if operation='begin' then
    if not binding.enabled and binding.removed_environment_id is null then raise exception 'Calendário pausado'; end if;
    if binding.lease_until>now() then raise exception 'Sincronização em andamento'; end if;
    lease:=gen_random_uuid();
    update public.calendar_bindings set lease_id=lease,lease_until=now()+interval '2 minutes' where id=binding.id;
    return jsonb_build_object('lease',lease,'binding',to_jsonb(binding),
      'appointments',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.appointments a where a.user_id=owner_id and a.environment_id=binding.environment_id),
      'exceptions',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from public.appointment_exceptions e join public.appointments a on a.id=e.appointment_id where a.user_id=owner_id and a.environment_id=binding.environment_id),
      'links',(select coalesce(jsonb_agg(to_jsonb(l)),'[]') from private.calendar_links l where l.binding_id=binding.id),
      'exception_links',(select coalesce(jsonb_agg(to_jsonb(l)),'[]') from private.calendar_exception_links l where l.binding_id=binding.id),
      'exception_resets',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from private.calendar_exception_resets r join public.appointments a on a.id=r.appointment_id where r.user_id=owner_id and a.environment_id=binding.environment_id),
      'tombstones',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from private.calendar_tombstones t where t.user_id=owner_id and t.environment_id=coalesce(binding.environment_id,binding.removed_environment_id)));
  end if;
  if binding.lease_id is distinct from (payload->>'lease')::uuid or binding.lease_until<=now() then raise exception 'Sincronização expirou; repita'; end if;
  if operation='finish' then
    update public.calendar_bindings set sync_token=payload->>'sync_token',last_synced_at=now(),last_error=nullif(payload->>'warning',''),lease_id=null,lease_until=null where id=binding.id;
    return '{}'::jsonb;
  elsif operation='fail' then
    update public.calendar_bindings set last_error='Não concluída. Repita ou reconecte a conta; os eventos pendentes foram preservados.',lease_id=null,lease_until=null where id=binding.id;
    return '{}'::jsonb;
  end if;
  item_id:=(payload->>'appointment_id')::uuid;
  select * into item from public.appointments where id=item_id and user_id=owner_id and environment_id=binding.environment_id for update;
  if operation like 'exception_%' then
    if item.id is null or (item.frequency='none' and operation not in ('exception_check','exception_forget')) or not exists(select 1 from private.calendar_links where binding_id=binding.id and appointment_id=item_id) then raise exception 'Série indisponível'; end if;
    if item.updated_at is distinct from (payload->>'expected_parent_updated_at')::timestamptz then raise exception 'Série mudou durante a sincronização'; end if;
    original:=(payload->>'original_start')::timestamptz;
    select * into exception from public.appointment_exceptions where appointment_id=item_id and original_start=original and user_id=owner_id for update;
    select * into reset from private.calendar_exception_resets where appointment_id=item_id and original_start=original and user_id=owner_id;
    if exception.updated_at is distinct from (payload->>'expected_updated_at')::timestamptz or reset.deleted_at is distinct from (payload->>'expected_deleted_at')::timestamptz then raise exception 'Ocorrência mudou durante a sincronização'; end if;
    if item.frequency='none' and (reset.deleted_at is null or exception.appointment_id is not null) then raise exception 'Substituição não confirmada'; end if;
    if operation='exception_check' then return '{}'::jsonb; end if;
    if operation='exception_forget' then delete from private.calendar_exception_links where binding_id=binding.id and appointment_id=item_id and original_start=original; return '{}'::jsonb; end if;
    if operation='exception_remote' then
      exception_draft:=jsonb_populate_record(null::public.appointment_exceptions,payload->'value');
      insert into public.appointment_exceptions(appointment_id,user_id,original_start,title,starts_at,ends_at,timezone,cancelled)
      values(item_id,owner_id,original,exception_draft.title,exception_draft.starts_at,exception_draft.ends_at,exception_draft.timezone,exception_draft.cancelled)
      on conflict(appointment_id,original_start) do update set title=excluded.title,starts_at=excluded.starts_at,ends_at=excluded.ends_at,timezone=excluded.timezone,cancelled=excluded.cancelled returning * into exception;
    elsif operation<>'exception_ack' then raise exception 'Operação inválida'; end if;
    if payload->>'etag'='*' or (not coalesce(length(payload->>'etag')>0,false) and not coalesce((payload->>'google_cancelled')::boolean,false)) then raise exception 'Versão Google ausente'; end if;
    insert into private.calendar_exception_links(binding_id,appointment_id,original_start,google_id,etag,local_updated_at,local_deleted_at)
    values(binding.id,item_id,original,payload->>'google_id',nullif(payload->>'etag',''),exception.updated_at,reset.deleted_at)
    on conflict(binding_id,appointment_id,original_start) do update set google_id=excluded.google_id,etag=excluded.etag,local_updated_at=excluded.local_updated_at,local_deleted_at=excluded.local_deleted_at;
    return coalesce(to_jsonb(exception),'{}'::jsonb);
  end if;
  expected:=(payload->>'expected_updated_at')::timestamptz;
  if item.updated_at is distinct from expected then raise exception 'Item mudou durante a sincronização; repita'; end if;
  select * into tombstone from private.calendar_tombstones where appointment_id=item_id and user_id=owner_id and environment_id=coalesce(binding.environment_id,binding.removed_environment_id);
  if tombstone.deleted_at is distinct from (payload->>'expected_deleted_at')::timestamptz then raise exception 'Exclusão mudou durante a sincronização; repita'; end if;
  if operation='check' then return '{}'::jsonb;
  elsif operation='remote' then
    if binding.environment_id is null then raise exception 'Ambiente excluído; não recriar itens sem associação'; end if;
    draft:=jsonb_populate_record(null::public.appointments,payload->'value');
    if item.id is null then
      insert into public.appointments(id,user_id,environment_id,title,starts_at,ends_at,timezone,frequency,repeat_interval,repeat_until)
      values(item_id,owner_id,binding.environment_id,draft.title,draft.starts_at,draft.ends_at,draft.timezone,draft.frequency,draft.repeat_interval,draft.repeat_until) returning * into item;
      delete from private.calendar_tombstones where appointment_id=item_id and user_id=owner_id;
    else
      if (item.starts_at,item.timezone,item.frequency,item.repeat_interval,item.repeat_until) is distinct from (draft.starts_at,draft.timezone,draft.frequency,draft.repeat_interval,draft.repeat_until) and exists(select 1 from public.appointment_exceptions where appointment_id=item_id) then raise exception 'Recorrência mudou no Google; confirme a substituição das alterações individuais na Allgenda'; end if;
      update public.appointments set title=draft.title,starts_at=draft.starts_at,ends_at=draft.ends_at,timezone=draft.timezone,frequency=draft.frequency,repeat_interval=draft.repeat_interval,repeat_until=draft.repeat_until where id=item_id returning * into item;
    end if;
  elsif operation='delete_remote' then
    delete from public.appointments where id=item.id;
    delete from private.calendar_links where binding_id=binding.id and appointment_id=item_id;
    return '{}'::jsonb;
  elsif operation='delete_local' then
    delete from private.calendar_links where binding_id=binding.id and appointment_id=item_id;
    return '{}'::jsonb;
  elsif operation<>'ack' then raise exception 'Operação inválida';
  end if;
  if item.id is null then raise exception 'Item indisponível'; end if;
  if not coalesce(length(payload->>'etag')>0,false) or payload->>'etag'='*' then raise exception 'Versão Google ausente'; end if;
  insert into private.calendar_links(binding_id,appointment_id,google_id,etag,local_updated_at,google_updated_at)
  values(binding.id,item_id,payload->>'google_id',payload->>'etag',item.updated_at,(payload->>'google_updated_at')::timestamptz)
  on conflict(binding_id,appointment_id) do update set google_id=excluded.google_id,etag=excluded.etag,local_updated_at=excluded.local_updated_at,google_updated_at=excluded.google_updated_at;
  result:=to_jsonb(item);
  return result;
end $$;
commit;
