# Revisar a primeira entrega

Branch: `dev/primeira-entrega`. Código e especificação locais, sem deploy. Resultados e bloqueios: `STATUS.md`.

## Ordem sugerida

1. Conferir `DECISOES.md`: aprovadas versus escolhas técnicas reversíveis e pendências.
2. Conferir critérios mínimos em `REQUISITOS.md`; integração externa ainda não satisfaz a aceitação real de login/persistência porque falta configuração.
3. Revisar `supabase/migrations/202610090001_initial.sql`: lista privada, limite, hook, consulta de acesso, grants, RLS e validações. Nenhum convite é cadastrado na migração.
4. Revisar `src/hooks/useAccess.ts` e `src/lib/`: sessão verificada, autorização do banco, CRUD sem identidade enviada e falhas sem sucesso fictício.
5. Executar verificações do `README.md`. Sem credenciais, `npm run dev` apresenta conexão indisponível. O teste móvel CRUD usa fixture exclusivamente de testes, indicada na própria página e fora do build.
6. Usar `CONFIGURACAO.md` para configurar testes reais e preencher os resultados pendentes. Não conectar produção ou publicar automaticamente.

## Decisões necessárias agora

- Fornecer lista de e-mails e identificar os projetos/URLs dos ambientes e seus responsáveis para configuração segura.
- Revisar a interpretação das âncoras distintas como palavras separadas por vírgulas; aprovar ou ajustar sem presumir classificação automática.
- Fornecer imagens e validar fontes/logo e métricas propostas quando disponíveis.

Destino dos dados após revogação e impacto nos itens ao excluir ambientes devem ser resolvidos antes das funcionalidades dependentes. A revogação atual preserva dados; a primeira entrega não possui itens associados.
