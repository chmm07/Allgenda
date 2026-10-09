# Transferência — Allgenda

> Registro histórico da primeira solicitação. A solicitação posterior autoriza a primeira implementação. Consultar `STATUS.md`, `REQUISITOS.md`, `DECISOES.md` e `CONFIGURACAO.md` para o estado atual; a suspensão de implementação descrita abaixo não se aplica mais.

Registro: 8 de outubro de 2026 (America/Fortaleza).

## Objetivo e limite desta entrega

Preparar a continuidade do desenvolvimento da Allgenda, agenda web para computador e celular, inicialmente para até cinco convidados. Slogan aprovado: “Tudo converge aqui”.

A solicitação atual autoriza documentação e instruções permanentes. A implementação ainda não deve começar.

## Estado encontrado

- Raiz do repositório: `/workspace/Allgenda`.
- Branch encontrada: `work`, sem commits, arquivos rastreados ou código de aplicação.
- Não havia `AGENTS.md` nem `docs/`. As instruções recebidas foram preservadas integralmente no novo `AGENTS.md`; não houve regras existentes para conciliar nem conflitos encontrados.
- Imagens, documentos anexados, design system P3 e versão original não estavam disponíveis no chat ou nos diretórios de materiais inspecionados.
- Nenhuma integração foi implementada ou validada. A observação do ambiente não apresentou segredos, variáveis de runtime ou identidades externas configuradas; isso não comprova ausência de contas nos provedores.

## Decisões aprovadas

`../AGENTS.md` contém as regras permanentes. A arquitetura aprovada é React + TypeScript + Vite, Cloudflare Pages, Supabase (PostgreSQL, login Google e Edge Functions), Google Calendar API com múltiplas contas e sincronização bidirecional e Groq para interpretação validada pela aplicação.

Usar planos gratuitos, isolamento por usuário, RLS e identidade derivada da sessão verificada. Restringir acesso aos convidados. Separar desenvolvimento local, testes online e produção. Dados de desenvolvimento e testes devem ser fictícios. Segredos não podem estar no navegador, Git ou logs; `VITE_*` é público. Não publicar produção automaticamente.

O design aprovado é P3 e versão original. Tokens devem ser centralizados e acessibilidade, responsividade e consistência preservadas. Cores, fontes e detalhes ausentes continuam pendentes; este documento não define substitutos.

## Ordem de desenvolvimento aprovada

1. Base, login Google, persistência e ambientes.
2. Tarefas, compromissos, recorrência, calendário e painéis.
3. Integração Google Calendar.
4. Chat inteligente.
5. Briefings, arrastar itens, celular e revisão.

A ordem inclui suporte ao celular na revisão final, mas o requisito de responsividade vale desde o início. Funcionalidades citadas não possuem ainda especificação detalhada disponível.

## Como retomar

1. Ler `../AGENTS.md`, todos os documentos em `docs/` e, em particular, `STATUS.md`.
2. Conferir branch, estado do Git, arquivos existentes e eventuais instruções adicionais. O estado descrito aqui é um registro, não uma garantia do estado futuro.
3. Incorporar materiais recebidos e decisões aprovadas; atualizar `PENDENCIAS.md`. Sinalizar conflitos antes de adotar decisões incompatíveis.
4. Aguardar a orientação para iniciar a implementação e resolver as pendências necessárias à primeira entrega. Definir o escopo verificável dessa entrega com base nos requisitos aprovados.
5. Consultar documentação oficial das APIs e configurações utilizadas. Resolver escolhas técnicas reversíveis autonomamente, sem criar funcionalidades ou decisões de produto ausentes.
6. Implementar uma entrega pequena e completa; executar tipos, lint, testes pertinentes e build. Testar autorização, isolamento e demais riscos aplicáveis. Registrar resultados e bloqueios em `STATUS.md` e preparar a entrega para revisão antes de avançar.

## Materiais e decisões pendentes

Consultar `PENDENCIAS.md` para a lista organizada por etapa. Não enviar credenciais em documentos ou no chat; configurar segredos pelo mecanismo seguro do ambiente ou dos provedores quando necessário.
