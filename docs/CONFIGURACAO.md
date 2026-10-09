# Configuração e execução

## Planejado versus realizado

Planejado: desenvolvimento local, projeto Supabase de testes, Cloudflare Pages de testes e produção separada. Realizado nesta sessão: arquivos locais de código, migração, documentação e verificações registradas em `STATUS.md`. Nenhuma conta, URL remota, OAuth ou deploy é presumido configurado.

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
| Tokens Google Calendar e chave Groq | Futuro servidor | Não necessários nesta entrega. |

Usar `.env.test.local` para `npm run build:test` e `.env.production.local` para `npm run build:production`; configurar também o respectivo `VITE_APP_ENV`. Não copiar a URL/chave de produção para testes. Variáveis de produção devem ficar no provedor; compilação não publica o site. Arquivos `.env*` são ignorados, com exceção de `.env.example`.

Quando URL ou chave forem preenchidas, Vite valida a configuração antes de compilar; chave administrativa/inválida interrompe o build sem imprimir seu valor. Isso não substitui a revisão de todas as variáveis `VITE_*`, que são públicas. Configuração completamente vazia permite construir a tela de indisponibilidade para revisão.

## Supabase local e migração

Instalar Supabase CLI conforme documentação oficial e Docker. O `supabase/config.toml` usa segredos via `env(...)`. Antes de `supabase start`, configurar ID/segredo OAuth de desenvolvimento pelo ambiente do terminal seguro; não imprimir valores. Sem Google configurado, é possível executar os testes embutidos, mas o login local real permanece bloqueado.

```sh
supabase start
supabase migration up --local
```

URLs locais planejadas: frontend `http://localhost:5173`, API Supabase `http://127.0.0.1:54321`. Confirmar as URLs fornecidas pelo CLI; não declarar operacional sem iniciar. Não executar reset em projeto com dados necessários.

Em projeto remoto de TESTES, conferir o project ref e banco alvo; aplicar `supabase/migrations/202610090001_initial.sql` pelo SQL Editor ou CLI após vincular explicitamente o projeto de testes. A migração não inclui convidados. Manter `private` fora dos schemas expostos na Data API. Ativar Before User Created selecionando `private.before_user_created` no Auth Hooks (ou configuração equivalente compatível com o projeto); revogações e permissões já estão na migração. Conferir seleção do hook e testar sua execução: criação da função por si só não o ativa.

Depois da migração, gerar tipos com `supabase gen types typescript --local` (ou `--project-id` do projeto correto), conferir diferenças e atualizar `src/lib/database.types.ts`. Os tipos iniciais documentam somente o schema desta entrega.

## Convidados — inclusão, remoção e revogação

A lista inicia vazia: todos ficam bloqueados. Usar SQL Editor administrativo do ambiente correto. Exemplos abaixo são parâmetros textuais, não e-mails reais nem seed de testes:

```sql
-- Substituir o e-mail e escolher uma posição livre de 1 a 5.
insert into private.invited_users (slot, email)
values (1, lower(trim('<EMAIL_AUTORIZADO>')));

-- Revogar uma posição. Revisar a pessoa afetada antes de executar.
delete from private.invited_users where slot = 1;
```

Não fazer upsert silencioso sobre uma posição ocupada. Reutilizar posição somente após remoção intencional. Inclusão autoriza cadastro/login; remoção bloqueia novas operações RLS imediatamente após commit, inclusive de sessões existentes. Não apaga ambientes nem registros Auth, nem retira informações já vistas pelo usuário. Para encerrar também sessões de Auth, usar procedimento administrativo de revogação do Supabase no servidor/painel; nunca enviar chave administrativa ao navegador. O destino final dos dados continua pendente. A lista real não é versionada; fixtures de testes usam domínios `.test`.

## OAuth: login Google

1. Confirmar projetos e URLs reais de desenvolvimento/testes/produção e obter acesso administrativo.
2. Em Google Auth Platform configurar audiência e usuários de teste, consentimento e cliente Web separado por ambiente conforme recursos existentes. Usar escopos de identidade `openid`, email e profile; nenhum escopo Calendar nesta entrega.
3. Autorizar origens reais da SPA e o callback do Supabase desse ambiente: copiar o endereço do painel, sem montar uma URL com project ref inventado. Para Supabase local, conferir `http://127.0.0.1:54321/auth/v1/callback`.
4. No Supabase ativar somente o provedor Google; configurar client ID/secret no Auth. Desativar provedores não utilizados e métodos de senha/OTP conforme a política do projeto.
5. Configurar Site URL e Redirect URLs exatas no Supabase. A SPA usa `window.location.origin` como `redirectTo`, retornando à raiz. Autorizar somente ambientes conhecidos, sem wildcard de produção.
6. Ativar hook, adicionar os convidados e testar autorizado, não autorizado, logout, sessão renovada e revogação. O SDK mantém/renova sessão Supabase; isso não estabelece refresh token Google Calendar.

Erro/cancelamento OAuth deve mostrar mensagem genérica e permitir repetir login. Não exibir query/fragmento contendo tokens; não enviar URLs de callback para analytics ou logs.

## OAuth: conexão Google Calendar — planejado para etapa 3

É uma conexão distinta do login, vinculada ao usuário Allgenda já verificado; poderá incluir múltiplas contas Google. Escopos Calendar mínimos dependem das regras de calendários/eventos ainda pendentes. Consentimento sensível, verificação e URLs de callbacks reais precisam ser definidos nessa etapa.

Solicitação de acesso offline, troca de código, guarda/rotação de refresh tokens, renovação e revogação ocorrerão no servidor, com isolamento por usuário e sem expor segredos. Tokens de sessão Supabase não substituem tokens de API Google. Definir comportamento de expiração, revogação, reautorização e desconexão antes da integração. Não afirmar que renovação/sincronização está pronta nesta entrega.

## Cloudflare Pages — testes e produção

Configuração preparada, não executada: comando de build `npm run build:test` para testes, diretório `dist`, versão Node compatível, variáveis públicas do Supabase de testes. Separar projeto/branch de produção; desativar publicação automática de produção antes de conectar o repositório. SPA serve entrada na raiz. Nenhuma publicação é realizada por `npm run build`.

Quando houver URLs de testes reais, ajustar OAuth e executar a aceitação do `REQUISITOS.md`. Produção exige configuração separada e instrução explícita de publicação; a revisão entre entregas de código não é condição para continuar. Commits verificados podem ir à main para o piloto, respeitando proteções e sem acionar produção automaticamente. Confirmar limites gratuitos nos provedores; não contratar serviços pagos.

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
