# Aceitar URLs do Spotify com locale (ex.: `/intl-pt/artist/...`)

## Problema
O regex de validação no frontend só aceita `https://open.spotify.com/artist/<id>`. URLs como `https://open.spotify.com/intl-pt/artist/0XreYIPwU3ktKr5KB75Ziv?si=...` são rejeitadas antes de chegar ao backend (que já trata corretamente via `artist/([a-zA-Z0-9]+)`).

## Mudança (1 arquivo)
**`src/components/spotify-import/ImportSpotifyCatalogDialog.tsx`**
- Atualizar `URL_REGEX` para aceitar segmento opcional de locale entre o domínio e `artist/`:
  ```ts
  const URL_REGEX = /^https?:\/\/open\.spotify\.com\/(intl-[a-z]{2}\/)?artist\/[a-zA-Z0-9]+(\?.*)?$/;
  ```
- Atualizar o texto do helper para mencionar que links com `/intl-xx/` também são suportados.

## Fora de escopo
- Backend (`import-spotify-catalog`) — regex já é tolerante.
- Qualquer outra lógica de import, UI ou hooks.
