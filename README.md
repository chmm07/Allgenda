# Allgenda

Tudo converge aqui.

Primeira entrega: React/TypeScript/Vite, integração preparada com Supabase, login Google, lista de até cinco usuários no total e ambientes pessoais isolados com nome e no mínimo três palavras âncora. Credenciais e OAuth precisam ser configurados para verificar a integração real.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Sem configuração, a interface informa conexão indisponível. Não há login ou banco simulados. Configurar URL/chave pública do projeto de desenvolvimento em `.env.local`, aplicar migração, habilitar Google e hook de convidados seguindo [CONFIGURACAO.md](docs/CONFIGURACAO.md).

```sh
npm run typecheck
npm run lint
npm test
npm run test:browser
npm run build
```

Ler [AGENTS.md](AGENTS.md) e `docs/` antes de alterar código. Consulte [STATUS.md](docs/STATUS.md) para resultados reais, bloqueios e próxima tarefa, [REQUISITOS.md](docs/REQUISITOS.md) para critérios e [DECISOES.md](docs/DECISOES.md) para pendências. Nenhum comando de build publica produção.
