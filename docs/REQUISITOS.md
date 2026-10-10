# Requisitos e critérios de aceite

Fontes: instruções permanentes, handoff textual em `referencias/`, atualização de autonomia e respostas sobre exclusão/recorrência. Verificações executadas em `STATUS.md`; as listas abaixo são condições de aceitação, não alegações de integração real.

## 1. Login e acesso

Conta Google com e-mail verificado, lista administrativa privada de e-mails únicos normalizados e posição 1–5. Até cinco usuários no total. Sem cadastro manual ou lista embutida; vazia nega todos. Login, logout e nova tentativa; estados indisponível/verificando/desconectado/negado/autorizado/erro. Google login usa somente identidade, separado de Calendar.

Falha de rede/Auth/RPC nunca libera acesso. Autorização deriva da sessão verificada no servidor/banco; RLS consulta convite atual. Logout e mudança de usuário retiram conteúdo, descartando respostas atrasadas. Revogação bloqueia próximas operações e preserva registros até decisão de retenção.

Critérios:
- [ ] Convidado Google entra no projeto de testes; não convidado é barrado pelo hook e não acessa dados mesmo sem hook.
- [ ] Anônimo não lê/escreve dados nem lista privada; e-mail não confirmado/identidade sem Google não libera acesso.
- [ ] Sexta posição e e-mail duplicado rejeitados; revogação bloqueia sessão já emitida.
- [ ] Logout e troca de usuário descartam respostas antigas; erros/cancelamento permitem repetir sem liberar dados.
- [ ] Tela de erro permite voltar à entrada ou usar outra conta Google; saída limitada ao navegador atual, seletor de conta em cada tentativa, botões recuperáveis após falha e parâmetros de callback removidos mesmo se Auth falhar.

## 2. Ambientes pessoais

ID/proprietário/auditoria definidos no banco. Nome obrigatório não branco; pelo menos três âncoras distintas normalizadas na criação/edição. Interpretação técnica: palavras Unicode sem espaços, hífen interno opcional, separadas por vírgula. Sem unicidade de nome, cor própria, limite de ambientes ou compartilhamento inventados.

Listar/criar/editar/cancelar/excluir, com carregamento/vazio/formulário/salvando/erro. Falhas preservam entradas; mutações duplicadas são impedidas enquanto ocupadas. Exclusão mostra listas e contagens reais de tarefas, séries e exceções; confirmado, exclui itens junto ao ambiente atomicamente. Mudança no impacto exige nova confirmação.

Critérios:
- [ ] Nome vazio/âncoras insuficientes, repetidas, nulas ou inválidas rejeitados no cliente e banco.
- [ ] Usuário não envia/altera proprietário nem lê/edita/exclui UUID de outro usuário.
- [x] Separação observada na listagem: segunda conta não vê os ambientes da primeira, conforme relato do usuário no teste acompanhado de 10/10/2026. Sentido inverso e acesso direto a registros alheios ainda pendentes; este resultado não encerra o critério de isolamento acima.
- [x] Ambiente persiste na nova sessão real: usuário confirmou que os ambientes permanecem após sair/entrar, no teste acompanhado de 10/10/2026. Reprodução direta pelo agente e persistência de tarefas/compromissos ainda não verificadas.
- [ ] Prévia mostra itens afetados; cancelamento preserva tudo, confirmação exclui apenas ambiente próprio e seus itens.
- [ ] Prévia desatualizada não autoriza exclusão; acesso revogado/falha não produz sucesso fictício.

## 3. Tarefas

Título e ambiente pessoal obrigatórios; prazo opcional (`timestamptz` finito), concluída booleano inicialmente falso; ID/proprietário/auditoria do banco. Criar, editar, concluir/reabrir e excluir após confirmação. Sem prazo fica separado; futuras ordenadas por prazo, atrasadas por último; concluídas em seção expansível. Tarefas com prazo também aparecem no calendário; concluídas saem das pendências.

Critérios:
- [ ] Título branco/ambiente ausente ou estrangeiro rejeitados; prazo válido se informado.
- [ ] Criar/editar/concluir/reabrir/excluir persiste; falha mantém estado anterior e informa erro.
- [ ] Sem prazo não ganha data inventada; atrasadas são separadas, conclusão não altera outro usuário.
- [ ] Arraste muda prazo somente após salvar prévia; botão Editar oferece alternativa no teclado/celular.

## 4. Compromissos e recorrência

Título/ambiente/início/fuso obrigatórios, fim opcional na entrada (padrão aprovado 30 minutos) e obrigatório persistido depois do início. Fuso IANA válido; instantes finitos. Frequência nenhuma/diária/semanal/mensal, intervalo inteiro positivo, data final opcional inclusiva >= início local. Estas frequências e validações são escolhas técnicas iniciais, não aprovação de recorrências avançadas.

Criar, detalhes/editar e excluir com confirmação. Recorrente permite ocorrência ou série. Ocorrência grava exceção vinculada ao início original; cancelamento suprime só aquela ocorrência, sem apagar série. Ambiente de exceção herda da série. Excluir série mostra escolha explícita e remove suas exceções. Editar série substitui suas alterações individuais após mostrar as ocorrências afetadas e exigir confirmação explícita, incluindo cancelamentos. Gravação da série e descarte das exceções são atômicos; prévia desatualizada exige recarregar e confirmar novamente.

Critérios:
- [ ] Início obrigatório, fim posterior, fuso/intervalo/data final válidos nos dois lados.
- [ ] Fim omitido produz 30 minutos; horários inválidos/ambíguos no fuso solicitam correção.
- [ ] Expansão preserva horário local após DST; mês sem dia correspondente não desloca a série; período visível limita expansão.
- [ ] Editar/cancelar uma ocorrência não altera as demais; escolher série sem exceções modifica série; excluir série remove exceções.
- [ ] Exceção deslocada para dentro/fora do período não duplica nem mantém original indevidamente.
- [ ] Proprietário não controlável pelo cliente; nenhuma associação cruzada de ambiente/série.

## 5. Calendário, painéis, conflitos e briefing

Semanal inicial (segunda como escolha reversível), navegação anterior/hoje/próximo e mensal, ambientes na lateral, filtro por ambiente e fuso da visualização. Eventos exibem título, horário, ambiente/recorrência; detalhes via clique/toque/teclado. Painéis expansíveis abaixo: Pendências e Compromissos. Sobreposição é aviso, com ajuste manual; horários adjacentes não conflitam. Briefing na tela resume ocorrências do período, pendências e conflitos, sem envio agendado.

Critérios:
- [ ] Navegação entre semanas/meses e fusos mantém registros; filtros não alteram dados.
- [ ] Painéis expandem/recolhem, tarefas sem prazo e atrasadas ficam separadas.
- [ ] Sobreposição detectada corretamente; nenhuma resolução automática silenciosa.
- [ ] Arraste abre edição confirmável, cancelamento preserva original; menu/botão permite mesmo ajuste.
- [ ] Celular 375 px sem rolagem horizontal, controles rotulados, foco, toque, zoom, movimento reduzido e teclado utilizáveis.
- [ ] Falha de carregar/atualizar é visível; dados antigos não são apresentados como sincronizados.

## 6. Google Calendar

Aprovado: múltiplas contas e sincronização bidirecional, conectadas separadamente do login; selecionar quais calendários sincronizar, usar a alteração mais recente em conflitos e propagar exclusões nos dois sentidos. Implementados OAuth offline/PKCE, tokens cifrados privados, seleção de calendários editáveis com associação explícita a ambientes, renovação de tokens e processamento incremental de compromissos/ocorrências. Ativação exige confirmação da sincronização e exclusões. Testes de transporte/SQL fictícios aprovados; **integração real ainda não aceita**.

Sem callback/segredos, conexão informa indisponibilidade. Desconexão remove tokens/metadados locais, preservando eventos e autorização Google; revogação Google é manual. Um calendário por ambiente e associação imutável inicialmente; tarefas não são eventos Calendar. Botão manual e verificação a cada 60 segundos com aplicação aberta/visível. Dia inteiro/regras avançadas preservados somente no Google; conflito sem timestamp confiável e remapeamento estrutural com exceções interrompem sem sobrescrever dados.

Critérios da integração completa:
- [ ] Duas contas de teste conectam por consentimento distinto, com estado descartável/PKCE, isoladas por proprietário.
- [ ] Tokens não aparecem no navegador/Git/logs nem em tabelas acessíveis aos clientes; estado expirado/reutilizado e revogação de convite barrados.
- [ ] Calendário selecionado e mapeado; criar/editar nos dois lados sincroniza eventos reais fictícios sem duplicatas.
- [ ] Cursor expirado, 401/revogação, 412/conflito, quotas e rede têm recuperação correta e estado visível.
- [ ] Renovação/reautorização verificadas; exclusão externa exige política aprovada e confirmação aplicável.

## 7. Chat inteligente

Mensagem obrigatória (até 4.000 caracteres como limite técnico), fuso e contextos próprios. Groq interpreta uma criação de tarefa ou compromisso; histórico mantém proposta/estado. Preview editável com tipo/título/ambiente/datas/recorrência; ausência opcional não impede criar, ausência obrigatória exige preencher antes de confirmar. Não inventar data ausente, associação obrigatória ou ação fora da lista permitida.

Interpretar nunca cria item de agenda. Confirmar valida e cria atomicamente com status confirmado; repetir não duplica. Rejeitar marca histórico sem item; rejeitada não pode confirmar, confirmada não pode fingir rejeição. Falhas de Groq mantêm mensagem, sem simulação; falha na atualização do histórico distingue gravação concluída de carregamento falho. Últimas 100 mensagens exibidas; retenção/descarte final pendente.

Critérios:
- [ ] Interpretação real de mensagem fictícia gera proposta válida sem executar ação.
- [ ] Proposta incompleta pode editar campos/rejeitar; inválida/ambiente alheio/data impossível não confirma.
- [ ] Confirmação/repetição produz um só item próprio; rejeição nenhum.
- [ ] Sessão/convidado verificados na função e no banco; resposta do modelo validada antes de persistir proposta.
- [ ] Serviço ausente/erro/limite/rede preserva mensagem e informa indisponibilidade; mocks são identificados como testes.

## 8. Base, design e ambientes de execução

URL/chave pública Supabase e rótulo de ambiente são `VITE_*`; segredos somente no servidor/provedor. Desenvolvimento/testes/produção têm recursos e dados próprios, deploys autorizados após configuração e verificações do destino correto, respeitando proteções. Cores do material textual centralizadas; imagens/fontes/logo finais ausentes, métricas propostas identificadas.

Critérios:
- [ ] Instalação por lockfile, tipos, lint, testes pertinentes, build e tipos de Edge Functions aprovados.
- [ ] Sem configuração não há login/banco/modelo fictício na aplicação; fixtures ficam fora do build.
- [ ] Chave administrativa rejeitada no build; nenhum segredo em variável pública ou arquivo versionado.
- [ ] Quatro temas, labels/foco/teclado/toque/zoom/movimento reduzido; fidelidade final depende das imagens/fontes.
- [ ] `STATUS.md` registra verificações locais e externas separadamente, bloqueios e próxima tarefa.

Menus ilustrativos Hábitos, Metas e Insights ficam fora do escopo. Continuidade não exige aprovação entre entregas; pendências significativas não são convertidas em decisões.
