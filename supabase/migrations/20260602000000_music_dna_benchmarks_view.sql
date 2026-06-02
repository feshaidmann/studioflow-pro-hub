-- View que deriva benchmarks por gênero em tempo real a partir do catálogo de
-- faixas de referência. Atualiza automaticamente a cada novo INSERT/UPDATE.
-- Colunas compatíveis com BenchmarkRow (genreClassifier.ts) e com as queries
-- em ReferenceTracks.tsx e useMusicDNA.ts.
CREATE OR REPLACE VIEW music_dna_benchmarks AS
SELECT
  genre                       AS genero,
  COUNT(*)                    AS total_faixas,
  AVG(tempo_bpm)              AS avg_tempo_bpm,
  AVG(danceability)           AS avg_danceability,
  AVG(energy)                 AS avg_energy,
  AVG(acousticness)           AS avg_acousticness,
  AVG(instrumentalness)       AS avg_instrumentalness,
  AVG(valence)                AS avg_valence,
  AVG(speechiness)            AS avg_speechiness,
  AVG(lufs_integrated)        AS avg_loudness_db,
  MAX(updated_at)             AS atualizado_em
FROM music_reference_tracks
WHERE quarantined IS NOT TRUE
GROUP BY genre;
