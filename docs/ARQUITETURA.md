# Arquitetura

## Aprovado

React + TypeScript + Vite; Cloudflare Pages para a interface; Supabase PostgreSQL, login Google e Edge Functions; Google Calendar API com múltiplas contas e sincronização bidirecional; Groq para interpretar mensagens, sempre com validação da aplicação. Planos gratuitos, código/migrações/documentação juntos e execução separada em desenvolvimento, testes e produção. Integração preparada não significa integração verificada.

## Implementação e isolamento

SPA com seções Agenda, Ambientes, Chat e Conexões, sem roteador adicional. Seções maiores carregam sob demanda. Supabase JS usa PKCE para login; `getUser()` verifica a sessão e `has_app_access()` consulta autorização atual. Login solicita seleção de conta Google a cada tentativa; recuperação de erro encerra somente a sessão do navegador e volta à entrada, com retorno OAuth à raiz cadastrada. Data API verifica JWT; PostgreSQL aplica RLS por `auth.uid()` e condição de convidado a cada operação. ID do proprietário nunca vem do formulário.

`private.invited_users` possui cinco posições e e-mails únicos normalizados. A consulta privada exige e-mail confirmado e identidade Google reais de Auth, sem confiar em metadados editáveis. Administração via SQL Editor; clientes não leem nem alteram a lista. Hook Before User Created bloqueia cadastro não convidado quando ativado. RLS continua negando dados sem o hook. Remoção bloqueia próximas operações, inclusive com JWT emitido; não apaga dados nem desfaz informações já vistas.

As migrações devem ser aplicadas em ordem; a quinta ainda requer aplicação no projeto remoto de testes:

| Migração | Entidades e garantias |
| --- | --- |
| `202610090001_initial.sql` | Lista privada, hook, consulta de acesso, ambientes pessoais e validações das âncoras. |
| `202610090002_agenda.sql` | Tarefas, séries de compromissos e exceções; RLS e referências compostas de proprietário; impacto e exclusão confirmada de ambiente. |
| `202610090003_chat.sql` | Histórico/propostas e confirmação atômica idempotente. |
| `202610090004_calendar_accounts.sql` | Metadados de contas, credenciais cifradas privadas e estados OAuth descartáveis; RPCs administrativas exclusivas do servidor. |
| `202610100005_series_edit.sql` | Edição atômica de série com substituição confirmada de exceções; invoker/RLS, validação e recusa de prévia desatualizada. |

Tarefas pertencem a um ambiente e podem ter prazo. Compromissos armazenam instantes UTC, fuso IANA e recorrência diária/semanal/mensal. Exceções usam chave série + início original; herdam ambiente da série. Grants por coluna impedem alteração de proprietário, IDs e auditoria. References compostas impedem vincular registro ao ambiente/série de outra pessoa.

Exclusão de ambiente usa RPC: verifica proprietário/convidado, bloqueia registros afetados, compara a prévia de impacto com o estado atual e exclui ambiente/itens em uma transação. DELETE direto do ambiente está revogado para clientes. Uma prévia desatualizada exige nova confirmação. Edição de série também usa RPC invoker transacional: bloqueia série/exceções, compara a versão da série e todas as exceções com a confirmação, atualiza campos editáveis e remove exceções; falha mantém ambos. Não altera grants de colunas nem usa privilégio elevado.

`resolve_chat` bloqueia a proposta, valida ambiente próprio, cria item e marca confirmação na mesma transação. Repetir confirmação retorna o item criado; rejeição não cria itens. Funções elevadas ficam em `private`, com `search_path` fixo e permissões restritas; wrappers públicos usam privilégios do chamador.

## Datas e interface

Temporal é usado para converter horário local e expandir recorrência no período visível, preservando horário de parede após mudança de offset. Formulários rejeitam horário local inexistente/ambíguo; expansão pula dias mensais ausentes e ocorrências em horários inválidos. Estas são escolhas técnicas registradas em `DECISOES.md`, não regras finais de Calendar.

Carregamento da agenda é paginado em lotes de 200; a configuração de limite da API deve permitir esses lotes. Dados ficam na memória da seção durante a sessão; não existe persistência fictícia ou modo offline. Falhas de atualização após gravação são informadas separadamente da gravação.

## Edge Functions e serviços externos

- `chat-interpret`: CORS por origem exata, valida sessão/convidado no servidor, lê contextos via RLS e chama Groq com chave de servidor. Valida JSON/ações/ambientes/datas e salva somente proposta. O modelo não executa comandos.
- `calendar-connect`: valida sessão/convidado, cria estado aleatório com hash e validade de dez minutos, guarda verificador PKCE cifrado e inicia consentimento separado do login.
- `calendar-callback`: callback público exigido pelo OAuth, protegido por estado descartável + PKCE. Troca código no servidor, verifica identidade Google, cifra access/refresh tokens em AES-GCM e revalida acesso antes de guardar. Não devolve tokens à SPA.
- `_shared/google-calendar.ts`: adaptador HTTP preparado para paginação, cursor incremental, ETag e erros do Google. Ainda não há seleção de calendário, processamento de sincronização ou renovação automática conectados ao produto.

Chave de cifragem permanece somente nos secrets do servidor, separada do banco. Credenciais e estados privados não são expostos pela Data API. Contas de diferentes usuários têm RLS, mesmo que conectem a mesma identidade Google. Desconectar remove somente metadados/tokens locais após confirmação; não apaga eventos nem revoga permissões no Google.

## Dois conceitos de ambiente

Ambiente pessoal é contexto organizacional com nome e âncoras. Ambiente de execução é desenvolvimento/testes/produção com projetos, dados, chaves, URLs e OAuth distintos. `VITE_APP_ENV` é apenas rótulo de build, não isolamento de recursos.

## Design e verificação

Cores das quatro combinações documentadas centralizadas; fallback monoespaçado até validação das fontes, sem logo inventado. P3 como padrão operacional reversível. Métricas propostas continuam identificadas em `DESIGN.md`.

PGlite verifica SQL, roles, grants, constraints e RLS com Auth mínimo fictício; não substitui Supabase/Auth/PostgREST/JWT reais. Playwright utiliza fixtures explicitamente identificadas e fora do build. OAuth de login e Pages foram configurados pelo usuário, que relatou login autorizado funcionando. Autorização/isolamento completos e persistência remota entre sessões ainda exigem aceite real; Groq/Calendar permanecem sem integração real verificada.
