# Allgenda

Tudo converge aqui.

React/TypeScript/Vite com Supabase/RLS: acesso Google para até cinco usuários, ambientes pessoais com três âncoras, tarefas, calendário semanal/mensal, compromissos recorrentes, exceções por ocorrência, conflitos, arraste confirmável e briefing na tela. Chat com Groq, prévia editável e confirmação atômica; conexão de múltiplas contas Google com PKCE e tokens cifrados preparada.

**Serviços externos ainda não configurados ou verificados. Sincronização Google Calendar completa ainda não está disponível.** Sem configuração, a aplicação informa indisponibilidade; não simula login, banco ou IA.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Começar pelo [guia para criar os serviços](docs/PRIMEIROS_PASSOS_SERVICOS.md). Execução, quatro migrações, convidados, OAuth e secrets em [CONFIGURACAO.md](docs/CONFIGURACAO.md).

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Browser tests usam fixtures fictícias isoladas, fora do build. Para Chromium existente, definir `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Tipos das funções, com Deno instalado: `deno check --no-lock --node-modules-dir=manual supabase/functions/chat-interpret/index.ts supabase/functions/calendar-connect/index.ts supabase/functions/calendar-callback/index.ts`.

Ler [AGENTS.md](AGENTS.md) e `docs/` antes de alterar; estado real e continuidade em [STATUS.md](docs/STATUS.md), critérios em [REQUISITOS.md](docs/REQUISITOS.md), decisões em [DECISOES.md](docs/DECISOES.md). Commits verificados podem ir à main, sem revisão intermediária. Nenhum comando de build publica produção.
