# Materiais e decisões pendentes

> Inventário histórico. O documento textual de design foi recebido posteriormente e a implementação de ponta a ponta foi autorizada, sem revisão intermediária. Pendências atuais e etapas afetadas estão em `DECISOES.md` e `STATUS.md`.

Registro inicial: 8 de outubro de 2026 (America/Fortaleza).

As informações abaixo não estavam disponíveis na inspeção. Não representam decisões aprovadas ou solicitação para contratar serviços. A identificação de uma pendência não autoriza implementar uma solução presumida.

## Para preparar a primeira entrega

| Material ou decisão | Por que é necessário |
| --- | --- |
| Imagens e documentos do design system P3 e da versão original | Consultar o design aprovado e identificar como as duas referências se aplicam. |
| Especificação de cores, fontes, espaçamentos, componentes e estados, além dos arquivos de marca disponíveis | Criar tokens e interface fiéis, sem inventar valores ou fontes. Registrar explicitamente qualquer item ausente. |
| Requisitos e decisões anteriores, telas ou fluxos aprovados e critérios de aceite da primeira etapa | Definir o comportamento de login, acesso e persistência que pode ser implementado e revisado. |
| Lista autorizada de até cinco convidados e regra para gestão/revogação de acesso | Implementar autorização. Confirmar se o responsável pelo projeto está incluído nesse limite. Identificadores reais devem ficar em configuração de acesso restrito, não em fixtures ou documentação pública. |
| Identificação dos projetos/contas existentes de Supabase, Cloudflare e Google Cloud, responsáveis e acessos necessários | Conferir o que já existe e configurar serviços sem presumir recursos disponíveis. |
| Mapeamento dos ambientes local, testes online e produção, com URLs/domínios e configuração OAuth correspondente | Separar dados e credenciais, definir redirecionamentos de login e validar os ambientes. Não definir URLs fictícias como operacionais. |
| Segredos e configuração de login Google pelo canal seguro apropriado | Validar login e persistência reais. Não registrar valores neste repositório ou no chat. |
| Orientação para iniciar a implementação após esta entrega documental | Respeitar a instrução atual de não começar a implementação. |

## Antes das etapas seguintes

| Etapa | Informações necessárias |
| --- | --- |
| Tarefas, compromissos, recorrência, calendário e painéis | Campos e regras aprovados, estados, visualizações e critérios de aceite; comportamento esperado para fusos, eventos de dia inteiro, recorrência e conflitos. |
| Google Calendar | Regras de vínculo de múltiplas contas, seleção de calendários e escopo de sincronização; tratamento de criação, alteração, exclusão, conflitos, desconexão e falhas; configuração da API e OAuth, permissões e contas de teste. |
| Chat inteligente | Exemplos fictícios de mensagens e resultados esperados, ações permitidas e regras de validação/confirmação; conta e configuração Groq, modelo compatível com o plano gratuito e segredo no servidor. |
| Briefings, arrastar itens, celular e revisão | Conteúdo e frequência dos briefings, comportamento ao arrastar, fluxos móveis e critérios de revisão aprovados. |

Esses detalhes devem ser resolvidos antes da respectiva entrega, sem bloquear documentação ou escolhas técnicas reversíveis que não dependam deles.

## Situação das verificações

- Tipos, lint, testes e build: indisponíveis nesta etapa; não há código, manifesto de dependências ou comandos configurados.
- Login, RLS, isolamento e persistência: não implementados; sem validação contra Supabase/Google.
- Fusos, recorrência e conflitos: sem regras detalhadas ou implementação para testar.
- Google Calendar e Groq: sem implementação ou configuração validada.
- Deploy e separação efetiva dos ambientes: não realizados.
