# Decisões e questões pendentes

## Aprovadas pelo usuário

- Arquitetura e sequência de `AGENTS.md`, planos gratuitos e produção somente por instrução explícita.
- Construção de ponta a ponta sem revisão intermediária; commits verificados podem ir à main no piloto, respeitando proteções. Envio de código não autoriza deploy de produção.
- Até cinco usuários no total, login Google, lista de e-mails e dados separados.
- Ambientes com nome e no mínimo três palavras âncora; exclusão mostra impacto e exige confirmação.
- **Ao excluir ambiente, excluir também tarefas e compromissos associados após confirmação.** Resposta explícita mais recente; decisão anterior pendente foi resolvida.
- **Ao editar/excluir compromisso recorrente, permitir escolher ocorrência ou série.** Resposta explícita mais recente.
- Design P3 e Original/Brasa, claro/escuro, com cores do anexo textual. Imagens/fontes finais continuam ausentes.
- Calendário inicialmente semanal, acesso ao mês, painéis de Pendências/Compromissos expansíveis abaixo e ambientes na lateral; sem prazo separado e atrasadas por último.
- Fim ausente de compromisso: duração de 30 minutos. Chat tem histórico, prévia editável e confirmação/rejeição antes de criar item. Briefings, arraste com alternativa por menu e adaptação móvel fazem parte do escopo.
- O usuário ainda não criou recursos externos e pediu instruções para configurá-los e trazer os dados depois: `PRIMEIROS_PASSOS_SERVICOS.md`.

## Escolhas técnicas reversíveis

- Base iniciada em `dev/primeira-entrega`; continuidade na main autorizada. npm/lockfile, SPA e SDK Supabase PKCE, sem roteador extra.
- Cinco posições fixas na lista evitam corrida na contagem. Administração via SQL Editor, hook e RLS consultando autorização atual.
- Âncoras distintas com letras Unicode/hífen interno, entrada por vírgulas. Títulos e ambiente obrigatórios nos itens; prazo opcional da tarefa e conclusão reversível. Não há nome único nem limite de quantidade de ambientes.
- Semana inicia segunda; fuso inicial do dispositivo, alterável na visualização e no compromisso. Horários em UTC com fuso IANA, fim positivo, intervalo inteiro positivo; recorrência diária/semanal/mensal, fim opcional inclusivo.
- Dia inexistente no mês é pulado, sem deslocar uma série do dia 31 para outro dia. Horário inexistente/ambíguo é rejeitado em entrada e pulado na expansão. Dia inteiro e regras RRULE arbitrárias não foram acrescentados.
- Conflitos de horário são avisados, com ajuste manual; nenhum reagendamento automático. Arraste abre formulário de confirmação, com alternativa de edição por botão; cancelamento preserva horário anterior. Tarefa sem prazo arrastada recebe horário sugerido no formulário, nunca grava automaticamente.
- Briefing na tela resume período/pendências/conflitos; sem envio ou agendamento inventados.
- Chat inicialmente interpreta criação de um único item por mensagem (até 4.000 caracteres), com última centena do histórico visível. Contextos/âncoras ajudam a proposta, mas associação não é obrigatória nem automática. Campos ausentes ficam vazios e são preenchidos na prévia; confirmação final é transacional/idempotente.
- Calendar OAuth offline + PKCE, estado descartável e tokens cifrados AES-GCM com chave só no servidor. Cliente separado do login. Desconexão local preserva eventos/autorizações Google; revogação no Google é manual por enquanto.
- Revogação de convidado preserva registros até decisão de retenção. P3 inicial/tema do dispositivo e métricas propostas; fontes candidatas não são finais. Testes locais não comprovam integrações.

## Pendentes — não substituir por decisões

| Questão | Dependência e comportamento atual |
| --- | --- |
| E-mails e responsável por administrar lista; recursos/URLs/segredos de testes | Antes de login, persistência e integrações reais; guia entregue, lista vazia. |
| Conflito de mudanças simultâneas Allgenda/Google: escolher versão ou usar a mais recente | Pergunta enviada, sem resposta; sincronização automática não implementada. ETag preparado detecta conflito. |
| Editar série com exceções: preservar edições individuais ou substituí-las com confirmação | Pergunta enviada, sem resposta; edição de série que possui exceções bloqueada na interface. Ocorrência, série sem exceções e exclusão confirmada de série estão disponíveis. |
| Calendários elegíveis/mapeamento para ambientes; propagação de exclusões nos dois lados | Antes de sincronização; nenhum evento externo é alterado/excluído nesta sessão. |
| Destino/retenção/exportação dos dados de convidado removido | Antes de descarte real; acesso revogado preserva registros e tokens inacessíveis. |
| Imagens P3/original, símbolo final, aprovação de fontes/métricas/marcadores de ambiente | Antes de afirmar fidelidade/marca final; cores textuais disponíveis, demais valores propostos. |
| Modelo Groq e limites disponíveis na conta gratuita; retenção final do histórico | Modelo configura-se no servidor, sem nome inventado; sem política de descarte automático. |
| Conteúdo/frequência de briefings enviados e recorrências avançadas/dia inteiro | Somente resumo na tela e frequências simples implementados. Sem canais/envios adicionados. |

## Conciliação

A atualização de modo de trabalho substituiu exigência de revisão entre entregas e limite à primeira entrega. Arquivos históricos foram preservados como registro. Intervenção segue necessária somente para decisão significativa de produto, custo, credenciais/configuração externa, risco para dados/permissões ou restrição de plataforma. A ausência de recursos externos não bloqueia código/testes independentes, mas impede alegar integração funcionando.
