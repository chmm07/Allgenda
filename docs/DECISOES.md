# Decisões e questões pendentes

## Aprovadas pelo usuário

- Arquitetura e sequência de `AGENTS.md`, planos gratuitos. A autorização mais recente inclui deploys de testes/produção após configuração e verificação do ambiente correto, edição do repositório e revisão/aprovação/merge de PRs, respeitando proteções.
- Construção de ponta a ponta sem revisão intermediária; commits verificados podem ir à main no piloto, respeitando proteções. A autorização explícita de deploy substitui a restrição anterior; não é necessária nova aprovação de publicação dentro do escopo aprovado.
- Até cinco usuários no total, login Google, lista de e-mails e dados separados. Recebidos três e-mails iniciais, incluindo o responsável, em configuração local ignorada pelo Git; quarta conta pessoal autorizada posteriormente. Inclusão dessa conta na posição 4 do Supabase e nos usuários OAuth confirmada pelo usuário; uma vaga livre. Login, persistência e separação visual da segunda conta em relação à primeira relatados pelo usuário. Acesso negado, isolamento inverso e acesso direto a registros alheios ainda pendentes. Endereços reais não são publicados.
- Ambientes com nome e no mínimo três palavras âncora; exclusão mostra impacto e exige confirmação.
- **Ao excluir ambiente, excluir também tarefas e compromissos associados após confirmação.** Resposta explícita mais recente; decisão anterior pendente foi resolvida.
- **Ao editar/excluir compromisso recorrente, permitir escolher ocorrência ou série.** Resposta explícita mais recente.
- **Decisões de 10/10/2026:** em conflito Allgenda/Google, usar a alteração mais recente; editar série substitui alterações individuais após confirmação; usuário escolhe quais calendários sincronizar; exclusões propagam nos dois sentidos. Estas políticas estão aprovadas, mas ainda precisam de implementação e aceite das integrações reais.
- Design P3 e Original/Brasa, claro/escuro, com cores do anexo textual. Imagens/fontes finais continuam ausentes.
- Calendário inicialmente semanal, acesso ao mês, painéis de Pendências/Compromissos expansíveis abaixo e ambientes na lateral; sem prazo separado e atrasadas por último.
- Fim ausente de compromisso: duração de 30 minutos. Chat tem histórico, prévia editável e confirmação/rejeição antes de criar item. Briefings, arraste com alternativa por menu e adaptação móvel fazem parte do escopo.
- Configuração acompanhada: o usuário criou o projeto Supabase de testes (ref `xhzunwrkntmlmrftmffk`). URL/chave pública recebidas e configuração local de testes concluída; aplicação do SQL confirmada pelo relato do usuário; hook confirmado Enabled em captura com `private.before_user_created`; projeto Google de testes criado e selecionado conforme confirmação do usuário, ID `allgenda-testes`; OAuth/Pages configurados e login autorizado funcionando conforme relato do usuário; autorização/isolamento completos e reprodução independente pendentes; guia em `PRIMEIROS_PASSOS_SERVICOS.md`.

## Escolhas técnicas reversíveis

- Calendar no MVP: um calendário editável por ambiente, associação explícita inicialmente imutável; pausa preserva itens. Essa restrição técnica evita duplicatas e exclusões ambíguas, não constitui escolha de produto aprovada pelo usuário. Verificação em primeiro plano a cada 60 segundos e botão manual; sem worker agendado com aplicação fechada.
- ETag e CAS protegem alterações concorrentes; timestamp Google ausente em conflito interrompe sem inventar versão. Dia inteiro e regras avançadas ficam preservados no Google. Remapeamento estrutural de séries com exceções segue pendente de validação real; preservação é preferível a propagação incorreta.

- Recuperação de login: seleção explícita de conta Google a cada tentativa, saída limitada à sessão deste navegador, retorno à raiz cadastrada e recuperação em erro/negação. Não muda a lista de convidados nem revoga consentimentos externos.

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
| Recursos/URLs/segredos de testes | Quatro contas autorizadas, incluindo o responsável; inclusão Supabase/OAuth confirmada pelo usuário; SQL local aplicado no painel com sucesso informado pelo usuário, sem verificação independente. Projeto Supabase de testes criado; URL/chave pública configuradas; hook configurado conforme captura; OAuth/Pages configurados e login autorizado relatado; login, persistência entre sessões e separação visual em uma direção relatados pelo usuário; faltam acesso negado, isolamento inverso/direto e reprodução independente, configurar demais integrações, conciliar histórico de migrações do CLI e liberar o domínio do projeto na rede do executor para verificação remota pelo agente. |
| Aceite Calendar e ampliação do mapeamento | Seleção e associação explícita implementadas; um calendário por ambiente e vínculo imutável inicialmente. Integração real, remapeamento de séries com exceções e sincronização com aplicação fechada ainda não verificados/implementados. |
| Destino/retenção/exportação dos dados de convidado removido | Antes de descarte real; acesso revogado preserva registros e tokens inacessíveis. |
| Imagens P3/original, símbolo final, aprovação de fontes/métricas/marcadores de ambiente | Antes de afirmar fidelidade/marca final; cores textuais disponíveis, demais valores propostos. |
| Modelo Groq e limites disponíveis na conta gratuita; retenção final do histórico | Modelo configura-se no servidor, sem nome inventado; sem política de descarte automático. |
| Conteúdo/frequência de briefings enviados e recorrências avançadas/dia inteiro | Somente resumo na tela e frequências simples implementados. Sem canais/envios adicionados. |

## Conciliação

A atualização de modo de trabalho substituiu exigência de revisão entre entregas e limite à primeira entrega. A autorização explícita posterior inclui deploy, edição do repositório e aprovação/merge de PRs; substitui a exigência anterior de nova instrução para publicar produção, preservando configuração, verificações, planos gratuitos e proteções. Arquivos históricos foram preservados como registro. Intervenção segue necessária somente para decisão significativa de produto, custo, credenciais/configuração externa, risco para dados/permissões ou restrição de plataforma. A ausência de recursos externos não bloqueia código/testes independentes, mas impede alegar integração funcionando.
