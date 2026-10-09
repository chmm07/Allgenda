begin;
alter table public.environments add constraint environment_owner_unique unique(id, user_id);

create function private.valid_timezone(zone text) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select 1 from pg_catalog.pg_timezone_names where name=zone);
$$;
revoke all on function private.valid_timezone(text) from public, anon;
grant execute on function private.valid_timezone(text) to authenticated;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  environment_id uuid not null,
  title text not null check(title=btrim(title) and title ~ '[^[:space:]]'),
  due_at timestamptz check(due_at is null or isfinite(due_at)),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(environment_id,user_id) references public.environments(id,user_id) on delete cascade
);
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  environment_id uuid not null,
  title text not null check(title=btrim(title) and title ~ '[^[:space:]]'),
  starts_at timestamptz not null check(isfinite(starts_at)),
  ends_at timestamptz not null check(isfinite(ends_at) and ends_at>starts_at),
  timezone text not null check(private.valid_timezone(timezone)),
  frequency text not null default 'none' check(frequency in ('none','daily','weekly','monthly')),
  repeat_interval integer not null default 1 check(repeat_interval>0),
  repeat_until date check(repeat_until is null or isfinite(repeat_until)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,user_id),
  foreign key(environment_id,user_id) references public.environments(id,user_id) on delete cascade,
  check(repeat_until is null or (frequency<>'none' and repeat_until >= (starts_at at time zone timezone)::date))
);
create table public.appointment_exceptions (
  appointment_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  original_start timestamptz not null check(isfinite(original_start)),
  title text not null check(title=btrim(title) and title ~ '[^[:space:]]'),
  starts_at timestamptz not null check(isfinite(starts_at)),
  ends_at timestamptz not null check(isfinite(ends_at) and ends_at>starts_at),
  timezone text not null check(private.valid_timezone(timezone)),
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(appointment_id,original_start),
  foreign key(appointment_id,user_id) references public.appointments(id,user_id) on delete cascade
);
create index tasks_owner_due on public.tasks(user_id,due_at);
create index appointments_owner_start on public.appointments(user_id,starts_at);
create index exceptions_owner_start on public.appointment_exceptions(user_id,starts_at);

-- Mesmo isolamento para todas as entidades e referências de ambiente/série.
do $$ declare relation text; begin
  foreach relation in array array['tasks','appointments','appointment_exceptions'] loop
    execute format('alter table public.%I enable row level security',relation);
    execute format('revoke all on public.%I from public,anon,authenticated',relation);
    execute format('grant select,delete on public.%I to authenticated',relation);
    execute format('create policy own_select on public.%I for select to authenticated using(user_id=(select auth.uid()) and (select private.is_invited_user()))',relation);
    execute format('create policy own_insert on public.%I for insert to authenticated with check(user_id=(select auth.uid()) and (select private.is_invited_user()))',relation);
    execute format('create policy own_update on public.%I for update to authenticated using(user_id=(select auth.uid()) and (select private.is_invited_user())) with check(user_id=(select auth.uid()) and (select private.is_invited_user()))',relation);
    execute format('create policy own_delete on public.%I for delete to authenticated using(user_id=(select auth.uid()) and (select private.is_invited_user()))',relation);
    execute format('create trigger set_updated before update on public.%I for each row execute function private.set_environment_updated_at()',relation);
  end loop;
end $$;
grant insert(environment_id,title,due_at,completed),update(environment_id,title,due_at,completed) on public.tasks to authenticated;
grant insert(environment_id,title,starts_at,ends_at,timezone,frequency,repeat_interval,repeat_until),update(environment_id,title,starts_at,ends_at,timezone,frequency,repeat_interval,repeat_until) on public.appointments to authenticated;
grant insert(appointment_id,original_start,title,starts_at,ends_at,timezone,cancelled),update(title,starts_at,ends_at,timezone,cancelled) on public.appointment_exceptions to authenticated;

-- Prévia verdadeira; revisitada na exclusão atômica para impedir impacto desatualizado.
create function public.environment_impact(target_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if not exists(select 1 from public.environments where id=target_id) then raise exception 'Ambiente indisponível'; end if;
  select jsonb_build_object(
    'tasks',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title) order by id),'[]'::jsonb) from public.tasks where environment_id=target_id),
    'appointments',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title) order by id),'[]'::jsonb) from public.appointments where environment_id=target_id),
    'exceptions',(select coalesce(jsonb_agg(jsonb_build_object('appointment_id',appointment_id,'original_start',original_start,'title',title) order by appointment_id,original_start),'[]'::jsonb) from public.appointment_exceptions where appointment_id in (select id from public.appointments where environment_id=target_id))
  ) into result;
  return result;
end $$;
create function private.delete_environment_confirmed(target_id uuid, expected_impact jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not private.is_invited_user() then raise exception 'Acesso indisponível'; end if;
  perform 1 from public.environments where id=target_id and user_id=(select auth.uid()) for update;
  if not found then raise exception 'Ambiente indisponível'; end if;
  perform 1 from public.tasks where environment_id=target_id for update;
  perform 1 from public.appointments where environment_id=target_id for update;
  perform 1 from public.appointment_exceptions where appointment_id in (select id from public.appointments where environment_id=target_id) for update;
  if public.environment_impact(target_id) is distinct from expected_impact then
    raise exception 'Os itens afetados mudaram; confira o impacto novamente';
  end if;
  delete from public.environments where id=target_id and user_id=(select auth.uid());
end $$;
create function public.delete_environment_confirmed(target_id uuid, expected_impact jsonb)
returns void language sql security invoker set search_path='' as $$
  select private.delete_environment_confirmed(target_id,expected_impact);
$$;
revoke delete on public.environments from authenticated;
revoke all on function private.delete_environment_confirmed(uuid,jsonb) from public,anon;
revoke all on function public.environment_impact(uuid),public.delete_environment_confirmed(uuid,jsonb) from public,anon;
grant execute on function private.delete_environment_confirmed(uuid,jsonb),public.environment_impact(uuid),public.delete_environment_confirmed(uuid,jsonb) to authenticated;
commit;
