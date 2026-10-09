# Status — Allgenda

Atualizado em: 8 de outubro de 2026 (data de referência do cliente, America/Fortaleza).

## Entrega preparada para revisão

Branch de desenvolvimento: `dev/primeira-entrega`. Primeira implementação autorizada pela solicitação posterior; não avançar para etapas 2–5 sem revisão. Nenhuma publicação de produção ou de testes foi realizada.

- Instruções permanentes conciliadas em `AGENTS.md`, preservando regras compatíveis. A suspensão anterior de implementação foi substituída pela autorização desta entrega.
- Pacote de especificação: `ARQUITETURA.md`, `REQUISITOS.md`, `CONFIGURACAO.md`, `DECISOES.md` e `DESIGN.md`. Critérios objetivos por entrega, campos/regras conhecidos e pendências identificados. Referência recebida preservada em `referencias/design-handoff-0.1.txt`.
- React/TypeScript/Vite, dependências com lockfile, comandos de execução e verificação e `.env.example` sem credenciais.
- Fluxo Google OAuth em PKCE, verificação de usuário, consulta de acesso e logout preparados no SDK Supabase. Tela sem configuração explica indisponibilidade, sem login/persistência fictícios.
- Migração PostgreSQL: lista privada limitada a cinco usuários no total, hook de cadastro, RLS para leitura/criação/edição/exclusão e grants por coluna que impedem proprietário/ID/datas enviados pelo cliente.
- CRUD de ambientes pessoais com nome e no mínimo três âncoras distintas, validação no cliente e no banco, confirmação de exclusão com impacto e estados de falha.
- Quatro combinações P3/Original e claro/escuro; cores transcritas do material textual. Métricas iniciais propostas documentadas; fontes/wordmark/logo final não presumidos aprovados.
- Guia de execução, segregação de ambientes, convidados, OAuth separado de Calendar, migrações e recuperação.

## Verificações realizadas e limites

- Inspeção inicial: repositório em `/workspace/Allgenda`, sem commits/código, com documentação preparada na solicitação anterior. Trabalho existente preservado; branch de desenvolvimento criada antes da implementação.
- `npm ci`: instalação por lockfile aprovada.
- `npm run build`: tipos e build aprovados. Artefato `dist` contém somente entrada e assets da aplicação; não inclui fixtures ou dados fictícios dos testes.
- `npm run lint`: aprovado.
- `npm test`: **48 testes aprovados**. Incluem validação/configuração, estados/falhas da interface, verificação de acesso e descarte de resposta atrasada após logout.
- Migração executada em **PostgreSQL PGlite**, com roles/schemas mínimos de Auth e usuários fictícios: isolamento entre usuários, tentativas por UUID, proprietário não controlável pelo cliente, anônimo/não convidado, e-mail não confirmado/sem Google, revogação com sessão existente, cap de cinco, hook e constraints em criação/edição.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser`: **2 testes aprovados** em Chromium. Cobrem quatro temas e contrastes utilizados, persistência da aparência, 375 px/desktop, zoom de 200%, foco por teclado, movimento reduzido e CRUD/diálogo nativo em fixture isolada. O teste de foco identificou e levou à correção de foco em campo ainda desabilitado após salvar/excluir.
- Build com chave administrativa fictícia foi rejeitado antes da geração do bundle, sem imprimir o valor.
- **Não verificados:** Supabase Auth/PostgREST reais, JWT no gateway, Google OAuth, hook no provedor, persistência entre sessões reais de login, deploy e separação efetiva de recursos externos. Testes com stubs/fixtures não representam integração funcionando.
- Fusos/recorrência/conflitos de compromissos, Calendar e Groq não se aplicam ao código desta entrega; requerem etapas posteriores. Datas de auditoria do banco usam `timestamptz`.

## Bloqueios externos e decisões pendentes

- E-mails autorizados: lista operacional inicia vazia. Sem ela, nenhum usuário obtém acesso.
- Projetos/URLs de desenvolvimento, testes e produção; chaves públicas corretas; cliente/segredo Google; consentimento, redirecionamentos e ativação do hook.
- Imagens original/P3, símbolo final e aprovação de fontes; métricas e padrão P3 ainda são propostas operacionais para revisão.
- Destino dos dados após remoção de convidado: atualmente revogação preserva dados. Não implementar descarte sem decisão.
- Regras de itens associados ao excluir ambiente antes da etapa 2. Atualmente não há tarefas/compromissos associados, e a confirmação informa nenhum item afetado; consulta de impacto real será necessária quando existirem associações.
- Demais decisões por funcionalidade estão em `DECISOES.md` e `REQUISITOS.md`.

## Próxima tarefa

Revisar esta primeira entrega e as decisões propostas. Receber e configurar recursos do ambiente de testes conforme `CONFIGURACAO.md`; validar login Google de convidado, negação de acesso, isolamento via Data API, hook, persistência entre sessões e revogação reais. Registrar resultados aqui antes de tratar a integração como validada. Resolver impacto de exclusão e demais regras necessárias antes da etapa 2. Não publicar produção automaticamente.

## Histórico

Primeira solicitação: criados `AGENTS.md`, `TRANSFERENCIA.md`, `PENDENCIAS.md` e status documental, sem implementação. Os dois documentos históricos foram preservados e marcados como históricos para evitar conflito com a autorização atual. O material textual de design chegou depois; imagens continuam ausentes.
