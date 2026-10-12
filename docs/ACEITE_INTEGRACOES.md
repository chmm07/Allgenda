# Aceite das integrações antes do design final

Usar somente o projeto Supabase de testes, Pages de testes e calendários exclusivos com dados fictícios. Não selecionar calendários pessoais preexistentes. Registrar resultados reais e falhas em STATUS.md; fixtures locais não substituem estes resultados.

## Preparação Calendar

1. Entrar no Google Cloud com a conta que possui o projeto de testes e conferir nome/ID. Ativar MFA diretamente pelo usuário se exigido; preservar autenticação do projeto.
2. Conferir Calendar API habilitada, consentimento em teste e usuários autorizados. Cliente Web dedicado à conexão Calendar, separado do cliente do login. Escopos e callback exatos em CONFIGURACAO.md.
3. Configurar no servidor GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET e CALENDAR_TOKEN_ENCRYPTION_KEY, sem ler/exibir valores privados. Criação e transferência de credenciais pelo usuário nos painéis seguros. Não reaplicar migrações ou desativar JWT.
4. Criar calendário exclusivo de aceite e ambiente fictício com três âncoras. Anotar IDs somente em evidência local ignorada, sem credenciais.

## Calendar real

| Caso | Evidência exigida |
| --- | --- |
| Conectar conta | Consentimento separado do login; retorno autenticado lista metadados próprios, sem tokens. |
| Seleção | Somente calendário exclusivo escolhido; confirmar associação e propagação de exclusões. Calendários não selecionados permanecem intactos. |
| Criar Allgenda → Google | Compromisso fictício aparece no calendário exclusivo com título, fuso e instantes corretos. Repetir sync não duplica. Tarefa não vira evento. |
| Criar Google → Allgenda | Evento fictício com horário aparece no ambiente associado, uma única vez. |
| Editar nos dois sentidos | Comparar versões e timestamps reais; mudança mais recente prevalece. Falha preserva alterações pendentes. |
| Recorrência | Série semanal, ocorrência editada e cancelada; restante da série preservado. |
| Editar série | Prévia enumera exceções; cancelar preserva. Confirmar substitui exceções e remapeia instâncias sem ressuscitar itens antigos. |
| Exclusões | Excluir item fictício em cada sentido e verificar remoção do correspondente. Repetir sync mantém ausência. |
| Pausa | Pausar preserva dados; mudanças não sincronizam até retomar. |
| Desconexão | Remove credenciais locais, preserva eventos Google; interface explica revogação manual Google. |
| Falhas | Não confundir 401, 412, quota, cursor expirado ou conexão interrompida com sync concluído. Somente casos efetivamente provocados contam como aceite remoto. |

A implementação atual acompanha mudanças apenas com aplicação aberta/visível. Sincronização com aplicação fechada permanece pendente; não marcar como aceita com base no botão manual.

## Isolamento remoto

Usar sessões independentes dos dois perfis autorizados. Duas abas da mesma origem no mesmo perfil compartilham sessão; não copiar cookies/tokens entre perfis nem usar service_role para representar usuário.

1. Criar em cada sessão um ambiente e itens exclusivamente fictícios, registrando IDs.
2. Na sessão A tentar ler/alterar itens fictícios de B com IDs conhecidos; repetir B → A. Verificar bloqueio e conteúdo original preservado, incluindo propostas e associações Calendar.
3. Anonimato e conta não convidada devem ser negados. Não substituir ID alheio por UUID inexistente.
4. Revogação exige conta de teste e administração segura: conferir impacto, remover somente o convite testado, verificar acesso negado mesmo com sessão emitida e preservar os registros. Restaurar o convite para encerrar o teste. Não revogar o responsável ou descartar dados preexistentes.

## Encerramento

Guardar contagens/resultados sem tokens em .local ignorada e prova visual fora do repositório. Limpar somente fixtures desta execução, após conferir impacto e pendências de propagação; não excluir calendários reais. Manter histórico resolvido conforme política atual, sem inventar retenção automática. Atualizar STATUS.md com verificações aprovadas, limitações e bloqueios. Depois do aceite funcional, concentrar a próxima etapa no design final; produção depende desse aceite visual.
