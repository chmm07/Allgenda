-- Instalação administrativa separada, somente no projeto de TESTES conferido.
-- Pré-requisitos: migração 008 e calendar-manage atualizados; pg_cron,
-- pg_net e Vault habilitados. Salvar diretamente no Vault, sem colar no chat:
-- allgenda_calendar_url = URL HTTPS do projeto Supabase (sem barra final)
-- allgenda_calendar_service_key = chave service_role do MESMO projeto.
-- A chave não entra no texto do job, frontend, repositório ou resposta HTTP.
begin;
-- Não ativar um job que falharia continuamente por configuração incompleta.
do $$begin
  if (select count(distinct name) from vault.secrets where name in ('allgenda_calendar_url','allgenda_calendar_service_key'))<>2 then
    raise exception 'Salve URL e chave do projeto no Vault antes de ativar o agendamento';
  end if;
end $$;
create or replace function private.dispatch_calendar_job() returns bigint
language plpgsql security definer set search_path='' as $$
declare project_url text; service_key text; request_id bigint;
begin
  select decrypted_secret into project_url from vault.decrypted_secrets where name='allgenda_calendar_url';
  select decrypted_secret into service_key from vault.decrypted_secrets where name='allgenda_calendar_service_key';
  if project_url is null or service_key is null then raise exception 'Configuração Calendar do Vault ausente'; end if;
  if project_url!~'^https://[a-z0-9]+[.]supabase[.]co$' then raise exception 'URL de projeto inválida'; end if;
  select net.http_post(
    url:=project_url||'/functions/v1/calendar-manage',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||service_key,'apikey',service_key),
    body:='{"action":"scheduled"}'::jsonb,
    timeout_milliseconds:=100000
  ) into request_id;
  return request_id;
end $$;
revoke all on function private.dispatch_calendar_job() from public,anon,authenticated,service_role;
-- cron.schedule atualiza o mesmo job por nome, sem criar agendas duplicadas.
select cron.schedule('allgenda-calendar-sync','* * * * *','select private.dispatch_calendar_job();');
commit;
