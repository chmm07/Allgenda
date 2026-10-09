# Decisões e questões pendentes

## Aprovadas pelo usuário

- Arquitetura e sequência do `AGENTS.md`; planos gratuitos; produção somente mediante instrução explícita.
- Implementação de ponta a ponta autorizada, sem revisão intermediária obrigatória. Commits verificados podem ser enviados à main no piloto, respeitando proteções.
- Até cinco usuários no total, login Google, lista de e-mails e isolamento de dados.
- Ambientes exigem nome e pelo menos três âncoras na criação e edição; exclusão mostra itens afetados e exige confirmação.
- P3 e Original/Brasa, claro/escuro, com cores documentadas no anexo; valores documentados prevalecem sobre pequenas diferenças nas imagens.
- Decisões funcionais citadas no handoff estão consolidadas em `REQUISITOS.md`.

## Escolhas técnicas reversíveis documentadas

- Branch `dev/primeira-entrega`, npm e lockfile, SPA com SDK Supabase e PKCE; sem roteador ou camada de backend adicional nesta etapa.
- Cinco posições fixas na lista privada limitam o total sem condição de corrida em contagem.
- Administração dos convidados pelo SQL Editor; bloqueio por RLS em cada operação, hook de cadastro e consulta de autorização sem argumentos de identidade.
- Âncoras distintas, sem espaços, com letras e hífen interno opcional; entrada por vírgulas. Essa interpretação não define classificação automática de mensagens.
- Ordenação inicial por data de criação; sem unicidade de nome ou limite de quantidade de ambientes aprovado.
- Retenção técnica dos dados após revogação até decisão explícita, evitando ação destrutiva não autorizada.
- P3 como padrão operacional, tema conforme dispositivo; seleção de quatro combinações persistida localmente. Não é nova aprovação de preferência visual.
- Fallback monoespaçado do sistema e especificações iniciais de tamanho/espaçamento do anexo como valores propostos; fontes candidatas não instaladas como fontes finais.
- Testes de banco em PostgreSQL PGlite com fixtures de Auth; validação real de OAuth/PostgREST permanece separada.

## Pendentes — resolver antes da funcionalidade afetada

| Questão | Momento necessário |
| --- | --- |
| E-mails autorizados e responsáveis pela administração | Antes de acesso real no projeto de testes. Nenhum e-mail inventado em seed operacional. |
| Projetos Supabase, Cloudflare, Google Cloud e URLs de cada ambiente; configuração segura OAuth | Antes de validar login/persistência reais e publicar testes. |
| Descartar, exportar ou manter dados de convidado removido; eventual restituição de acesso | Antes de implementar descarte/retorno administrado de dados. Revogação atual preserva registros. |
| Imagens da mistura original/P3, vetorização W1 e aprovação de fontes | Antes de afirmar fidelidade visual ou marca final. |
| Aprovar propostas de tipografia/espaçamento e padrão P3 | Na revisão visual; valores propostos continuam identificados. |
| Cores de marcadores de ambientes | Antes de implementar marcadores coloridos. |
| Itens associados após exclusão de ambiente, regras de tarefas/compromissos, fusos, recorrência/conflitos | Antes da etapa 2. |
| Escopos/regras de Calendar, múltiplas contas, tokens e sincronização | Antes da etapa 3. |
| Ações/modelo/retenção do chat, âncoras na interpretação e regras de ambiguidade | Antes da etapa 4. |
| Briefings, arraste, alternativas e critérios móveis finais | Antes da etapa 5. |

## Conciliação de instruções

A atualização mais recente autoriza implementar todas as etapas aprovadas sem revisão entre entregas, fazer commits e enviar progresso ao GitHub, inclusive à main para o piloto quando verificado e permitido pelas proteções. A exigência anterior de revisão e o limite à primeira entrega estão substituídos. Questões de produto relevantes, custos, credenciais/configurações externas, risco para dados/permissões e restrições de acesso continuam exigindo intervenção. Enviar código não autoriza publicação automática de produção. Arquivos históricos ficam preservados como registro, sem negar a autorização atual.
