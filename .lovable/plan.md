# Aprimorando o DNA Musical com dados públicos

Hoje o DNA usa: análise local (Web Audio), `music_reference_tracks` (catálogo interno), benchmarks por gênero, e tentativa best-effort em **MusicBrainz + AcousticBrainz + Deezer** (`src/lib/musicDnaLookup.ts`). Abaixo, fontes públicas viáveis e onde encaixá-las para aumentar **confiabilidade dos vizinhos próximos, contexto cultural e recomendações**.

## 1. Fontes externas recomendadas

### Acústicas / técnicas
- **AcousticBrainz (já usado, mas subutilizado)** — dump completo é público (~30M faixas com features tipo Spotify). Podemos baixar o subset de gêneros BR e popular `music_reference_tracks` em massa, melhorando o k-NN.
- **Essentia models (open-source)** — rodar offline em faixas de referência para extrair BPM, key, mood, danceability e padronizar com o que extraímos do usuário (mesma régua = comparação justa).
- **Free Music Archive (FMA)** — 100k+ faixas com gênero rotulado e áudio livre; ótimo para popular benchmarks de nicho (Lo-Fi, Indie, Eletrônica).
- **MTG-Jamendo dataset** — 55k faixas com tags de mood/instrumento/gênero, licença CC.

### Metadados / contexto cultural
- **MusicBrainz** (já usado para MBID) — expandir para puxar tags, país de origem, ano, label, relacionamentos artista↔produtor.
- **ListenBrainz** — popularidade real e co-listening (faixas frequentemente tocadas junto). Vira sinal de "se sua faixa parece X, seu público também ouve Y".
- **Discogs API** — gênero/estilo curado por humanos, selo, ano. Bom para validar o gênero declarado.
- **Wikidata / Wikipedia** — bio resumida do artista de referência citado, para o card de "vizinho próximo" virar clicável com contexto.

### Streaming / tendências
- **Deezer (já usado)** — expandir: charts por país (BR), playlists editoriais por gênero, preview de 30s para o usuário comparar.
- **Last.fm API** — tags coletivas, similaridade entre artistas, ouvintes/mês. Excelente complemento para "referências próximas" com peso social.
- **Spotify Web API (sem login do usuário, com client credentials)** — busca pública de faixa/artista, popularidade, mercados. Audio features foi descontinuado para apps novos, mas metadados continuam.

### Letra / temática
- **LRCLIB / Lyrics.ovh** — letras públicas para análise temática (sentimento, campo semântico) já que hoje só temos áudio.

## 2. Onde encaixar no produto

```text
                ┌──────────────────────────────┐
 Upload ───────►│  Análise local (Web Audio)   │
                └──────────────┬───────────────┘
                               ▼
                ┌──────────────────────────────┐
                │  Enriquecimento externo (NEW)│
                │  • AcousticBrainz / Essentia │
                │  • Last.fm / ListenBrainz    │
                │  • Discogs / MusicBrainz     │
                │  • Deezer charts BR          │
                └──────────────┬───────────────┘
                               ▼
                ┌──────────────────────────────┐
                │  k-NN no catálogo expandido  │
                │  + sinais sociais (peso)     │
                └──────────────┬───────────────┘
                               ▼
                  Diagnóstico Gemini com
                  contexto cultural rico
```

### Mudanças concretas
1. **Edge function `import-reference-tracks`**: adicionar pipeline batch que ingere FMA/Jamendo/AcousticBrainz por gênero BR e roda Essentia (worker Python ou Aubio em Deno via WASM) para padronizar features.
2. **Nova edge function `enrich-track-context`**: dado `{artista, titulo}` declarados pelo usuário (campo opcional), consulta Last.fm + Discogs + MusicBrainz e retorna tags, similar artists, popularidade. Cache em nova tabela `music_external_metadata`.
3. **`find_nearest_reference_tracks` (RPC)**: passar a aceitar `p_social_weight` para reordenar vizinhos por co-listening (ListenBrainz) quando disponível.
4. **UI `MusicDNAAnalyzer`**: card "Vizinhos próximos" ganha:
   - Mini-player Deezer (preview 30s) para validar perceptualmente a similaridade.
   - Tags do MusicBrainz/Last.fm como chips abaixo de cada vizinho.
   - Link "ouvintes que gostam disso também ouvem" (ListenBrainz).
5. **Confiabilidade visível**: badge `Fonte: catálogo interno + AcousticBrainz + Last.fm` por vizinho, reforçando a memória de "comparativo técnico, não fingerprint".
6. **Letras (opcional, fase 2)**: se usuário informar artista+título, buscar letra no LRCLIB e injetar no prompt do Gemini para enriquecer o `diagnostico_resumo` com leitura temática.

## 3. Tabelas novas sugeridas

- `music_external_metadata` (mbid, lastfm_tags, discogs_styles, listeners, similar_artists jsonb, fetched_at) — cache 30 dias.
- `music_reference_tracks_external_source` (track_id, source enum, source_id, raw jsonb) — rastreabilidade da origem dos dados.

## 4. Custos e limites

- **AcousticBrainz / MusicBrainz / ListenBrainz / LRCLIB**: gratuitos, exigem User-Agent identificável (já fazemos) e ~1 req/s.
- **Last.fm / Discogs**: gratuitos com API key (secret). Discogs limita 60 req/min autenticado.
- **Spotify client credentials**: gratuito, exige client_id/secret.
- **Deezer**: gratuito sem chave para metadados públicos.
- Ingestão em massa (FMA/Jamendo/Essentia) é **um job batch único + atualizações mensais**, não custo recorrente em produção.

## 5. Ordem sugerida de implementação (incremental)

1. **Fase 1 (alto ROI, baixo custo):** Last.fm + ListenBrainz para enriquecer vizinhos próximos com tags e similaridade social. Adiciona player Deezer.
2. **Fase 2:** Ingestão batch de AcousticBrainz/FMA filtrados por gêneros BR, dobrando o catálogo de referência.
3. **Fase 3:** Discogs/Wikidata para contexto editorial; LRCLIB para análise de letra.
4. **Fase 4:** Re-rank do k-NN combinando distância técnica + peso social.

## Observações técnicas

- Todo enriquecimento externo deve rodar em **edge function** com cache em Postgres (rate limits + privacidade).
- Manter a memória atual de "comparativo técnico aproximado" — nunca afirmar identidade.
- Respeitar licenças: FMA/Jamendo são CC; AcousticBrainz é CC0; Last.fm/Discogs exigem atribuição visível.

---

Posso começar pela **Fase 1** (Last.fm + ListenBrainz + preview Deezer nos vizinhos próximos) já que tem o maior impacto percebido pelo usuário sem mexer no pipeline de ingestão. Quer seguir por aí ou prefere começar pela expansão do catálogo (Fase 2)?
