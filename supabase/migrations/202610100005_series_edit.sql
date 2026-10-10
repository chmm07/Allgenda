begin;
-- Invoker retains column grants and RLS. Updating the series and replacing its
-- exceptions is one transaction; a stale confirmation cannot discard edits.
create function public.replace_appointment_series(
  target_id uuid, edited_value jsonb, expected_updated_at timestamptz,
  expected_exceptions jsonb
) returns public.appointments language plpgsql security invoker set search_path='' as $$
declare
  previous public.appointments;
  draft public.appointments;
  saved public.appointments;
  actual jsonb;
  expected jsonb;
begin
  select * into previous from public.appointments where id=target_id for update;
  if not found then raise exception 'Série indisponível'; end if;
  if previous.updated_at is distinct from expected_updated_at then
    raise exception 'A série mudou; recarregue e confirme novamente';
  end if;
  if expected_exceptions is null or jsonb_typeof(expected_exceptions)<>'array' then
    raise exception 'Confirmação de ocorrências inválida';
  end if;
  perform 1 from public.appointment_exceptions where appointment_id=target_id for update;
  select coalesce(jsonb_agg(to_jsonb(e) order by e.original_start),'[]'::jsonb)
    into actual from public.appointment_exceptions e where appointment_id=target_id;
  -- Cast timestamp strings before comparing PostgREST ISO representations.
  select coalesce(jsonb_agg(to_jsonb(e) order by e.original_start),'[]'::jsonb)
    into expected from jsonb_populate_recordset(null::public.appointment_exceptions,expected_exceptions) e;
  if actual is distinct from expected then
    raise exception 'As ocorrências mudaram; recarregue e confirme novamente';
  end if;
  draft:=jsonb_populate_record(null::public.appointments,edited_value);
  update public.appointments set environment_id=draft.environment_id,title=draft.title,
    starts_at=draft.starts_at,ends_at=draft.ends_at,timezone=draft.timezone,
    frequency=draft.frequency,repeat_interval=draft.repeat_interval,repeat_until=draft.repeat_until
    where id=target_id returning * into saved;
  delete from public.appointment_exceptions where appointment_id=target_id;
  return saved;
end $$;
revoke all on function public.replace_appointment_series(uuid,jsonb,timestamptz,jsonb) from public,anon;
grant execute on function public.replace_appointment_series(uuid,jsonb,timestamptz,jsonb) to authenticated;
commit;
