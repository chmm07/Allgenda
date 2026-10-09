# Instruções permanentes — Allgenda

Você desenvolverá a Allgenda, uma agenda web para computador
e celular, inicialmente para até cinco convidados.

## FONTE DE VERDADE
Leia AGENTS.md e docs/ antes de trabalhar.
Use requisitos e decisões aprovados, preservando arquivos existentes.
Registre mudanças e pendências na documentação.
Não invente funcionalidades, dados ou decisões ausentes.

## ARQUITETURA
- React + TypeScript + Vite.
- Cloudflare Pages para hospedagem da interface.
- Supabase: PostgreSQL, login Google e Edge Functions.
- Google Calendar API: múltiplas contas e sincronização bidirecional.
- Groq: interpretação de mensagens, com validação pela aplicação.
- Código, migrações e documentação no mesmo repositório.
- Planos gratuitos; não contratar serviços pagos sem aprovação.

## DESIGN
Use o design system aprovado: P3 e versão original.
Slogan: “Tudo converge aqui”.
Consulte as imagens e documentos anexados.
Não invente códigos de cores ou nomes de fontes ausentes.
Centralize tokens de cores, tipografia, espaçamento e componentes.
Preserve acessibilidade, responsividade e consistência visual.

## SEGURANÇA E DADOS
Restrinja acesso à lista de até cinco convidados.
Aplique isolamento por usuário no banco e servidor.
Use RLS e derive a identidade da sessão verificada.
Nunca exponha credenciais no navegador, Git ou logs.
Variáveis VITE_* são públicas.
Use dados fictícios em desenvolvimento e testes.

## EXECUÇÃO
Inspecione o repositório antes de modificar arquivos.
Implemente entregas pequenas, completas e verificáveis.
Resolva escolhas técnicas reversíveis autonomamente.
Pergunte quando faltar decisão de produto, houver custo
ou ação destrutiva.
Não introduza dependências ou abstrações desnecessárias.
Consulte documentação oficial para APIs e configurações.

## QUALIDADE
Execute tipos, lint, testes pertinentes e build.
Teste autorização, isolamento, fusos, recorrência,
conflitos e falhas de integração conforme a entrega.
Não apresente simulação como integração funcionando.
Informe verificações bloqueadas e configurações externas ausentes.

## AMBIENTES
Separe desenvolvimento local, testes online e produção.
Não reutilize dados ou credenciais de produção nos testes.
Não publique produção automaticamente.

## SEQUÊNCIA
1. Base, login Google, persistência e ambientes.
2. Tarefas, compromissos, recorrência, calendário e painéis.
3. Integração Google Calendar.
4. Chat inteligente.
5. Briefings, arrastar itens, celular e revisão.

## CONTINUIDADE
Mantenha docs/STATUS.md com:
entregas prontas, verificações realizadas, bloqueios
e próxima tarefa.
Ao retomar, consulte esse arquivo e confirme o estado do código.
Prepare cada entrega para revisão antes de avançar.

## ESCOPO ATUAL E ESPECIFICAÇÃO
- A solicitação posterior autoriza implementar somente a primeira entrega em branch de desenvolvimento, sem publicar produção.
- Consultar docs/ARQUITETURA.md, docs/REQUISITOS.md, docs/CONFIGURACAO.md e docs/DECISOES.md, além de docs/STATUS.md.
- Limite aprovado: até cinco usuários no total, incluindo o responsável caso use o aplicativo. Login Google e dados separados.
- Ambientes pessoais exigem nome e pelo menos três palavras âncora na criação e na edição.
- Exclusão deve mostrar os itens afetados e exigir confirmação.
- Design: usar os códigos documentados em docs/referencias/design-handoff-0.1.txt. Não tratar fontes candidatas, logo ou imagens ausentes como validados.
- Documentar decisões aprovadas, interpretações técnicas reversíveis e questões pendentes separadamente.
- O destino dos dados após revogação de acesso é pendente. A primeira entrega bloqueia acesso, preservando dados até decisão explícita.
