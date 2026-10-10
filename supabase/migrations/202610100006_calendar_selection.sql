begin;
alter table public.google_accounts add constraint google_account_owner_unique unique(id,user_id);
create table public.calendar_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null,
  calendar_id text not null check(length(calendar_id) between 1 and 1024),
  calendar_name text not null check(length(btrim(calendar_name))>0),
  environment_id uuid,
  enabled boolean not null default false,
  sync_token text,
  last_synced_at timestamptz,
  last_error text,
  lease_id uuid,
  lease_until timestamptz,
  unique(account_id,calendar_id),
  foreign key(account_id,user_id) references public.google_accounts(id,user_id) on delete cascade,
  foreign key(environment_id,user_id) references public.environments(id,user_id),
  check(not enabled or environment_id is not null)
);
create unique index one_calendar_per_environment on public.calendar_bindings(environment_id) where environment_id is not null;
alter table public.calendar_bindings enable row level security;
revoke all on public.calendar_bindings from public,anon,authenticated;
grant select(id,user_id,account_id,calendar_id,calendar_name,environment_id,enabled,last_synced_at,last_error) on public.calendar_bindings to authenticated;
create policy own_binding_read on public.calendar_bindings for select to authenticated using(user_id=(select auth.uid()) and (select private.is_invited_user()));

-- Mapeamento explícito e confirmação da propagação. Pausar preserva todos os eventos.
create function public.configure_calendar(target_account uuid,target_calendar text,target_name text,target_environment uuid,activate boolean,confirmed boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare binding public.calendar_bindings; owner uuid := auth.uid(); result uuid;
begin
  if not private.is_invited_user() or not exists(select 1 from public.google_accounts where id=target_account and user_id=owner) then raise exception 'Conta indisponível'; end if;
  if activate and not confirmed then raise exception 'Confirme a sincronização e propagação de exclusões'; end if;
  if target_environment is null or not exists(select 1 from public.environments where id=target_environment and user_id=owner) then raise exception 'Escolha um ambiente próprio'; end if;
  select * into binding from public.calendar_bindings where account_id=target_account and calendar_id=target_calendar for update;
  if binding.lease_until>now() then raise exception 'Sincronização em andamento'; end if;
  if binding.id is not null and binding.environment_id is distinct from target_environment then raise exception 'Este calendário já possui ambiente; pause-o e preserve a associação'; end if;
  insert into public.calendar_bindings(user_id,account_id,calendar_id,calendar_name,environment_id,enabled)
  values(owner,target_account,target_calendar,target_name,target_environment,activate)
  on conflict(account_id,calendar_id) do update set enabled=excluded.enabled,calendar_name=excluded.calendar_name
  returning id into result;
  return result;
end $$;
revoke all on function public.configure_calendar(uuid,text,text,uuid,boolean,boolean) from public,anon;
grant execute on function public.configure_calendar(uuid,text,text,uuid,boolean,boolean) to authenticated;

-- Segredos disponíveis apenas ao servidor; identidade verificada novamente no banco.
create function private.calendar_credentials(owner_id uuid,target_account uuid,previous_cipher text default null,next_cipher text default null)
returns text language plpgsql security definer set search_path='' as $$
declare result text;
begin
  if not exists(select 1 from auth.users u join private.invited_users i on i.email=lower(u.email) join auth.identities identity on identity.user_id=u.id and identity.provider='google' where u.id=owner_id and u.email_confirmed_at is not null) then raise exception 'Acesso revogado'; end if;
  select c.ciphertext into result from private.google_credentials c join public.google_accounts a on a.id=c.account_id where a.id=target_account and a.user_id=owner_id for update of c;
  if result is null then raise exception 'Conta indisponível'; end if;
  if next_cipher is not null then
    if result is distinct from previous_cipher then raise exception 'Credencial mudou; repita a operação'; end if;
    update private.google_credentials set ciphertext=next_cipher where account_id=target_account;
    return next_cipher;
  end if;
  return result;
end $$;
create function public.calendar_credentials(owner_id uuid,target_account uuid,previous_cipher text default null,next_cipher text default null)
returns text language sql security invoker set search_path='' as $$select private.calendar_credentials(owner_id,target_account,previous_cipher,next_cipher);$$;
revoke all on function private.calendar_credentials(uuid,uuid,text,text),public.calendar_credentials(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function private.calendar_credentials(uuid,uuid,text,text),public.calendar_credentials(uuid,uuid,text,text) to service_role;
commit;
