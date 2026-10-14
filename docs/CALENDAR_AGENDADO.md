# Sincronização Calendar sem navegador

O código inclui fila/worker, mas a sincronização fechada só funciona depois da instalação administrativa abaixo. Não confundir código verificado com cron instalado.

1. Conferir o projeto Supabase de **testes**: `xhzunwrkntmlmrftmffk`. Migração `202610140008_calendar_jobs.sql` já aplicada em 14/10/2026; não reaplicar. Em outro projeto aplicar migrações em ordem e conferir histórico antes de db push.
2. Aplicar a migração `202610140009_calendar_job_auth.sql` uma única vez e publicar o bundle atualizado de `calendar-manage`. A prova invoker `calendar_job_access` só é executável por service_role e não lê dados nem altera a fila; valida a autoridade de chave legacy legítima que difira do runtime. Manter `Verify JWT with legacy secret` ativado. Nenhuma nova função pública sem autenticação.
3. Habilitar `pg_cron` e `pg_net` conforme documentação oficial; Vault já está instalado no projeto de testes. Manter plano gratuito.
4. No Vault salvar `allgenda_calendar_url` com a URL HTTPS deste mesmo projeto, sem barra final, e `allgenda_calendar_service_key` com a chave **legacy service_role JWT** do mesmo projeto. Transferência direta pelo responsável nos painéis; não enviar valores ao chat, criar SQL com chave literal, imprimir, copiar ao frontend ou versionar. A chave existente do runtime não precisa ser rotacionada nem substituída.
5. Executar `scripts/calendar-schedule.sql` no SQL Editor administrativo do projeto conferido. O mesmo nome de job evita duplicação. Agendamento só é criado com os dois nomes presentes no Vault. O segredo é lido dentro da função privada, não no texto do cron.
6. Conferir job ativo e respostas HTTP 200 na execução real, usando fixtures exclusivas e aplicação fechada. Falha HTTP 503 deve ser investigada; sucesso SQL do disparo só confirma envio à fila pg_net, não sincronização Google concluída.

Cada execução atende uma associação elegível; com N associações, uma rodada ocupa aproximadamente N minutos, podendo demorar mais em falhas ou lotes longos. Lease impede sobreposição com sincronização manual. Pausa/revogação bloqueiam processamento; ambiente removido com vínculos pendentes continua elegível somente para propagar exclusões já confirmadas. Consentimento Google expirado exige reconectar a conta.

Para parar o agendamento sem apagar dados:

```sql
select cron.unschedule('allgenda-calendar-sync');
```

Não retirar JWT nem expor Vault/private na Data API para resolver falhas. O agendamento usa a mesma identidade/credenciais de servidor existentes; nenhum usuário pode disparar processamento de terceiros com seu JWT.

Referências: [Supabase — agendar Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions), [Cron](https://supabase.com/docs/guides/cron), [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net).
