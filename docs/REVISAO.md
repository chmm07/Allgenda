# Revisão do resultado e acompanhamento

A revisão do resultado não é condição para continuar entre entregas. Construção autônoma, commits e envio de progresso verificado à main estão autorizados, respeitando proteções e sem publicação de produção.

1. Ler `STATUS.md`: separar código verificado localmente, integrações não verificadas e funcionalidades ainda incompletas.
2. Conferir `DECISOES.md` e `REQUISITOS.md`, especialmente exclusão com impacto, ocorrência/série e questões ainda pendentes.
3. Revisar as quatro migrações: lista privada, grants/RLS, referências por proprietário, impacto/exclusão atômica e chat idempotente; tokens privados e RPCs Calendar somente de servidor.
4. Revisar `src/hooks/useAccess.ts`, `src/lib/` e `supabase/functions/`: identidade verificada, erros seguros e nenhuma ação de modelo executada sem confirmação.
5. Executar comandos de `README.md`. Browser tests usam fixtures explícitas fora do build; não comprovam persistência remota, OAuth ou Groq.
6. Seguir `PRIMEIROS_PASSOS_SERVICOS.md` para criar testes e `CONFIGURACAO.md` para executar configuração/migrações/aceitação real. Não criar/publicar produção automaticamente.

Intervenções reais: recursos e e-mails ainda inexistentes; política de conflito Calendar, edição de série com exceções e mapeamento/exclusões de sincronização; imagens/fontes finais. Revogação de convidado continua preservando dados até decisão de retenção. Nenhum desses pontos exige aprovação para seguir nas partes independentes.
