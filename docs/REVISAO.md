# Revisão do resultado e acompanhamento

A revisão do resultado não é condição para continuar entre entregas. Construção autônoma, commits e envio de progresso verificado à main estão autorizados, respeitando proteções. O usuário também autorizou deploys, edição do repositório e revisão/aprovação/merge de PRs; publicação exige configuração e verificação do ambiente correto, sem nova aprovação.

1. Ler `STATUS.md`: separar código verificado localmente, integrações não verificadas e funcionalidades ainda incompletas.
2. Conferir `DECISOES.md` e `REQUISITOS.md`, especialmente exclusão com impacto, ocorrência/série e questões ainda pendentes.
3. Revisar as quatro migrações: lista privada, grants/RLS, referências por proprietário, impacto/exclusão atômica e chat idempotente; tokens privados e RPCs Calendar somente de servidor.
4. Revisar `src/hooks/useAccess.ts`, `src/lib/` e `supabase/functions/`: identidade verificada, erros seguros e nenhuma ação de modelo executada sem confirmação.
5. Executar comandos de `README.md`. Browser tests usam fixtures explícitas fora do build; não comprovam persistência remota, OAuth ou Groq.
6. Seguir `PRIMEIROS_PASSOS_SERVICOS.md` para criar testes e `CONFIGURACAO.md` para executar configuração/migrações/aceitação real. Deploys já estão autorizados; manter testes/produção separados e verificar antes de publicar.

Intervenções reais: recursos ainda inexistentes (três e-mails recebidos, sem aplicação remota); política de conflito Calendar, edição de série com exceções e mapeamento/exclusões de sincronização; imagens/fontes finais. Revogação de convidado continua preservando dados até decisão de retenção. Nenhum desses pontos exige aprovação para seguir nas partes independentes.
