# O que criar e trazer para configurar a Allgenda

Não é preciso configurar tudo de uma vez. Primeiro faça Supabase + Google de testes; Calendar e Groq vêm depois. Permanecer nos planos gratuitos. O usuário criou o projeto Supabase de testes durante o passo acompanhado; referência `xhzunwrkntmlmrftmffk` identificada no painel. O usuário informou sucesso na aplicação do SQL do banco/convidados; hook Before User Created confirmado Enabled em captura; OAuth/Pages configurados e login autorizado funcionando conforme relato do usuário; aceite completo de acesso/isolamento/persistência pendente.

## 1. Lista de acesso

Concluído o recebimento inicial: três e-mails Google, incluindo o responsável, com duas vagas disponíveis. A inclusão está preparada em SQL administrativo local ignorado pelo Git; a lista real não é versionada no repositório público. O usuário informou sucesso na execução do SQL que inclui a lista no Supabase. Login autorizado funcionando conforme relato do usuário; falta completar os testes de autorização/isolamento reais. O usuário quer acompanhar cada passo junto com o agente.

## 2. Supabase de testes

Estado acompanhado: login realizado e projeto criado pelo usuário, ref `xhzunwrkntmlmrftmffk`. URL da API e chave publishable pública recebidas e configuradas localmente; build de testes aprovado. O usuário informou sucesso na execução do SQL administrativo no SQL Editor. Hook Before User Created confirmado Enabled, Postgres function `private.before_user_created`. Projeto Google Cloud de testes `allgenda-testes` criado e selecionado conforme confirmação do usuário. OAuth/Pages configurados e login autorizado funcionando conforme relato do usuário. Próxima ação: corrigir recuperação após erro e testar acesso negado/isolamento/persistência; execução real do hook será validada depois do login. Não reaplicar o script combinado. A verificação da API pelo agente depende de liberar o domínio do projeto na rede do ambiente. Não copiar secret/service_role ou senha. Os passos de criação abaixo são mantidos como referência de configuração.

1. Entre em [Supabase](https://supabase.com/dashboard), crie a organização/projeto de testes no plano gratuito e dê um nome que identifique testes.
2. Escolha e guarde a senha do banco em um gerenciador seguro; não a envie no chat.
3. Quando o projeto ficar disponível, copie a URL do projeto e a chave **publishable** no painel de conexão/API. Não confundir com secret/service_role.
4. Traga o nome do projeto, project ref, URL e chave publishable (pública). Confirme explicitamente que é o projeto de testes. Se preferir, coloque esses valores diretamente no ambiente seguro e informe apenas os nomes das variáveis.
5. As quatro migrações devem ser aplicadas em ordem nesse projeto; depois configure os e-mails na lista privada e o hook de convidados seguindo `CONFIGURACAO.md`. Posso orientar essas etapas depois de identificar o projeto.

Começar por testes; produção tem deploy autorizado, mas depende de recursos/configuração separados e verificação. Não reutilizar dados reais nos testes. PostgreSQL local e testes embutidos usam somente fixtures fictícias.

## 3. Google Cloud e login

Estado acompanhado: projeto de testes criado e selecionado pelo usuário, ID `allgenda-testes`, também presente na URL do painel. Configuração inicial OAuth criada conforme captura; três usuários de teste adicionados, cliente Web criado e provedor Google ativado conforme relato do usuário. Callback copiado do painel: `https://xhzunwrkntmlmrftmffk.supabase.co/auth/v1/callback`. Site URL/retorno Supabase `https://allgenda-testes.pages.dev/` e origem Google `https://allgenda-testes.pages.dev` salvos conforme relato. Segredos ficaram nos painéis/JSON privado, sem recebimento pelo agente. O usuário informou que o login autorizado funcionou no site; isso não comprova os demais critérios de autorização/isolamento.

1. Entre em [Google Cloud Console](https://console.cloud.google.com/) e crie um projeto de desenvolvimento/testes.
2. Abra Google Auth Platform, configure Branding com nome Allgenda e contatos exigidos, e Audience em teste, incluindo os e-mails dos usuários de teste.
3. Configure os escopos de identidade: `openid`, email e profile. Login Google não precisa de escopo Calendar.
4. Crie cliente OAuth do tipo **Web application**. Para desenvolvimento, origem da interface: `http://localhost:5173`. Para testes online, aguarde a URL real de Cloudflare Pages.
5. Em Supabase, Auth → Sign In / Providers → Google, copie o callback fornecido pelo projeto. Adicione esse endereço exato em **Authorized redirect URIs** do cliente Google.
6. Configure client ID e client secret no painel Google do Supabase. O secret deve ficar apenas no painel/ambiente seguro; nunca no chat, Git ou variável VITE.
7. No Supabase, configure Site URL e Redirect URLs para a origem real usada pela interface. A SPA retorna à raiz. Não usar wildcard de produção.
8. Ative o hook Before User Created da migração e teste conta autorizada e não autorizada.

Traga: project ID do Google Cloud, client ID (público), callback copiado do Supabase, origens/redirecionamentos configurados e confirmação de que o segredo foi configurado com segurança. Não traga o segredo.

## 4. Cloudflare Pages de testes

Projeto Pages de testes publicado pelo usuário após configuração acompanhada; sucesso de build/publicação relatado e URL recebida: https://allgenda-testes.pages.dev/. Orientados main, Node 24, `npm run build:test`, `dist` e variáveis públicas Supabase de testes. Sem inspeção independente das configurações/build Cloudflare pelo agente.

1. Entre em [Cloudflare](https://dash.cloudflare.com/), abra Workers & Pages e crie um projeto **Pages de testes**.
2. Conecte o repositório `chmm07/Allgenda`; use `main` apenas se o destino for esse projeto de testes. Deploy de produção já está autorizado, mas usa projeto/configuração próprios após verificações.
3. Configure Node 24, build `npm run build:test`, diretório `dist` e as três variáveis públicas do projeto Supabase de testes: `VITE_APP_ENV=test`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Não adicionar segredos Google, senha do banco ou chaves secret/service_role ao build.
5. Obtenha a URL Pages real. Adicione essa origem no cliente Google e nas URLs permitidas do Supabase.

Traga: nome do projeto Pages, URL real, branch vinculada, resultado/log sanitizado do build. Produção terá projetos/dados/OAuth separados e publicação já autorizada após configuração/verificações. Configurar automação apenas para o destino correto, respeitando as proteções do repositório.

## 5. Google Calendar — depois do login

No mesmo projeto de testes Google, habilitar [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com). A conexão das contas Calendar será diferente do login: exige consentimento próprio, escopos de eventos/calendários e callback de servidor.

Depois de obter project ref Supabase e URL real de testes, siga a seção Calendar de `CONFIGURACAO.md`: criar cliente Web separado, implantar `calendar-callback`, copiar sua URL real para o cliente e configurar ID/segredo/redirect e chave de cifragem nos secrets. O client ID é público; client secret, chave de cifragem e tokens não devem ser enviados no chat. Para testar, use calendários e eventos fictícios em contas de teste. Não conceda acesso a calendários de produção. Refresh tokens Google permanecerão no servidor; não envie tokens no chat.

Ainda precisam ser definidos os calendários elegíveis, política de conflitos e exclusões bidirecionais. Falta de decisão/configuração nessa integração não impede continuar a agenda local ao produto.

## 6. Groq — depois

Entre em [Groq Console](https://console.groq.com/), mantenha o plano gratuito e crie uma chave de API. Configure-a como segredo de servidor `GROQ_API_KEY` no Supabase; nunca usar `VITE_`. Traga somente confirmação de configuração e modelos/limites disponíveis na conta; não envie a chave. Configure também `GROQ_MODEL` com um ID disponível que suporte JSON object e `APP_ORIGINS` com a origem exata da interface. Implante `chat-interpret` seguindo `CONFIGURACAO.md`. Não contratar serviço pago.

## Lista do que trazer na próxima configuração

- Lista inicial recebida; só trazer novos e-mails se quiser ocupar as duas vagas restantes.
- Nome/ref/URL do Supabase de testes e chave publishable pública, ou confirmação de variáveis configuradas com segurança.
- Project ID Google, client ID e callback real; confirmação de consentimento, usuários de teste e client secret configurado no Supabase.
- Nome/URL/branch do Cloudflare Pages de testes, se já criado.
- Para Calendar/Groq: confirmação de API habilitada/segredo no servidor quando chegarmos a essas integrações.

Sem esses recursos, código e testes podem avançar; autenticação, persistência remota e integrações reais não podem ser declaradas verificadas.
