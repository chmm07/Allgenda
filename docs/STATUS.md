# Status — Allgenda

Atualizado em: 9 de outubro de 2026, UTC. Consultar este arquivo e confirmar branch, histórico, árvore de trabalho e configuração real ao retomar.

## Trabalho e GitHub

Construção autônoma autorizada, sem revisão intermediária. Base começou em `dev/primeira-entrega`; continuidade na **main**, permitida para commits verificados no piloto. Repositório: https://github.com/chmm07/Allgenda. Nenhuma publicação de testes/produção, criação de conta, convite real ou migração remota foi realizada.

Commits verificados e enviados por push normal (sem force):
- `22e3721`: base React/Supabase/convidados/ambientes e documentação inicial.
- `61a1184`: atualização de autonomia e continuidade.
- `920aea1`: agenda, recorrência/exceções, impacto de exclusão, chat confirmado e preparação OAuth Calendar.
- `556ea91`: workflow de verificações sem segredos e sem deploy.

Documentação desta atualização inclui requisitos detalhados, critérios objetivos, arquitetura, configuração, decisões, revisão do resultado e `PRIMEIROS_PASSOS_SERVICOS.md`, solicitado pelo usuário para criar recursos e trazer informações depois. Histórico documental e referência textual de design preservados.

## Implementado e verificado localmente

- React/TypeScript/Vite, SDK Supabase, PKCE login Google, verificação de usuário/acesso e logout; sem configuração mostra indisponibilidade.
- Lista privada de até cinco usuários no total, hook de cadastro, RLS por sessão/convidado e grants por coluna. Nenhum e-mail real em seed ou frontend.
- Ambientes pessoais com nome e pelo menos três âncoras distintas; CRUD e erros recuperáveis. Exclusão consulta impacto real e exclui itens associados após confirmação, decisão aprovada. RPC compara impacto atual, bloqueia registros e aplica cascata atomicamente; DELETE direto negado.
- Tarefas com título/ambiente, prazo opcional, conclusão/reabertura e exclusão confirmada. Painéis separam futuras, sem prazo, atrasadas e concluídas; tarefas com prazo aparecem no calendário.
- Compromissos com fuso IANA e fim padrão de 30 minutos; recorrências diária/semanal/mensal, intervalo e data final opcionais. Ocorrência e série selecionáveis, conforme aprovação; exceções/cancelamentos preservam outras ocorrências.
- Calendário semanal/mensal, navegação, filtro de ambiente e fuso; conflitos com ajuste manual, painéis expansíveis, resumo/briefing na tela. Arraste de tarefa/compromisso abre formulário antes de gravar; edição via botão para toque/teclado. Layout móvel verificado.
- Chat: função chama Groq quando configurada, valida resposta e guarda proposta; frontend mostra prévia editável/histórico. Confirmação transacional idempotente; rejeição não cria item. Serviço ausente não gera simulação.
- Calendar: funções de início/callback OAuth com estado descartável, PKCE e AES-GCM; metadados isolados, credenciais privadas inacessíveis ao cliente; revalida convite ao guardar. UI lista/conecta/desconecta localmente contas quando configurada. **Não é sincronização pronta.**
- Adaptador Calendar preparado/testado com HTTP fictício para paginação/cursor, erros 401/410/412/quotas e ETag; não conectado a um processamento de sincronização.
- Quatro temas com cores transcritas do handoff. Fontes/logo/imagens finais ausentes; métricas propostas identificadas em `DESIGN.md`, sem identidade visual inventada.

## Verificações executadas

- `npm ci --cache /tmp/allgenda-npm --no-audit --no-fund`: instalação pelo lockfile aprovada.
- `npm run typecheck`, `npm run lint`, `npm run build`: aprovados. Seções/Temporal divididos em chunks; artefato inclui somente entrada/assets da aplicação, sem fixtures.
- `npm test`: **88 testes em nove arquivos aprovados**. Configuração, autorização/sessão, interface, proposta/chat, datas/fusos/DST, recorrência, conflitos, falhas de serviços e cifragem.
- Quatro migrações executadas em **PostgreSQL PGlite** com roles/Auth mínimos e dados fictícios: convidados/cap/hook, grants/RLS, UUID alheio, referências por proprietário, validações, revogação, impacto/cascata atômica, confirmação chat idempotente e estados OAuth privados/descartáveis. Datas infinitas rejeitadas e revogação durante OAuth impede guardar credenciais.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser`: **três testes Chromium aprovados**. Temas/contraste utilizados, 375 px/desktop, zoom, foco/teclado/movimento reduzido, CRUD/diálogo de ambiente, tarefa/prazo, arraste cancelado/confirmado, duração padrão, edição de ocorrência e exclusão de série. Fixtures isoladas e explicitamente fictícias.
- Deno 2.9.6: tipos das três Edge Functions aprovados com `deno check --no-lock --node-modules-dir=manual ...`.
- `git diff --check`: aprovado. Build com chave administrativa fictícia já foi rejeitado sem imprimir valor na base inicial.
- CI GitHub Actions adicionado para os mesmos checks, sem secrets/deploy. Resultado remoto deve ser consultado em Actions; testes locais não são alegação de CI remoto aprovado.

Lint concorrente com Playwright encontrou diretório temporário removido durante busca; diretórios de resultados passaram a ser ignorados e lint repetido passou. Primeiro início do servidor de browser foi bloqueado por restrição de rede local do ambiente; repetição com permissão de rede passou. Nenhum desses ajustes alterou permissões do produto ou contornou proteções.

## Não verificado e incompleto

**O usuário informou que nenhum recurso externo foi configurado.** Supabase Auth/PostgREST/JWT/gateway reais, Google login/hook, persistência entre sessões reais, Groq real, consentimento Calendar, troca/guarda de tokens reais e Cloudflare Pages permanecem não verificados. Fixtures/mocks não representam integração funcionando.

Sincronização Google Calendar completa ainda falta: seleção/mapeamento de calendários, renovação automática de tokens, processamento bidirecional, estados/retries no produto e aceitação real. Nenhum evento Google foi criado, alterado ou excluído nesta sessão. Conta conectada não significa evento sincronizado.

Edição de série com exceções está bloqueada na interface até decisão sobre preservar/substituir alterações individuais. Série sem exceções, ocorrência individual e exclusão confirmada da série estão implementadas. Recorrências avançadas/dia inteiro, briefing enviado/agendado e retenção final não foram inventados.

## Intervenções e pendências reais

1. Criar **testes**, começando por Supabase e Google; trazer e-mails de até cinco usuários, ref/URL/chave pública Supabase, IDs públicos e callbacks Google e URL Pages. Seguir `PRIMEIROS_PASSOS_SERVICOS.md`; segredos ficam nos painéis/armazenamento seguro, nunca no chat/Git.
2. Resolver conflito simultâneo Allgenda/Calendar: escolher versão ou usar mais recente? Pergunta enviada, sem resposta registrada.
3. Resolver edição de série com exceções: preservar individuais ou substituí-las mediante confirmação? Pergunta enviada, sem resposta registrada.
4. Definir calendários elegíveis/mapeamento e propagação de exclusões externas antes do comportamento de sincronização dependente.
5. Imagens P3/original e aprovação de fontes/logo/métricas; retenção dos dados de convidado removido e histórico. Revogação atual preserva dados.

## Próxima tarefa e retomada

Confirmar repositório/main/commits, ler decisões e respostas novas. Aplicar somente decisões aprovadas; seguir nas partes independentes sem pedir revisão intermediária. Com recursos de testes disponíveis, aplicar migrações em ordem, configurar convidados/hook/OAuth/secrets, implantar funções e executar aceite real com duas contas autorizadas e uma não autorizada. Registrar resultados sanitizados e só então afirmar integração verificada. Concluir sincronização conforme política/mapeamento aprovados. Não resetar dados reais, contratar serviço ou publicar produção automaticamente.
