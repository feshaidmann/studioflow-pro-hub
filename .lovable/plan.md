## Monitoramento de Entradas em Playlists

Fecha o loop do pipeline de pitch: o artista marca playlists compatíveis para monitorar e é notificado quando sua faixa entra.

### 1. Banco de dados

Migration nova `playlist_monitors`:

- Colunas: `id`, `user_id`, `playlist_id`, `playlist_name`, `playlist_image_url`, `playlist_external_url`, `playlist_owner_name`, `track_spotify_uri`, `track_name`, `status` ('monitoring' | 'found'), `found_at`, `last_checked_at`, `created_at`.
- `UNIQUE (user_id, playlist_id, track_spotify_uri)` para evitar duplicatas.
- `GRANT SELECT, INSERT, UPDATE, DELETE` para `authenticated`; `ALL` para `service_role`.
- RLS habilitado: política única `auth.uid() = user_id` (FOR ALL).
- Índice extra `(user_id, status)` para listagem rápida.

Sem alterações em `notifications`, `music_dna_analyses`, `projects`, `spotify_tracks`.

### 2. Edge Function `check-playlist-tracks`

`POST /functions/v1/check-playlist-tracks` — autenticada via `getClaims` (JWT do usuário). Validação Zod do body `{ monitor_id, playlist_id, track_spotify_uri }`.

Fluxo:
1. Carrega o monitor com client autenticado e confere `user_id = sub`. 404 se não pertencer.
2. Autentica no Spotify via Client Credentials (`SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` já existentes).
3. Pagina `GET /v1/playlists/{id}/tracks?fields=items(track(uri)),next&limit=100` enquanto `next !== null`. Limite defensivo: máx. 30 páginas (3.000 faixas).
4. Atualiza `last_checked_at = now()`. Se a URI for encontrada e status era `monitoring`, atualiza para `found` + `found_at = now()` e insere em `notifications` (`type='playlist_found'`, título "Sua faixa entrou em uma playlist! 🎉", mensagem "Sua faixa [track_name] foi adicionada à playlist [playlist_name]!", link para `/music-dna`).
5. Inserção da notificação é idempotente — só dispara na transição `monitoring → found`.
6. Resposta: `{ found: boolean, checked_at: ISO, status: 'monitoring'|'found' }`.

CORS padrão do Supabase SDK. Tratamento de 401/429 do Spotify com mensagem amigável.

### 3. Frontend — integração no Music DNA

**3a. `CompatiblePlaylistsCard.tsx` (edit):**
- Adiciona botão secundário "Monitorar" no rodapé de cada card (ao lado de "Abrir").
- Carrega via hook `usePlaylistMonitors` os pares `(playlist_id, track_spotify_uri)` já monitorados pelo usuário.
- Se a playlist já tem qualquer monitor ativo do usuário → botão exibe "Monitorando ✓" (disabled, verde sutil) e abre `MonitorPlaylistDialog` em modo "adicionar outra faixa" somente se clicado em modo edit (no MVP: simplesmente disabled quando há ≥1 par).

**3b. `MonitorPlaylistDialog.tsx` (novo):**
- Dialog do shadcn com header: capa + nome da playlist + owner.
- Select "Qual faixa você quer monitorar?" alimentado por **`music_dna_analyses` do usuário** onde `spotify_id IS NOT NULL`. Cada opção exibe `track_name` e constrói `spotify_track_uri = 'spotify:track:' + spotify_id`. Ordenado por `created_at desc`, distinct por `spotify_id`, limite 50.
- Estado vazio: mensagem "Nenhuma análise Music DNA com link do Spotify. Rode uma análise associada a uma faixa do Spotify para monitorar." com CTA para `/music-dna`.
- Campo fallback colapsável: input de Spotify URI manual (regex `^spotify:track:[A-Za-z0-9]{22}$`) + input de nome legível obrigatório.
- Botão "Começar a monitorar":
  - INSERT em `playlist_monitors` (via supabase client; RLS garante `user_id`).
  - Em caso de conflito UNIQUE → toast "Você já monitora esta combinação".
  - Após insert, dispara imediatamente `supabase.functions.invoke('check-playlist-tracks', ...)` para verificação inicial.
  - Fecha o dialog e toast: "Monitoramento ativo para [nome da playlist]".
  - Invalida queries de `playlist_monitors`.

**3c. `ActiveMonitorsCard.tsx` (novo):**
- Renderizado em `MusicDNAAnalyzer.tsx` logo abaixo de `CompatiblePlaylistsCard`.
- Só aparece se `usePlaylistMonitors()` retornar ≥1 registro.
- Lista cards com layout macOS (capa 48px, nome + owner, faixa monitorada, "Última verificação: há X" via date-fns pt-BR).
- Status `monitoring`: badge cinza "● Monitorando" + botão "Verificar agora" (spinner durante invoke, sem limite no MVP).
- Status `found`: badge verde "🎉 Faixa adicionada!" + data formatada pt-BR + link "Abrir no Spotify" (usa `playlist_external_url`).
- Ícone lixeira no canto sup. direito → `AlertDialog` "Parar de monitorar esta playlist?" → DELETE.
- Após "Verificar agora" ou delete: invalida queries (sem reload).

**3d. `usePlaylistMonitors.ts` (novo):**
- React Query hook: `useActiveMonitors()` (SELECT `*` ordenado por `created_at desc`), `useCreateMonitor()`, `useDeleteMonitor()`, `useCheckMonitor()` (invoke da edge function).

### 4. Integração com sistema de notificações existente

Reutiliza a tabela `notifications` (já existente). A notificação aparece automaticamente no sino do app sem necessidade de mudanças na UI de notificações.

### Fora de escopo

- Cron de verificação automática (apenas verificação sob demanda no MVP).
- Push notifications (apenas in-app via `notifications`).
- Alterações em `search-compatible-playlists`, `PlaylistMatchCard`, RLS de outras tabelas, navegação, dark mode.
- Limite de chamadas manuais (decisão explícita do MVP).

### Detalhes técnicos

**Arquivos:**
- `supabase/migrations/<ts>_playlist_monitors.sql` (novo)
- `supabase/functions/check-playlist-tracks/index.ts` (novo)
- `src/hooks/usePlaylistMonitors.ts` (novo)
- `src/components/music-dna/MonitorPlaylistDialog.tsx` (novo)
- `src/components/music-dna/ActiveMonitorsCard.tsx` (novo)
- `src/components/music-dna/CompatiblePlaylistsCard.tsx` (edit — botão Monitorar + estado disabled)
- `src/components/music-dna/MusicDNAAnalyzer.tsx` (edit — render do `ActiveMonitorsCard`)

**Reuso:** `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` já configurados, tabela `notifications` existente, design tokens semânticos do projeto.
