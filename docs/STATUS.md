# Status — Allgenda

Atualizado em: 9 de outubro de 2026, America/Fortaleza. Consultar este arquivo e confirmar branch, histórico, árvore de trabalho e configuração real ao retomar.

## Trabalho e GitHub

Construção autônoma autorizada, sem revisão intermediária. Base começou em `dev/primeira-entrega`; continuidade na **main**, permitida para commits verificados no piloto. Repositório: https://github.com/chmm07/Allgenda. Nenhuma publicação de testes/produção nem operação administrativa remota foi realizada pelo agente. O usuário informou sucesso ao executar o SQL combinado com as quatro migrações e inclusão dos três convidados no painel Supabase de testes; isso ainda não é teste independente de login/autorização. O usuário criou a organização e o projeto Supabase de testes durante a configuração acompanhada; referência `xhzunwrkntmlmrftmffk` identificada na URL do painel. O usuário autorizou explicitamente deploys, edição do repositório e aprovação/merge de PRs; publicação continua dependendo da configuração e verificação do ambiente correto, sem novo pedido de aprovação.

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

**Projeto Supabase de testes criado pelo usuário, ref `xhzunwrkntmlmrftmffk`; URL/chave pública configuradas em `.env.test.local` e build de testes aprovado; SQL do banco/convidados aplicado com sucesso conforme relato do usuário, sem verificação independente; hook Before User Created confirmado Enabled em captura, com Postgres function `private.before_user_created`; OAuth e testes reais ainda pendentes. A chamada à API permanece bloqueada pela política de rede do ambiente do agente, que não inclui o domínio do projeto.** Supabase Auth/PostgREST/JWT/gateway reais, Google login/hook, persistência entre sessões reais, Groq real, consentimento Calendar, troca/guarda de tokens reais e Cloudflare Pages permanecem não verificados. Fixtures/mocks não representam integração funcionando.

Sincronização Google Calendar completa ainda falta: seleção/mapeamento de calendários, renovação automática de tokens, processamento bidirecional, estados/retries no produto e aceitação real. Nenhum evento Google foi criado, alterado ou excluído nesta sessão. Conta conectada não significa evento sincronizado.

Edição de série com exceções está bloqueada na interface até decisão sobre preservar/substituir alterações individuais. Série sem exceções, ocorrência individual e exclusão confirmada da série estão implementadas. Recorrências avançadas/dia inteiro, briefing enviado/agendado e retenção final não foram inventados.

## Intervenções e pendências reais

1. Configurar o Supabase de **testes** já criado; URL/chave pública Supabase recebidas e configuradas; SQL aplicado com sucesso informado pelo usuário e hook confirmado Enabled em captura; obter IDs públicos e callbacks Google, configurar OAuth e URL Pages. Os três e-mails iniciais já foram recebidos e a inclusão consta do SQL administrativo local ignorado pelo Git, executado com sucesso conforme relato do usuário no SQL Editor. Seguir `PRIMEIROS_PASSOS_SERVICOS.md`; segredos ficam nos painéis/armazenamento seguro, nunca no chat/Git.
2. Resolver conflito simultâneo Allgenda/Calendar: escolher versão ou usar mais recente? Pergunta enviada, sem resposta registrada.
3. Resolver edição de série com exceções: preservar individuais ou substituí-las mediante confirmação? Pergunta enviada, sem resposta registrada.
4. Definir calendários elegíveis/mapeamento e propagação de exclusões externas antes do comportamento de sincronização dependente.
5. Imagens P3/original e aprovação de fontes/logo/métricas; retenção dos dados de convidado removido e histórico. Revogação atual preserva dados.

## Próxima tarefa e retomada

Confirmar repositório/main/commits, ler decisões e respostas novas. Aplicar somente decisões aprovadas; seguir nas partes independentes sem pedir revisão intermediária. O usuário informou sucesso na aplicação de migrações/convidados pelo SQL Editor. Hook Before User Created confirmado Enabled em captura com `private.before_user_created`. Próxima ação acompanhada: entrar no Google Cloud Console, criar/identificar projeto de testes e configurar OAuth/secrets e URLs, implantar funções e executar aceite real com duas contas autorizadas e uma não autorizada. Registrar resultados sanitizados e só então afirmar integração verificada. Concluir sincronização conforme política/mapeamento aprovados. Não resetar dados reais nem contratar serviço pago sem intervenção. Deploy está autorizado após configuração e verificação, respeitando proteções e separação de ambientes.

## Configuração acompanhada — estado atual

1. **Lista recebida:** três usuários, incluindo o responsável; duas posições restantes. SQL privado em `.local/convidados.sql`, sem versionamento; inclusão remota pelo script combinado com sucesso informado pelo usuário.
2. **Supabase:** usuário fez login, criou organização e confirmou criação do projeto. Ref `xhzunwrkntmlmrftmffk`, proveniente da URL do painel; metadados locais em `.local/projeto-supabase.json`. URL/chave publishable públicas recebidas, salvas em `.env.test.local` ignorado pelo Git, com `VITE_APP_ENV=test`. `npm run build:test` aprovado. O usuário informou sucesso ao aplicar `.local/configurar-supabase-testes.sql` no SQL Editor. A captura do usuário confirma Before User Created Enabled, tipo Postgres function, schema private, função before_user_created. Ainda falta testar execução do hook e login/autorização reais. Próxima ação: configurar Google OAuth. Não reaplicar o SQL combinado; conciliar histórico do CLI antes de futuro db push, verificando o estado remoto. Não há ferramenta direta Supabase/Cloudflare ou CLI autenticado nesta sessão; login no navegador do usuário não fornece acesso administrativo ao agente.
3. **Google OAuth:** próxima etapa acompanhada; usuário deverá entrar no Google Cloud Console para criar/identificar projeto de testes. Depois configurar consentimento/cliente Web, copiar callback Supabase e configurar provedor. Nenhum projeto Google/ID/segredo/consentimento foi informado ainda.
4. **Cloudflare Pages:** aguardando configuração do projeto de testes.

Autorização mais recente inclui deploy/repositório/PRs. Alteração apenas documental e configuração administrativa local; sem mudança de aplicação. Verificar diff, ignoramento/permissões da lista e ausência dos e-mails nos arquivos versionados antes do commit.

## Verificações da configuração Supabase

- `npm run build:test`: tipos e build aprovados com URL/chave pública reais do projeto de testes; sem deploy. Arquivo local com permissões restritas e fora do Git.
- Rede do executor: política atual restrita/enforced, conforme ferramenta de status e `/etc/codex/network-policy.json`; `xhzunwrkntmlmrftmffk.supabase.co` não está permitido. Verificação HTTP do projeto não foi executada nem declarada aprovada. Liberação do domínio exige configuração de rede do ambiente pela plataforma; não contornar o proxy.
- SQL combinado administrativo preparado em `.local/configurar-supabase-testes.sql`: quatro migrações originais em uma transação, seguida da inclusão dos três convidados. Arquivo privado, ignorado pelo Git; o usuário informou sucesso na aplicação remota pelo SQL Editor em 9 de outubro de 2026. Sem verificação HTTP independente devido à rede bloqueada.
- SQL combinado executado com e-mails substituídos por fictícios em PGlite: criação/lista de três aprovadas; reaplicação recusada sem alterar lista. Não equivale a Supabase real.
- Aplicação pelo SQL Editor confirmada pelo relato do usuário; quatro versões registradas em metadados locais com essa origem. Histórico do CLI não é atualizado automaticamente e permanece pendente de conciliação. Antes de futuro `db push`, verificar o estado e conciliar o histórico pelo procedimento de `CONFIGURACAO.md`.

- Hook no painel: captura fornecida pelo usuário confirma Enabled, Postgres function, schema `private`, função `before_user_created`. Configuração visual confirmada; execução real com conta autorizada/não autorizada ainda não testada.
