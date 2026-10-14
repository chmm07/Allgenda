begin;
-- Prova de autenticação service_role pelo PostgREST, sem dados nem efeitos.
-- JWT de usuário ou anon não executa a função; não confiar em claims decodificadas.
create function public.calendar_job_access() returns boolean
language sql security invoker set search_path='' as $$select current_user='service_role';$$;
revoke all on function public.calendar_job_access() from public,anon,authenticated;
grant execute on function public.calendar_job_access() to service_role;
commit;
