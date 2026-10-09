# Design — origem dos tokens

Referência textual recebida e lida: `referencias/design-handoff-0.1.txt`. Imagens da mistura original e P3 não vieram anexadas e não foram encontradas. Não é possível extrair geometria do símbolo, identificar fontes reais ou comparar fidelidade visual sem elas.

## Aprovado no documento

Marca `allgenda`, slogan “Tudo converge aqui”. P3/Petróleo e areia e Original/Brasa, em claro/escuro. Os nove tokens de cor de cada combinação e as três cores de estado são transcritos literalmente em `src/styles/tokens.css`; não são cores estimadas a partir de imagens. Estados usam cor apenas como complemento de texto. Marcadores dos ambientes não recebem paleta inventada.

## Proposto no documento, ainda para revisão

Escala 12, 14, 16, 18, 24, 32 e 48 px; espaçamentos 4, 8, 12, 16, 24, 32, 48 e 64 px; componentes com raio 4 px, diálogos 8 px, bordas 1 px, controles mínimos de 44 px, transição 160 ms e entrelinhas 1,6/1,2. Tokens centralizam esses valores iniciais sem apresentá-los como escolhas finais aprovadas.

Fredoka e IBM Plex Mono são candidatas a prova, não fontes aprovadas. A interface usa fallback monoespaçado do sistema, sem apresentar wordmark ou logo reconstruído. Escolha P3 padrão é operacional reversível. Tema inicial acompanha o dispositivo; escolha posterior é persistida somente no dispositivo.

## Estados implementados

Botão principal/secundário/destrutivo, hover, foco, desabilitado e salvando; campos com label, ajuda e erro; cartões; vazio, carregamento, falha, acesso negado e diálogo de exclusão. Conteúdo da aplicação vem do Supabase e interpretação real depende de Groq configurado; não há agenda ou chat simulados. Calendário, painéis e prévias reutilizam os tokens; não foi inventada uma paleta de ambientes.

Recalcular contraste dos fundos e estados utilizados, testar quatro combinações, teclado, foco, toque, zoom, movimento reduzido e conteúdo longo. Acessibilidade e comparação visual não estão automaticamente validadas pelo documento de referência.
