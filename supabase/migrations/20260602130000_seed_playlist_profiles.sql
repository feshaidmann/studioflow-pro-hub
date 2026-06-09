-- Seed playlist_profiles with representative Brazilian-music cluster centroids.
-- Vectors derived from typical acoustic signatures of each segment; ranges are
-- ±1 std-dev around the centroid. sample_tracks are illustrative references.

INSERT INTO public.playlist_profiles
  (slug, name, description, vector, feature_ranges, sample_tracks, size)
VALUES

-- ── 1. Sertanejo / Piseiro ────────────────────────────────────────────────────
(
  'sertanejo-piseiro',
  'Sertanejo / Piseiro',
  'Batida forte, andamento acelerado, vocais regionais e alto impacto no dancefloor.',
  '{"lufs_integrated":-8.5,"dynamic_range_db":6.0,"spectral_centroid":2400,"tempo_bpm":148,"energy":0.88,"danceability":0.82,"valence":0.72,"acousticness":0.06}'::jsonb,
  '{"lufs_integrated":2.0,"dynamic_range_db":1.5,"spectral_centroid":400,"tempo_bpm":12,"energy":0.08,"danceability":0.10,"valence":0.15,"acousticness":0.05}'::jsonb,
  '[{"band":"Gusttavo Lima","filename":"gusttavo-sample"},{"band":"Nattan","filename":"nattan-sample"},{"band":"Zé Vaqueiro","filename":"ze-vaqueiro-sample"}]'::jsonb,
  180
),

-- ── 2. MPB / Bossa Nova ───────────────────────────────────────────────────────
(
  'mpb-bossa',
  'MPB / Bossa Nova',
  'Arranjos elaborados, melodia sofisticada, lirismo e forte presença acústica.',
  '{"lufs_integrated":-15.0,"dynamic_range_db":11.0,"spectral_centroid":1600,"tempo_bpm":90,"energy":0.34,"danceability":0.44,"valence":0.58,"acousticness":0.65}'::jsonb,
  '{"lufs_integrated":2.5,"dynamic_range_db":2.5,"spectral_centroid":300,"tempo_bpm":15,"energy":0.12,"danceability":0.12,"valence":0.18,"acousticness":0.15}'::jsonb,
  '[{"band":"Caetano Veloso","filename":"caetano-sample"},{"band":"Elis Regina","filename":"elis-sample"},{"band":"Ivan Lins","filename":"ivan-sample"}]'::jsonb,
  210
),

-- ── 3. Funk Carioca / Brega Funk ──────────────────────────────────────────────
(
  'funk-carioca',
  'Funk Carioca / Brega Funk',
  'Batida 150+ BPM, baixo pesado, vocais ritmados e alta dançabilidade.',
  '{"lufs_integrated":-7.0,"dynamic_range_db":5.0,"spectral_centroid":1800,"tempo_bpm":156,"energy":0.91,"danceability":0.90,"valence":0.65,"acousticness":0.03}'::jsonb,
  '{"lufs_integrated":1.5,"dynamic_range_db":1.5,"spectral_centroid":350,"tempo_bpm":10,"energy":0.06,"danceability":0.07,"valence":0.14,"acousticness":0.03}'::jsonb,
  '[{"band":"Anitta","filename":"anitta-sample"},{"band":"MC Cabelinho","filename":"cabelinho-sample"},{"band":"Ludmilla","filename":"ludmilla-sample"}]'::jsonb,
  250
),

-- ── 4. Rock Brasileiro ────────────────────────────────────────────────────────
(
  'rock-br',
  'Rock Brasileiro',
  'Guitarras distorcidas, dinâmica marcante e energia media-alta.',
  '{"lufs_integrated":-11.0,"dynamic_range_db":9.0,"spectral_centroid":2800,"tempo_bpm":132,"energy":0.80,"danceability":0.52,"valence":0.48,"acousticness":0.07}'::jsonb,
  '{"lufs_integrated":2.0,"dynamic_range_db":2.0,"spectral_centroid":500,"tempo_bpm":18,"energy":0.10,"danceability":0.12,"valence":0.18,"acousticness":0.06}'::jsonb,
  '[{"band":"Fresno","filename":"fresno-sample"},{"band":"Jota Quest","filename":"jota-sample"},{"band":"Skank","filename":"skank-sample"}]'::jsonb,
  140
),

-- ── 5. Pop / Indie BR ─────────────────────────────────────────────────────────
(
  'pop-indie-br',
  'Pop / Indie Alternativo',
  'Produção limpa, melodias pop com identidade autoral e sonoridade contemporânea.',
  '{"lufs_integrated":-12.5,"dynamic_range_db":8.0,"spectral_centroid":2200,"tempo_bpm":112,"energy":0.62,"danceability":0.64,"valence":0.55,"acousticness":0.22}'::jsonb,
  '{"lufs_integrated":2.0,"dynamic_range_db":2.0,"spectral_centroid":400,"tempo_bpm":16,"energy":0.12,"danceability":0.12,"valence":0.18,"acousticness":0.12}'::jsonb,
  '[{"band":"Duda Beat","filename":"duda-sample"},{"band":"Tulipa Ruiz","filename":"tulipa-sample"},{"band":"Silva","filename":"silva-sample"}]'::jsonb,
  160
),

-- ── 6. Gospel / R&B Contemporâneo ────────────────────────────────────────────
(
  'gospel-rb',
  'Gospel / R&B Contemporâneo',
  'Vocais potentes, arranjos emocionais, andamento moderado e valência elevada.',
  '{"lufs_integrated":-10.0,"dynamic_range_db":8.5,"spectral_centroid":1900,"tempo_bpm":78,"energy":0.55,"danceability":0.50,"valence":0.82,"acousticness":0.18}'::jsonb,
  '{"lufs_integrated":2.0,"dynamic_range_db":2.0,"spectral_centroid":400,"tempo_bpm":14,"energy":0.12,"danceability":0.12,"valence":0.12,"acousticness":0.10}'::jsonb,
  '[{"band":"Jotta A","filename":"jotta-sample"},{"band":"Eyshila","filename":"eyshila-sample"},{"band":"Fernandinho","filename":"fernandinho-sample"}]'::jsonb,
  120
),

-- ── 7. Eletrônica / Dance ─────────────────────────────────────────────────────
(
  'eletronica-dance',
  'Eletrônica / Dance',
  'BPM 120-130, drops elaborados, sínteses digitais e dançabilidade máxima.',
  '{"lufs_integrated":-8.0,"dynamic_range_db":6.5,"spectral_centroid":3200,"tempo_bpm":126,"energy":0.86,"danceability":0.88,"valence":0.60,"acousticness":0.02}'::jsonb,
  '{"lufs_integrated":1.5,"dynamic_range_db":1.5,"spectral_centroid":600,"tempo_bpm":8,"energy":0.07,"danceability":0.07,"valence":0.15,"acousticness":0.02}'::jsonb,
  '[{"band":"Alok","filename":"alok-sample"},{"band":"Vintage Culture","filename":"vintage-sample"},{"band":"Gustavo Mota","filename":"gustavo-m-sample"}]'::jsonb,
  190
),

-- ── 8. Pagode / Samba ─────────────────────────────────────────────────────────
(
  'pagode-samba',
  'Pagode / Samba',
  'Percussão orgânica, andamento sincopado, clima alegre e raízes afro-brasileiras.',
  '{"lufs_integrated":-13.0,"dynamic_range_db":9.5,"spectral_centroid":1700,"tempo_bpm":98,"energy":0.68,"danceability":0.76,"valence":0.80,"acousticness":0.45}'::jsonb,
  '{"lufs_integrated":2.0,"dynamic_range_db":2.5,"spectral_centroid":350,"tempo_bpm":14,"energy":0.10,"danceability":0.10,"valence":0.12,"acousticness":0.15}'::jsonb,
  '[{"band":"Thiaguinho","filename":"thiaguinho-sample"},{"band":"Exaltasamba","filename":"exalta-sample"},{"band":"Grupo Revelação","filename":"revelacao-sample"}]'::jsonb,
  170
)

ON CONFLICT (slug) DO NOTHING;
