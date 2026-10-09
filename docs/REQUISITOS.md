# Requisitos e critérios de aceite

Fontes: instruções permanentes, solicitação da primeira entrega, esclarecimento de critérios mínimos e `referencias/design-handoff-0.1.txt`. Aprovação funcional não implica integração verificada. Questões pendentes estão em `DECISOES.md`.

## 1. Login e acesso — primeira entrega

Campos: nenhum cadastro manual; conta Google com e-mail verificado pelo provedor. Lista administrativa contém e-mail obrigatório, único e normalizado e posição obrigatória entre 1 e 5. Até cinco usuários no total. Lista vazia nega acesso a todos; nenhuma lista ou e-mail real é embutido na aplicação.

Ações: entrar com Google, sair, tentar novamente após falha. Estados: configuração indisponível, sessão em verificação, desconectado, erro de autenticação, acesso negado, autorizado. Mostrar mensagem útil sem tokens, dados internos ou erro bruto do provedor. Retorno OAuth deve ficar na URL autorizada do ambiente; SDK usa PKCE. Não pedir permissões de Calendar no login.

Falhas: erro de rede ou RPC não libera acesso; cancelamento/erro OAuth mantém tela de entrada. A autorização é do banco, independentemente da tela. Revogação bloqueia a próxima operação; dados ficam preservados até decisão sobre descarte. Nenhum usuário pode consultar a lista de convidados pela API.

Critérios verificáveis:
- [ ] Conta Google convidada entra e obtém acesso no projeto de testes.
- [ ] Conta não convidada não é cadastrada quando o hook está ativo; não consegue ler/escrever dados mesmo sem o hook.
- [ ] Anônimo não acessa ambientes nem RPCs privadas; cliente não altera a lista.
- [ ] A sexta posição e e-mail duplicado são rejeitados no banco.
- [ ] E-mail não confirmado ou identidade sem Google não libera acesso.
- [ ] Remover convite bloqueia operações de uma sessão já emitida.
- [ ] Sair remove conteúdo da sessão da tela; resposta atrasada de outro usuário não repõe conteúdo.
- [ ] Falhas de rede, migração ausente e OAuth cancelado exibem erro e possibilidade de nova tentativa sem liberar acesso.

## 2. Ambientes pessoais — primeira entrega

Campos: ID e proprietário gerados/derivados no banco; nome obrigatório, não vazio após remover espaços externos; palavras âncora obrigatórias, no mínimo três distintas após normalização de caixa e espaços externos; datas de criação/atualização geradas no banco em UTC.

Interpretação técnica para revisão: cada âncora é uma palavra sem espaços, com letras Unicode e hífen interno opcional; entrada separada por vírgulas; nenhuma associação automática de mensagens nesta entrega. Nome e âncoras aceitam acentos. Não foram aprovados unicidade de nome, cores de ambiente, limite máximo de âncoras, ordenação manual ou compartilhamento.

Ações: listar, criar, editar, cancelar edição, solicitar exclusão, confirmar ou cancelar exclusão, repetir carregamento após falha. Estados: carregando, vazio, conteúdo, formulário inválido, salvando, falha e confirmação de exclusão. Manter valores do formulário em falha; não exibir sucesso sem confirmação do banco. Evitar envio duplicado enquanto operação está em curso.

Exclusão: mostrar nome e itens afetados e exigir confirmação explícita. Não há tarefas/compromissos implementados nesta entrega, portanto não há itens associados. Antes da etapa 2, preparar consulta de impacto real e definir tratamento dos itens; não manter contagem fixa quando existirem associações. Exclusão é definitiva após confirmação; cancelar não altera dados.

Critérios verificáveis:
- [ ] Convidado cria, lista, edita e exclui apenas os próprios ambientes.
- [ ] Nome em branco e menos de três âncoras são rejeitados na interface e no banco.
- [ ] Âncoras repetidas por diferença de caixa não contam como três; null, espaços e palavras inválidas são rejeitados no banco.
- [ ] Criação não aceita proprietário de outro usuário; cliente não pode mudar proprietário na edição.
- [ ] Consulta, edição ou exclusão por UUID de outro usuário não revela nem altera registros.
- [ ] Ambiente criado permanece após recarregar e após nova sessão real de login.
- [ ] Exclusão mostra impacto, cancelar preserva ambiente e confirmar remove apenas o registro escolhido.
- [ ] Falha ou revogação durante mutação não apresenta sucesso; formulário permanece recuperável.

## 3. Base, design e ambientes de execução — primeira entrega

Campos de configuração públicos: URL Supabase, chave publishable/anon e identificador de ambiente de execução. Valores desconhecidos ficam vazios em `.env.example`, sem URLs fictícias operacionais. Segredos Google e chaves administrativas não entram em `VITE_*`.

Critérios verificáveis:
- [ ] `npm ci`, tipos, lint, testes pertinentes e build passam.
- [ ] Sem configuração, interface explica indisponibilidade e não simula login/persistência.
- [ ] Desenvolvimento, testes e produção possuem instruções distintas, sem reuso de dados ou credenciais de produção.
- [ ] Interface tem labels, foco visível, navegação por teclado, toque e layout sem rolagem horizontal em celular.
- [ ] Tokens usam o documento de design, quatro temas e nenhum logo/fontes finais inventados.
- [ ] Publicação de produção não ocorre automaticamente.

## 4. Tarefas, compromissos e recorrência — etapa 2

Aprovado: tarefas/pendências, compromissos recorrentes, duração padrão de 30 minutos quando fim ausente, detalhes por clique, hover complementar. Itens de pendência sem prazo em bloco separado; atrasadas por último. Títulos, ambiente e prazo/início/fim são citados na referência, mas obrigatoriedade, formatos, estados de conclusão e regras de edição/exclusão não foram especificados.

Pendentes: campos finais, obrigatoriedade, fusos, dia inteiro, regras de recorrência e edição de série/ocorrência, duração zero/negativa, efeitos da exclusão de ambiente e detecção/resolução de conflitos. Não implementar sem resolver essas decisões. Falhas deverão preservar entrada, informar erro e impedir mutações parciais.

Critérios a detalhar após decisões: validações nos dois lados; isolamento; persistência; datas em fusos distintos e horário de verão; ocorrência versus série; conflitos; exclusão com impacto; recuperação de falhas.

## 5. Calendário e painéis — etapa 2

Aprovado: visão semanal inicial, navegação entre semanas, acesso ao mês, Pendências e Compromissos abaixo do calendário, painéis expansíveis, ambientes na lateral. Eventos mostram título, horário, ambiente e detalhes. Pendentes: início da semana, intervalo de horários, filtros, ordenação completa, estado vazio e seleção/persistência de visualizações.

Critérios: navegação correta entre semanas/meses e fusos; painéis preservam dados; detalhes funcionam por clique/toque/teclado; sem prazo separado e atrasadas por último; falhas exibidas sem representar calendário desatualizado como sincronizado.

## 6. Google Calendar — etapa 3

Aprovado: múltiplas contas e sincronização bidirecional; login da Allgenda distinto da conexão das contas Calendar. Campos/estados previstos para especificação: conta conectada, calendário selecionado, vínculo do evento e status de sincronização, sem afirmar esquema final aprovado.

Pendentes: calendário(s) elegíveis, escopos mínimos, criação/exclusão, campos sincronizados, frequência, duplicatas, conflitos, recorrência, renovação/revogação e destino dos eventos ao desconectar. Falhas deverão indicar sincronização pendente e permitir recuperação sem duplicação. Tokens Google permanecem no servidor; nenhuma credencial em navegador/logs.

Critérios após decisões: duas contas conectadas e isoladas por usuário; ida e volta verificadas com eventos reais de teste; retries sem duplicatas; expiração/revogação e conflito tratados; nenhum dado de produção em teste.

## 7. Chat inteligente — etapa 4

Aprovado: linguagem natural, histórico, Groq para interpretação, validação pela aplicação, prévia editável e Confirmar/Editar/Rejeitar. Campos opcionais ausentes não são erros obrigatórios. Nenhuma gravação antes da confirmação.

Pendentes: ações permitidas, campos finais, regras para ambiguidade, uso das âncoras, histórico/retenção, modelo, quotas gratuitas e exemplos de aceite. Falhas deverão preservar mensagem, informar ausência/ambiguidade e impedir execução não confirmada.

Critérios após decisões: mensagem fictícia gera prévia correta; campos ausentes/ambíguos sinalizados; confirmação valida e persiste apenas no usuário atual; rejeição não grava; falhas/limites do serviço não produzem ação silenciosa.

## 8. Briefings, arrastar, celular e revisão — etapa 5

Aprovado: briefings, arrastar itens para mudar horários, alternativa via menu, adaptação móvel de calendário e painéis. Pendentes: conteúdo/frequência de briefings, interação de arraste, confirmação/undo, regras de conflito e revisão final.

Critérios após decisões: mesmo resultado por arraste/menu; erro preserva horário anterior; celular, teclado, toque, zoom, movimento reduzido e conteúdos longos verificados; briefings respeitam isolamento e regras aprovadas.

Menus de Hábitos, Metas e Insights são ilustrativos e estão fora do escopo aprovado. Esta entrega não avança para as etapas 2–5.
