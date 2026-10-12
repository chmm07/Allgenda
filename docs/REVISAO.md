# Revisão do resultado e acompanhamento

A revisão do resultado não é condição para continuar entre entregas. Construção autônoma, commits e envio de progresso verificado à main estão autorizados, respeitando proteções. O usuário também autorizou deploys, edição do repositório e revisão/aprovação/merge de PRs; publicação exige configuração e verificação do ambiente correto, sem nova aprovação.

1. Ler `STATUS.md`: separar código verificado localmente, integrações não verificadas e funcionalidades ainda incompletas.
2. Conferir `DECISOES.md` e `REQUISITOS.md`, especialmente exclusão com impacto, ocorrência/série e questões ainda pendentes.
3. Revisar as sete migrações: lista privada, grants/RLS, referências por proprietário, impacto/exclusão atômica, edição confirmada de séries e chat idempotente; tokens privados, seleção, cursor/lease/journal e RPCs Calendar somente de servidor.
4. Revisar `src/hooks/useAccess.ts`, `src/lib/` e `supabase/functions/`: identidade verificada, erros seguros e nenhuma ação de modelo executada sem confirmação.
5. Executar comandos de `README.md`. Browser tests usam fixtures explícitas fora do build; não comprovam persistência remota, OAuth ou inferência Workers AI. O aceite real do chat está registrado em `STATUS.md`.
6. Seguir `PRIMEIROS_PASSOS_SERVICOS.md` para criar testes e `CONFIGURACAO.md` para executar configuração/migrações/aceitação real. Deploys já estão autorizados; manter testes/produção separados e verificar antes de publicar.

Intervenções reais atuais: acesso/configuração Google Cloud e secrets Calendar; disponibilização dos dois perfis autorizados para isolamento remoto; imagens/fontes e aceite visual final. Conflitos usam a alteração mais recente, séries substituem exceções após confirmação e exclusões propagam nos dois sentidos; essas decisões já foram aprovadas. Revogação de convidado continua preservando dados até decisão de retenção. Seguir o roteiro em `ACEITE_INTEGRACOES.md`, sem tratar preparação como integração aceita.
