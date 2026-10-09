begin;
create table public.google_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  google_subject text not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique(user_id,google_subject)
);
alter table public.google_accounts enable row level security;
revoke all on public.google_accounts from public,anon,authenticated;
grant select,delete on public.google_accounts to authenticated;
create policy own_account_read on public.google_accounts for select to authenticated using(user_id=(select auth.uid()) and (select private.is_invited_user()));
create policy own_account_delete on public.google_accounts for delete to authenticated using(user_id=(select auth.uid()) and (select private.is_invited_user()));
create table private.google_credentials(account_id uuid primary key references public.google_accounts(id) on delete cascade,ciphertext text not null);
create table private.google_oauth_states(state_hash text primary key,user_id uuid not null references auth.users(id) on delete cascade,verifier_ciphertext text not null,expires_at timestamptz not null);
alter table private.google_credentials enable row level security;
alter table private.google_oauth_states enable row level security;
revoke all on private.google_credentials,private.google_oauth_states from public,anon,authenticated;

create function private.calendar_oauth_begin(owner_id uuid,state_hash text,verifier_ciphertext text)
returns void language sql security definer set search_path='' as $$
  delete from private.google_oauth_states where expires_at<now();
  insert into private.google_oauth_states values(state_hash,owner_id,verifier_ciphertext,now()+interval '10 minutes');
$$;
create function private.calendar_oauth_claim(target_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare state private.google_oauth_states;
begin
  delete from private.google_oauth_states where state_hash=target_hash returning * into state;
  if not found or state.expires_at<now() then raise exception 'Estado OAuth inválido ou expirado'; end if;
  if not exists(select 1 from auth.users u join private.invited_users i on i.email=lower(u.email) where u.id=state.user_id and u.email_confirmed_at is not null) then raise exception 'Acesso revogado'; end if;
  return jsonb_build_object('user_id',state.user_id,'verifier_ciphertext',state.verifier_ciphertext);
end $$;
create function private.calendar_account_store(owner_id uuid,subject text,account_email text,cipher text)
returns uuid language plpgsql security definer set search_path='' as $$
declare account uuid;
begin
  if not exists(select 1 from auth.users u join private.invited_users i on i.email=lower(u.email) join auth.identities identity on identity.user_id=u.id and identity.provider='google' where u.id=owner_id and u.email_confirmed_at is not null) then raise exception 'Acesso revogado'; end if;
  insert into public.google_accounts(user_id,google_subject,email) values(owner_id,subject,account_email)
  on conflict(user_id,google_subject) do update set email=excluded.email returning id into account;
  insert into private.google_credentials values(account,cipher) on conflict(account_id) do update set ciphertext=excluded.ciphertext;
  return account;
end $$;
create function public.calendar_oauth_begin(owner_id uuid,state_hash text,verifier_ciphertext text) returns void language sql security invoker set search_path='' as $$select private.calendar_oauth_begin(owner_id,state_hash,verifier_ciphertext);$$;
create function public.calendar_oauth_claim(target_hash text) returns jsonb language sql security invoker set search_path='' as $$select private.calendar_oauth_claim(target_hash);$$;
create function public.calendar_account_store(owner_id uuid,subject text,account_email text,cipher text) returns uuid language sql security invoker set search_path='' as $$select private.calendar_account_store(owner_id,subject,account_email,cipher);$$;
grant usage on schema private to service_role;
revoke all on function private.calendar_oauth_begin(uuid,text,text),private.calendar_oauth_claim(text),private.calendar_account_store(uuid,text,text,text),public.calendar_oauth_begin(uuid,text,text),public.calendar_oauth_claim(text),public.calendar_account_store(uuid,text,text,text) from public,anon,authenticated;
grant execute on function private.calendar_oauth_begin(uuid,text,text),private.calendar_oauth_claim(text),private.calendar_account_store(uuid,text,text,text),public.calendar_oauth_begin(uuid,text,text),public.calendar_oauth_claim(text),public.calendar_account_store(uuid,text,text,text) to service_role;
commit;
