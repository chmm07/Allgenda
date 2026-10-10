# Configuração e execução

## Planejado versus realizado

Planejado: desenvolvimento local, projeto Supabase de testes, Cloudflare Pages de testes e produção separada. Realizado nesta sessão: arquivos locais de código, quatro migrações, documentação e verificações registradas em `STATUS.md`. O usuário confirmou criação do projeto Supabase de testes; ref `xhzunwrkntmlmrftmffk` identificada na URL do painel. URL/chave pública recebidas e configuradas em `.env.test.local`, com build de testes aprovado. O usuário informou sucesso na aplicação do SQL combinado com migrações/convidados. Hook confirmado Enabled em captura fornecida pelo usuário, tipo Postgres function `private.before_user_created`. Projeto Google de testes criado e selecionado conforme confirmação do usuário, ID `allgenda-testes`; configuração inicial OAuth criada conforme captura; três usuários de teste adicionados, cliente Web criado e provedor Google ativado conforme relato do usuário. Callback copiado do painel: `https://xhzunwrkntmlmrftmffk.supabase.co/auth/v1/callback`. Site URL/retorno Supabase `https://allgenda-testes.pages.dev/` e origem Google `https://allgenda-testes.pages.dev` salvos conforme relato. Segredos ficaram nos painéis/JSON privado, sem recebimento pelo agente. O usuário informou que o login autorizado funcionou no site; isso não comprova os demais critérios de autorização/isolamento. Ainda faltam os testes completos de autorização/isolamento/hook. Verificação HTTP está bloqueada pela política de rede do executor, que não permite o domínio do projeto. Projeto Pages de testes publicado pelo usuário após configuração acompanhada; sucesso de build/publicação relatado e URL recebida: https://allgenda-testes.pages.dev/. Orientados main, Node 24, `npm run build:test`, `dist` e variáveis públicas Supabase de testes. Sem inspeção independente das configurações/build Cloudflare pelo agente. Nenhum acesso administrativo aos painéis desses provedores foi obtido pelo agente.

## Executar a interface

Node.js 22.12+ ou 24 e npm. Na raiz:

```sh
npm ci
cp .env.example .env.local
npm run dev
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Preencher `.env.local` com URL/chave pública do projeto de desenvolvimento e `VITE_APP_ENV=development`. Sem valores, a interface abre um estado de configuração indisponível. Testes de banco embutidos usam apenas dados fictícios e não precisam de credenciais. Não existe fallback que simule login ou persistência.

## Variáveis e segregação

| Variável | Onde | Tratamento |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Build da SPA | Público; URL real do projeto do ambiente. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build da SPA | Chave pública publishable ou anon legada, sempre com RLS. Nunca service_role/secret. |
| `VITE_APP_ENV` | Build da SPA | `development`, `test` ou `production`; rótulo explícito, não mecanismo de isolamento. |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | Supabase local/Auth | ID do cliente Google desse ambiente. |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | Supabase local/Auth | Segredo Google; nunca prefixar com VITE ou incluir no Git. |
| Chaves administrativas/secret/service_role e senha do banco | Administração segura | Não necessárias à SPA. Não registrar em arquivos versionados/logs. |
| `APP_URL`, `APP_ORIGINS` | Edge Functions | URL da interface e origens exatas separadas por vírgula; sem wildcard. |
| `GROQ_API_KEY`, `GROQ_MODEL` | Secrets das funções | Chave secreta e ID de modelo disponível no plano gratuito; nunca VITE. |
| `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REDIRECT_URI` | Secrets das funções | Cliente separado do login e callback real do servidor. |
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | Secrets das funções | Chave aleatória de 32 bytes em Base64, separada do banco. Não compartilhar em chat/Git/logs. |
| Tokens Google Calendar | Banco privado cifrado | Nunca retornados à SPA; refresh automático ainda não implementado. |

Usar `.env.test.local` para `npm run build:test` e `.env.production.local` para `npm run build:production`; configurar também o respectivo `VITE_APP_ENV`. Não copiar a URL/chave de produção para testes. Variáveis de produção devem ficar no provedor; compilação não publica o site. Arquivos `.env*` são ignorados, com exceção de `.env.example`.

Quando URL ou chave forem preenchidas, Vite valida a configuração antes de compilar; chave administrativa/inválida interrompe o build sem imprimir seu valor. Isso não substitui a revisão de todas as variáveis `VITE_*`, que são públicas. Configuração completamente vazia permite construir a tela de indisponibilidade para revisão.

## Supabase local e migração

Instalar Supabase CLI conforme documentação oficial e Docker. O `supabase/config.toml` usa segredos via `env(...)`. Antes de `supabase start`, configurar ID/segredo OAuth de desenvolvimento pelo ambiente do terminal seguro; não imprimir valores. Sem Google configurado, é possível executar os testes embutidos, mas o login local real permanece bloqueado.

```sh
supabase start
supabase migration up --local
```

URLs locais planejadas: frontend `http://localhost:5173`, API Supabase `http://127.0.0.1:54321`. Confirmar as URLs fornecidas pelo CLI; não declarar operacional sem iniciar. Não executar reset em projeto com dados necessários.

Em projeto remoto de TESTES, conferir o project ref e banco alvo; aplicar os quatro arquivos de `supabase/migrations/` em ordem, do sufixo `001` até `004`, pelo SQL Editor ou CLI após vincular explicitamente o projeto de testes. Nenhuma migração inclui convidados. Não reaplicar um arquivo já executado; registrar versões. Manter limite de retorno da Data API >= 200 para paginação da agenda (configuração local: 1000). Manter `private` fora dos schemas expostos na Data API. Ativar Before User Created selecionando `private.before_user_created` no Auth Hooks (ou configuração equivalente compatível com o projeto); revogações e permissões já estão na migração. Conferir seleção do hook e testar sua execução: criação da função por si só não o ativa.

### Configuração acompanhada pelo SQL Editor

Para o projeto novo de testes `xhzunwrkntmlmrftmffk`, o arquivo **privado/local** `.local/configurar-supabase-testes.sql` reúne as quatro migrações originais e a lista aprovada de convidados em uma única transação. Abrir SQL Editor, criar consulta, copiar o conteúdo completo e executar uma vez. Resultado esperado: `Base da Allgenda criada`, `convidados = 3`. O usuário informou sucesso na execução durante o passo acompanhado; a reprodução independente de autorização/integração segue pendente. Não reaplicar o arquivo. O arquivo é ignorado pelo Git e não deve ser publicado. Não reaplicar se alguma tabela já existir; trazer o erro e confirmar o estado antes de prosseguir, sem apagar tabelas.

A execução no SQL Editor não registra automaticamente o histórico do Supabase CLI. Após confirmar que **todas** as migrações foram aplicadas e antes de qualquer `db push`, vincular o projeto correto de testes com CLI autenticado, conferir `supabase migration list` e conciliar o histórico existente. Para o estado manual confirmado, registrar versões já aplicadas pelo comando oficial:

```sh
supabase migration repair --status applied 202610090001 202610090002 202610090003 202610090004
supabase migration list
supabase db push --dry-run
```

Não marcar uma versão aplicada para esconder falha, nem executar repair contra produção ou outro projeto. Até essa conciliação, não reaplicar migrações pelo CLI. Migrações novas futuras continuam versionadas normalmente.

Depois da migração, gerar tipos com `supabase gen types typescript --local` (ou `--project-id` do projeto correto), conferir diferenças e atualizar `src/lib/database.types.ts`. Os tipos versionados cobrem as quatro migrações; conferir os gerados no Supabase real antes de substituir a interface usada pela aplicação.

## Convidados — inclusão, remoção e revogação

A lista inicia vazia: todos ficam bloqueados. Usar SQL Editor administrativo do ambiente correto. Exemplos abaixo são parâmetros textuais, não e-mails reais nem seed de testes:

```sql
-- Substituir o e-mail e escolher uma posição livre de 1 a 5.
insert into private.invited_users (slot, email)
values (1, lower(trim('<EMAIL_AUTORIZADO>')));

-- Revogar uma posição. Revisar a pessoa afetada antes de executar.
delete from private.invited_users where slot = 1;
```

Não fazer upsert silencioso sobre uma posição ocupada. Reutilizar posição somente após remoção intencional. Inclusão autoriza cadastro/login; remoção bloqueia novas operações RLS imediatamente após commit, inclusive de sessões existentes. Não apaga ambientes nem registros Auth, nem retira informações já vistas pelo usuário. Para encerrar também sessões de Auth, usar procedimento administrativo de revogação do Supabase no servidor/painel; nunca enviar chave administrativa ao navegador. O destino final dos dados continua pendente. A lista real não é versionada; fixtures de testes usam domínios `.test`. Três e-mails foram recebidos e a inclusão está em `.local/convidados.sql`, ignorado pelo Git; o usuário informou sucesso ao executar o script combinado que contém essa inclusão. Aplicar somente no projeto identificado, após as migrações; não fazer upload desse arquivo ao repositório.

## OAuth: login Google

Hook configurado conforme captura do usuário; procedimento de referência para outros ambientes: Authentication → Hooks, adicionar/ativar **Before User Created**, tipo **Postgres function**, schema `private`, função `before_user_created`, e salvar. Não expor schema private na Data API nem escolher um hook de access token por engano. A documentação oficial lista Before User Created como disponível no plano Free. RLS continua bloqueando acesso aos dados fora da lista mesmo antes da ativação do hook.

1. Confirmar projetos e URLs reais de desenvolvimento/testes/produção e obter acesso administrativo.
2. Em Google Auth Platform configurar audiência e usuários de teste, consentimento e cliente Web separado por ambiente conforme recursos existentes. Usar escopos de identidade `openid`, email e profile; nenhum escopo Calendar neste login.
3. Autorizar origens reais da SPA e o callback do Supabase desse ambiente: copiar o endereço do painel, sem montar uma URL com project ref inventado. Para Supabase local, conferir `http://127.0.0.1:54321/auth/v1/callback`.
4. No Supabase ativar somente o provedor Google; configurar client ID/secret no Auth. Desativar provedores não utilizados e métodos de senha/OTP conforme a política do projeto.
5. Configurar Site URL e Redirect URLs exatas no Supabase. A SPA usa `${window.location.origin}/` como `redirectTo`, retornando à raiz com a barra final cadastrada. Autorizar somente ambientes conhecidos, sem wildcard de produção.
6. Ativar hook, adicionar os convidados e testar autorizado, não autorizado, logout, sessão renovada e revogação. O SDK mantém/renova sessão Supabase; isso não estabelece refresh token Google Calendar.

Erro/cancelamento OAuth mostra mensagem genérica e permite voltar para o login ou usar outra conta. Cada tentativa solicita `prompt=select_account` e encerra somente a sessão deste navegador antes de redirecionar; não revoga outras sessões nem o consentimento Google. Não exibir query/fragmento contendo tokens; não enviar URLs de callback para analytics ou logs.

## Edge Functions de testes

Instalar Deno para verificar tipos; não é necessário para build da SPA. Os arquivos `.env.example` da raiz e `supabase/functions/` têm somente nomes/valores vazios. Variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas pelo runtime remoto; não colocá-las no frontend.

Com projeto novo de TESTES identificado e login seguro no CLI, executar somente contra esse ref:

```sh
supabase link --project-ref '<PROJECT_REF_TESTES>'
supabase db push --dry-run
supabase db push
cp supabase/functions/.env.example supabase/functions/.env.local
# Preencher o arquivo ignorado usando armazenamento seguro, sem imprimir segredos.
supabase secrets set --env-file supabase/functions/.env.local --project-ref '<PROJECT_REF_TESTES>'
supabase functions deploy chat-interpret --project-ref '<PROJECT_REF_TESTES>'
supabase functions deploy calendar-connect --project-ref '<PROJECT_REF_TESTES>'
supabase functions deploy calendar-callback --project-ref '<PROJECT_REF_TESTES>'
deno check --no-lock --node-modules-dir=manual supabase/functions/chat-interpret/index.ts supabase/functions/calendar-connect/index.ts supabase/functions/calendar-callback/index.ts
```

Esses comandos não foram executados contra recursos remotos nesta sessão. `link` grava alvo para comandos seguintes: conferir projeto explicitamente antes de `db push`. Para Supabase local com Docker, usar `supabase functions serve --env-file supabase/functions/.env.local`. Não executar reset remoto, comandos de produção ou migração de dados reais sem salvaguardas apropriadas.

`chat-interpret` e `calendar-connect` mantêm verificação JWT do gateway e verificam usuário/convidado dentro da função. `calendar-callback` não recebe JWT do navegador Google: é configurado como callback público, protegido por estado aleatório descartável com dez minutos de validade, PKCE e vínculo de usuário criado pelo servidor autenticado. Não alterar a configuração de autenticação para contornar erros de configuração do gateway.

## OAuth: conexão Google Calendar — preparado, ainda não sincroniza

Conexão distinta do login, associada ao usuário Allgenda verificado. Habilitar Calendar API no Google Cloud de testes e criar outro cliente Web. Configurar callback **real** da função `calendar-callback`, copiado da URL do projeto implantado; o mesmo valor exato deve estar no cliente Google e em `GOOGLE_CALENDAR_REDIRECT_URI`. Não usar callback do login Supabase para Calendar.

Escopos solicitados no código: `openid`, `email`, `https://www.googleapis.com/auth/calendar.events` e `https://www.googleapis.com/auth/calendar.calendarlist.readonly`. Listagem identifica calendários graváveis e escopo de eventos prepara a sincronização aprovada. Configurar consentimento em teste e contas de teste, incluindo todos os escopos; avaliar requisitos Google antes de sair de testes, sem assumir verificação aprovada.

Definir `APP_URL` como origem real da SPA, `APP_ORIGINS` como origens exatas permitidas (desenvolvimento/testes separados), e client ID/secret só nos secrets. Para cifragem, gerar 32 bytes aleatórios em armazenamento seguro (`openssl rand -base64 32` em terminal privado, jamais anexar resultado a logs/chat). Configurar `CALENDAR_TOKEN_ENCRYPTION_KEY` e guardar cópia segura; trocar/perder a chave torna tokens atuais ilegíveis e exige procedimento de recifragem/reautorização, ainda não implementado.

OAuth pede acesso offline com PKCE e consentimento/seletor de conta. Código troca tokens no servidor, verifica identidade e guarda tokens cifrados. Várias contas podem ser conectadas; callback volta à seção Conexões e lista metadados reais via RLS. Query de retorno não é prova de sucesso. Desconexão local confirmada remove credenciais locais e mantém eventos/autorizações Google; revogar permissões manualmente na segurança da conta Google quando necessário.

**Ainda faltam:** seleção/mapeamento de calendários, renovação automática de access tokens, fila/processamento de sincronização bidirecional, política de conflitos, propagação de exclusões, reautorização e revogação Google integrada. Adaptador HTTP tem testes de paginação, 401/410/412/quotas e ETag, mas não significa sincronização funcionando. Consentimento externo em teste pode expirar refresh tokens em sete dias para estes escopos; verificar condições no Google e testar reautorização. Não testar eventos reais de produção.

## Groq — preparado, não verificado

Criar chave no plano gratuito e configurar `GROQ_API_KEY` somente no servidor. Consultar modelos disponíveis e escolher ID que suporte JSON object para `GROQ_MODEL`; nenhum modelo é presumido disponível. Configurar limites/alertas gratuitos sem contratar cobrança.

Implantar `chat-interpret`, entrar com conta de teste convidada e interpretar mensagem fictícia. Verificar prévia editável, ausência de item antes da confirmação, edição de campos obrigatórios, confirmação idempotente e rejeição. Testar falhas/limites e indisponibilidade. Não enviar mensagens ou dados pessoais de produção na aceitação. Sem chave/modelo, função responde indisponibilidade; não existe fallback de IA simulada.

## Cloudflare Pages — testes e produção

Configuração de testes executada pelo usuário, com sucesso de publicação relatado em https://allgenda-testes.pages.dev/: comando de build `npm run build:test` para testes, diretório `dist`, versão Node compatível, variáveis públicas do Supabase de testes. Separar projeto/branch e recursos de produção. O usuário autorizou deploys; configurar a publicação do destino correto apenas após as verificações pertinentes. SPA serve entrada na raiz. Nenhuma publicação é realizada por `npm run build`.

Quando houver URLs de testes reais, ajustar OAuth e executar a aceitação do `REQUISITOS.md`. Produção exige configuração separada e verificações pertinentes; a publicação já foi autorizada explicitamente pelo usuário, sem necessidade de pedir nova aprovação; a revisão entre entregas de código não é condição para continuar. Commits verificados podem ir à main para o piloto, respeitando proteções; somente publicar no ambiente efetivamente configurado e verificado. Confirmar limites gratuitos nos provedores; não contratar serviços pagos.

## Recuperação e verificação externa

Antes de migrar ambiente com dados, preparar backup/exportação pelo processo disponível e registrar versão aplicada. Reverter interface para artefato anterior se necessário. Para banco, preferir migração corretiva compatível; não apagar tabelas, não resetar remoto nem pressupor backup pago. Revogar segredos expostos pelo painel e substituir configuração segura se houver incidente.

PGlite cobre SQL/roles/RLS com Auth mínimo de teste, não HTTP/JWT real. Após configuração, executar login real com duas contas fictícias/de teste autorizadas, CRUD entre sessões, tentativas cruzadas via Data API, hook, revogação, falhas de rede e confirmação de exclusão. Registrar data, ambiente e resultado em `STATUS.md` sem dados pessoais ou tokens.

Testes de navegador verificam entrada sem credenciais, temas, contraste, layout e teclado. O teste CRUD usa uma fixture isolada em `tests/browser/fixture.html`, com repositório em memória explicitamente identificado; ela não é incluída no build da aplicação e não comprova integração. Se Chromium já estiver instalado, definir `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` para seu caminho em vez de baixar um navegador. `test:browser` inicia seu próprio servidor Vite com configuração pública vazia; não reutiliza servidor de produção.

## Documentação oficial consultada

- [Supabase Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Before User Created](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Configuração do CLI](https://supabase.com/docs/guides/local-development/cli/config)
- [Vite: variáveis e modos](https://vite.dev/guide/env-and-mode)
- [Cloudflare Pages: frameworks](https://developers.cloudflare.com/pages/framework-guides/)
- [Supabase Functions](https://supabase.com/docs/guides/functions)
- [Groq JSON mode](https://console.groq.com/docs/structured-outputs)
- [Google OAuth Web Server](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Calendar sincronização](https://developers.google.com/workspace/calendar/api/guides/sync)
- [Google Calendar alterações concorrentes](https://developers.google.com/workspace/calendar/api/guides/version-resources)

Referências da recuperação de login: [Google OpenID Connect — prompt/select_account](https://developers.google.com/identity/openid-connect/openid-connect) e [Supabase signOut — scope local](https://supabase.com/docs/reference/javascript/auth-signout).
