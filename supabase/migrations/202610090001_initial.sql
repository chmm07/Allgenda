begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, supabase_auth_admin;

-- Cinco posições: limite sem corrida de contagem; nenhum convite operacional em seed.
create table private.invited_users (
  slot smallint primary key check (slot between 1 and 5),
  email text not null unique check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  created_at timestamptz not null default now()
);
alter table private.invited_users enable row level security;
revoke all on private.invited_users from public, anon, authenticated, supabase_auth_admin;

-- Consulta somente a identidade da sessão verificada pelo gateway Supabase.
create function private.is_invited_user()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join private.invited_users i on i.email = lower(u.email)
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and exists (select 1 from auth.identities identity where identity.user_id = u.id and identity.provider = 'google')
  );
$$;
revoke all on function private.is_invited_user() from public, anon, authenticated;
grant execute on function private.is_invited_user() to authenticated;

create function public.has_app_access()
returns boolean
language sql stable security invoker set search_path = ''
as $$ select private.is_invited_user(); $$;
revoke all on function public.has_app_access() from public, anon, authenticated;
grant execute on function public.has_app_access() to authenticated;

-- Hook chamado apenas por Auth. Configurar no painel remoto para ativá-lo.
create function private.before_user_created(event jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from private.invited_users where email = lower(event->'user'->>'email')) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Acesso exclusivo para convidados.'));
end;
$$;
revoke all on function private.before_user_created(jsonb) from public, anon, authenticated;
grant execute on function private.before_user_created(jsonb) to supabase_auth_admin;

create function private.valid_anchor_words(words text[])
returns boolean
language sql immutable security invoker set search_path = ''
as $$
  select coalesce(
    array_ndims(words) = 1 and cardinality(words) >= 3
    and not exists (
      select 1 from unnest(words) word
      where word is null or word <> lower(btrim(word)) or word <> normalize(word, NFC)
        or word !~ '^[[:alpha:]][[:alpha:]]*(-[[:alpha:]]+)*$'
    )
    and (select count(distinct word) from unnest(words) word) = cardinality(words),
    false
  );
$$;
revoke all on function private.valid_anchor_words(text[]) from public, anon, authenticated;
grant execute on function private.valid_anchor_words(text[]) to authenticated;

create table public.environments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (name = btrim(name) and name ~ '[^[:space:]]'),
  anchor_words text[] not null check (private.valid_anchor_words(anchor_words)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index environments_user_created on public.environments(user_id, created_at, id);
alter table public.environments enable row level security;

-- Grants por coluna: não aceitar proprietário, ID ou datas enviados pelo cliente.
revoke all on public.environments from public, anon, authenticated;
grant select, delete on public.environments to authenticated;
grant insert(name, anchor_words), update(name, anchor_words) on public.environments to authenticated;

create policy environments_select on public.environments for select to authenticated
  using (user_id = (select auth.uid()) and (select private.is_invited_user()));
create policy environments_insert on public.environments for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_invited_user()));
create policy environments_update on public.environments for update to authenticated
  using (user_id = (select auth.uid()) and (select private.is_invited_user()))
  with check (user_id = (select auth.uid()) and (select private.is_invited_user()));
create policy environments_delete on public.environments for delete to authenticated
  using (user_id = (select auth.uid()) and (select private.is_invited_user()));

create function private.set_environment_updated_at()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.set_environment_updated_at() from public, anon, authenticated;
create trigger environment_updated before update on public.environments
for each row execute function private.set_environment_updated_at();

commit;
