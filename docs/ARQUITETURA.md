# Arquitetura

## Aprovado

React + TypeScript + Vite para a interface; Cloudflare Pages para hospedagem; Supabase para PostgreSQL, login Google e futuras Edge Functions. Google Calendar API e Groq pertencem a entregas posteriores. Planos gratuitos. Código, migrações e documentação juntos; ambientes de desenvolvimento, testes online e produção separados.

## Primeira entrega — escolhas técnicas reversíveis

- SPA sem roteador adicional: entrada, sessão verificada, acesso restrito e CRUD de ambientes pessoais.
- Supabase JS com OAuth Google em PKCE. O SDK trata o retorno no mesmo navegador. `getUser()` verifica a sessão no Auth; o frontend consulta uma RPC que retorna apenas se o próprio usuário está autorizado.
- Data API do Supabase verifica o JWT e PostgreSQL aplica RLS em cada operação. Identidade é `auth.uid()`, nunca um ID informado em um formulário.
- `private.invited_users`: cinco posições possíveis, e-mails únicos normalizados; sem leitura ou escrita por clientes. Administração pelo SQL Editor com acesso administrativo seguro.
- Função privada consulta a lista atual, `auth.users` com e-mail confirmado e identidade Google em `auth.identities`. Ela não confia em e-mail de metadados editáveis nem numa lista no navegador.
- Hook Before User Created bloqueia cadastro de e-mails fora da lista; depende de ativação no Auth. RLS bloqueia os dados mesmo se o hook ainda não estiver configurado. Remoção da lista bloqueia a próxima operação mesmo com JWT ainda válido.
- `public.environments`: UUID, proprietário, nome, âncoras e datas UTC. Proprietário padrão vem de `auth.uid()`. Cliente não recebe permissão para alterar proprietário, ID ou datas. Constraints validam nome e três âncoras distintas; RLS restringe todas as operações ao próprio convidado.
- Funções com privilégios elevados ficam no schema privado, com `search_path` fixo e permissões restritas. RPC pública de acesso usa os privilégios do chamador e não recebe identidade como argumento.
- Não é necessária Edge Function nesta etapa: persistência via Data API e RLS. Integrações externas futuras precisarão validar sessão no servidor e manter segredos fora da SPA.

## Ambientes: dois conceitos

Ambientes pessoais são contextos organizacionais do usuário com nome e palavras âncora. Ambientes de execução são desenvolvimento, testes e produção; usam projetos, dados, chaves, URLs e OAuth separados. Um campo `VITE_APP_ENV` identifica o build, mas não cria isolamento entre projetos: a separação precisa ser configurada nos provedores.

## Design e limites

Tokens semânticos centralizados com as quatro combinações documentadas. Fallback monoespaçado do sistema até prova das fontes; nenhuma reconstrução de logo. P3 como padrão operacional reversível, acompanhando tema do dispositivo e persistindo escolha no dispositivo. Cores de marcadores de ambientes pendentes: usar nomes e bordas existentes.

Tarefas, compromissos, recorrência, calendário, chat e briefings não entram na primeira entrega. Não criar dados de demonstração como se viessem dos serviços.

## Verificação

Tipos, lint, build e testes de validação, configuração e interface. Migração executada em PostgreSQL embutido PGlite com schemas/roles mínimos de teste para verificar constraints, grants, RLS e hook com usuários fictícios. Isso não substitui Supabase Auth, PostgREST ou OAuth real; repetir a aceitação no projeto de testes após configuração.
