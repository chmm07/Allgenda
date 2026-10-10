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
Peça intervenção somente quando faltar uma decisão de produto que altere significativamente o resultado, houver custo, faltarem credenciais/configuração que só o usuário possa realizar, houver risco para dados reais/exclusão externa/mudança de permissões, ou uma restrição de acesso/proteção impedir a operação.
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
Deploys de testes e produção autorizados pelo usuário após configuração e verificações do ambiente correto. Não é necessário pedir nova aprovação para publicação dentro do escopo aprovado.

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
Avance entre as etapas sem exigir revisão intermediária. Implemente, teste e corrija problemas antes de apresentar resultados. A revisão do usuário será sobre o resultado, sem bloquear cada alteração ou entrega.

## MODO DE TRABALHO AUTÔNOMO
- Autorizado implementar a Allgenda de ponta a ponta dentro do escopo e arquitetura aprovados.
- Planejar o trabalho e avançar pelas etapas; tomar decisões técnicas reversíveis autonomamente.
- Fazer commits organizados e enviar progresso ao GitHub. Para o piloto, commits verificados podem ir à main, respeitando proteções e trabalho remoto existente.
- Não parar para pedir permissão para continuar; atualizações de progresso não são pedidos de aprovação.
- Se uma integração estiver bloqueada, avançar nas partes independentes. Não inventar credenciais nem apresentar simulações como integrações reais.
- Autorizado editar o repositório, revisar/aprovar/mesclar pull requests e fazer deploys, incluindo produção após configuração e verificações pertinentes. Esta autorização substitui a restrição anterior de publicação, mas não permite contornar proteções ou aprovações exigidas pela plataforma. Não contratar serviços pagos nem executar ações com risco de perda de dados reais sem tratar essas condições.
- Manter docs/STATUS.md com estado real, verificações, bloqueios e próxima tarefa para continuidade entre sessões.
- Ao concluir o escopo, informar o que funciona, testes, links dos commits e pendências reais.
- Esta orientação substitui exigências anteriores de revisão entre entregas e o limite anterior à primeira entrega.

## ESCOPO ATUAL E ESPECIFICAÇÃO
- Autorizado implementar todas as etapas aprovadas, sem revisão obrigatória entre elas; main é permitida para commits verificados no piloto, respeitando proteções.
- Consultar docs/ARQUITETURA.md, docs/REQUISITOS.md, docs/CONFIGURACAO.md e docs/DECISOES.md, além de docs/STATUS.md.
- Limite aprovado: até cinco usuários no total, incluindo o responsável caso use o aplicativo. Login Google e dados separados.
- Ambientes pessoais exigem nome e pelo menos três palavras âncora na criação e na edição.
- Exclusão de ambiente mostra impacto real e exige confirmação; aprovado excluir seus itens associados.
- Compromissos recorrentes permitem escolher ocorrência ou série na edição/exclusão. Política de edição de série com exceções continua pendente em docs/DECISOES.md.
- Design: usar os códigos documentados em docs/referencias/design-handoff-0.1.txt. Não tratar fontes candidatas, logo ou imagens ausentes como validados.
- Documentar decisões aprovadas, interpretações técnicas reversíveis e questões pendentes separadamente.
- O destino dos dados após revogação de acesso é pendente. A revogação bloqueia acesso, preservando dados até decisão explícita.

## CONFIGURAÇÃO ACOMPANHADA
- O usuário quer configurar os quatro passos junto com o agente, informando o que aparece no painel. Orientar um passo de cada vez.
- Recebidos três e-mails autorizados, incluindo o responsável; preservar a lista em configuração administrativa local ignorada pelo Git, nunca no repositório público. O usuário informou sucesso ao aplicar o SQL combinado no projeto de testes; login autorizado no Pages relatado como bem-sucedido; falta completar aceite de acesso negado/isolamento/persistência e verificação independente.
- Lista administrativa preparada em `.local/convidados.sql`; diretório ignorado e arquivo com permissão restrita. Não incluir em commits, fixtures, frontend ou logs.
- Permissão para deploy/repositório não equivale a sessão autenticada nos provedores. Recursos e credenciais ainda precisam ser configurados com segurança.
