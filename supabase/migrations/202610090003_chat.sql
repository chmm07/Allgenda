begin;
create table public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  message text not null check(length(message) between 1 and 4000),
  proposal jsonb not null,
  status text not null default 'draft' check(status in ('draft','confirmed','rejected')),
  created_item_id uuid,
  created_at timestamptz not null default now()
);
alter table public.chat_history enable row level security;
revoke all on public.chat_history from public,anon,authenticated;
grant select on public.chat_history to authenticated;
grant insert(message,proposal) on public.chat_history to authenticated;
create policy own_history_select on public.chat_history for select to authenticated using(user_id=(select auth.uid()) and (select private.is_invited_user()));
create policy own_history_insert on public.chat_history for insert to authenticated with check(user_id=(select auth.uid()) and (select private.is_invited_user()));
create index chat_history_owner_created on public.chat_history(user_id,created_at desc);

-- Privada e restrita: operação atômica, identidade derivada, confirmação idempotente.
create function private.resolve_chat(history_id uuid, edited_proposal jsonb, reject boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare history public.chat_history; item_id uuid; kind text;
begin
  if not private.is_invited_user() then raise exception 'Acesso indisponível'; end if;
  select * into history from public.chat_history where id=history_id and user_id=(select auth.uid()) for update;
  if not found then raise exception 'Mensagem indisponível'; end if;
  if history.status='confirmed' then
    if reject then raise exception 'Prévia já confirmada'; end if;
    return jsonb_build_object('id',history.created_item_id,'kind',history.proposal->>'kind','status','confirmed');
  end if;
  if history.status='rejected' and not reject then raise exception 'Prévia rejeitada'; end if;
  if reject then update public.chat_history set status='rejected' where id=history_id; return jsonb_build_object('status','rejected'); end if;
  kind:=edited_proposal->>'kind';
  if not exists(select 1 from public.environments where id=(edited_proposal->>'environment_id')::uuid and user_id=(select auth.uid())) then raise exception 'Ambiente indisponível'; end if;
  if kind='task' then
    insert into public.tasks(user_id,environment_id,title,due_at)
    values((select auth.uid()),(edited_proposal->>'environment_id')::uuid,edited_proposal->>'title',nullif(edited_proposal->>'due_at','')::timestamptz) returning id into item_id;
  elsif kind='appointment' then
    insert into public.appointments(user_id,environment_id,title,starts_at,ends_at,timezone,frequency,repeat_interval,repeat_until)
    values((select auth.uid()),(edited_proposal->>'environment_id')::uuid,edited_proposal->>'title',(edited_proposal->>'starts_at')::timestamptz,
      coalesce(nullif(edited_proposal->>'ends_at','')::timestamptz,(edited_proposal->>'starts_at')::timestamptz+interval '30 minutes'),
      edited_proposal->>'timezone',coalesce(edited_proposal->>'frequency','none'),coalesce((edited_proposal->>'repeat_interval')::integer,1),nullif(edited_proposal->>'repeat_until','')::date) returning id into item_id;
  else raise exception 'Ação inválida'; end if;
  update public.chat_history set status='confirmed',proposal=edited_proposal,created_item_id=item_id where id=history_id;
  return jsonb_build_object('id',item_id,'kind',kind,'status','confirmed');
end $$;
create function public.resolve_chat(history_id uuid,edited_proposal jsonb,reject boolean default false)
returns jsonb language sql security invoker set search_path='' as $$select private.resolve_chat(history_id,edited_proposal,reject);$$;
revoke all on function private.resolve_chat(uuid,jsonb,boolean),public.resolve_chat(uuid,jsonb,boolean) from public,anon;
grant execute on function private.resolve_chat(uuid,jsonb,boolean),public.resolve_chat(uuid,jsonb,boolean) to authenticated;
commit;
