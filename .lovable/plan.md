## Objetivo

Importar o catálogo de lançamentos do artista (álbuns, EPs, singles) a partir da URL de perfil do Spotify, em tabelas novas dedicadas, sem mexer em `projects`. Habilita o dropdown do monitoramento de playlists com faixas que já têm `spotify_track_uri`.

## 1. Banco — migration

Duas tabelas novas e dedicadas (não tocam em `projects`).

### `public.spotify_releases`
- `id uuid pk`, `user_id uuid not null`, `spotify_album_id text not null`, `spotify_album_uri text`, `name text not null`, `release_type text` (`album|single|ep|compilation`), `release_date date`, `image_url text`, `total_tracks int`, `imported_at timestamptz default now()`, `created_at timestamptz default now()`.
- UNIQUE `(user_id, spotify_album_id)`.
- GRANT `SELECT, INSERT, UPDATE, DELETE` a `authenticated`; `ALL` a `service_role`.
- RLS ON + 4 policies escopadas a `auth.uid() = user_id`.

### `public.spotify_tracks`
- `id uuid pk`, `user_id uuid not null`, `release_id uuid references spotify_releases(id) on delete cascade not null`, `spotify_track_id text not null`, `spotify_track_uri text not null`, `name text not null`, `track_number int`, `duration_ms int`, `isrc text`, `created_at timestamptz default now()`.
- UNIQUE `(user_id, spotify_track_id)`.
- Índice `(user_id, spotify_track_uri)` para o dropdown do monitoramento.
- Mesmo padrão de GRANT/RLS por `user_id`.

Sem alterações em `projects`.

## 2. Edge Function `import-spotify-catalog`

`supabase/functions/import-spotify-catalog/index.ts` — POST autenticado.

1. CORS + valida JWT, pega `user_id`.
2. Body `{ spotify_artist_url }` validado por zod.
3. Regex `/artist\/([a-zA-Z0-9]+)/`. Falha → 400 "URL inválida. Use um link de artista do Spotify."
4. Token Spotify via Client Credentials (mesma helper das functions existentes `search-compatible-playlists` / `check-playlist-tracks`).
5. `GET /v1/artists/{id}` → nome do artista.
6. `GET /v1/artists/{id}/albums?include_groups=album,single,compilation&market=BR&limit=50`, paginando enquanto `next`. **Limite de 200 releases** por chamada (trunca com aviso no payload).
7. Para cada álbum: `GET /v1/albums/{id}/tracks?market=BR&limit=50` paginando.
8. **Buscar ISRC**: agrupa IDs em chunks de 50 → `GET /v1/tracks?ids=...&market=BR` → extrai `external_ids.isrc` (o endpoint de tracks do álbum não retorna ISRC).
9. Retorna payload conforme spec (`artist_id`, `artist_name`, `releases[]`). Não grava no banco.

Sem alterações em `supabase/config.toml`.

## 3. Frontend — fluxo de importação

### 3a. Pontos de entrada
- **Página de Projetos:** botão `Importar do Spotify` (variant outline) ao lado de `+ Novo Projeto`.
- **Music DNA `MonitorPlaylistDialog`:** quando a query retorna zero faixas com `spotify_track_uri`, empty state com botão `Importar do Spotify` que abre o mesmo dialog.

### 3b. `ImportSpotifyCatalogDialog.tsx` (novo)

Wizard de 3 etapas, estado local `step: 'url' | 'select' | 'done'`.

**Etapa 1 — URL**
- Input com validação em tempo real do regex `open.spotify.com/artist/...`.
- Helper text com "como encontrar".
- Botão `Buscar catálogo →` invoca a edge function (loading state).

**Etapa 2 — Selecionar**
- Releases agrupados por `release_type` na ordem **Álbuns → EPs → Singles → Compilações**, cada grupo ordenado por `release_date` decrescente.
- `select spotify_album_id from spotify_releases where user_id = me` marca "Já importado" (checkbox disabled, badge cinza). Por padrão, novos vêm marcados.
- Checkbox "Selecionar todos" + contador.
- Cada card: capa 48px, nome, ano, total de faixas.
- Botão `Importar selecionados`.

**Etapa 3 — Sucesso**
- `✓ Importação concluída — X lançamentos e Y faixas`.
- Botões `Ver catálogo` (navega `/projects`) e `Fechar`.

### 3c. Persistência
Hook `useSpotifyImport.ts`:
- `fetchCatalog(url)` → invoke edge function.
- `importSelection(releases[])` → para cada release: `upsert spotify_releases on conflict(user_id, spotify_album_id) do nothing returning id` (re-fetch quando "do nothing" não retorna); depois `upsert spotify_tracks` em batch com `on conflict(user_id, spotify_track_id) do nothing`.
- Tudo via supabase client (RLS garante `user_id`). Toast com resultado.
- Invalida queries: `spotify-releases`, `spotify-tracks-with-uri`.

## 4. Integração com monitoramento de playlists

Atualizar o `MonitorPlaylistDialog` para que o Select "Qual faixa você quer monitorar?" tenha duas seções:
1. **Catálogo Spotify** — `spotify_tracks where user_id=me and spotify_track_uri is not null` (ordenado por release_date desc, depois `name`). URI já preenchida automaticamente ao selecionar.
2. **Análises Music DNA com URI** — `music_dna_analyses where user_id=me and spotify_id is not null` (campos confirmados no schema), exibindo `track_name`; URI montada como `spotify:track:{spotify_id}`.

Mantém input manual de URI como fallback. Empty state (nenhuma das duas fontes tem nada) oferece o atalho "Importar do Spotify".

## 5. Memória

Adicionar `mem://funcionalidades/dna-musical/importacao-catalogo-spotify` documentando tabelas, edge function, fluxo e integração com monitoramento. Atualizar `mem://index.md`.

## Arquivos

- `supabase/migrations/<ts>_spotify_catalog.sql` (novo)
- `supabase/functions/import-spotify-catalog/index.ts` (novo)
- `src/components/spotify-import/ImportSpotifyCatalogDialog.tsx` (novo)
- `src/hooks/useSpotifyImport.ts` (novo)
- Header da página de Projetos (edit) — botão de importação
- `src/components/music-dna/MonitorPlaylistDialog.tsx` (edit) — novas fontes + atalho de importação

## Fora de escopo

- Alterações em `projects`, `music_dna_analyses` ou outras tabelas existentes.
- Cron de re-sincronização automática (re-import manual; `on conflict do nothing` torna idempotente).
- Conversão de releases importados em "projetos" do workflow de produção.
- Dark mode, navegação global, RLS de outras tabelas.