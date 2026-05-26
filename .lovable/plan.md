# Validar saúde da RPC `find_nearest_reference_tracks` com faixas-controle

## Por que esta abordagem

- A UI "Testar similaridade" em `/admin/reference-tracks` **não existe** — só há listagem/importação.
- Subir um arquivo no preview testa toda a stack (decode → extração de features → edge function → RPC), o que dificulta isolar problemas. Chamar a RPC com as features **já gravadas** no banco para a própria faixa é o teste mais limpo: se o lado DB está saudável, o #1 do resultado precisa ser a própria faixa com `similarity_score` ≈ 1.0.
- Como `find_nearest_reference_tracks` é `STABLE`, posso invocá-la via `supabase--read_query` (sem migração).

## Passos

1. **Escolher 3 faixas-controle** com cobertura ampla de features (LUFS, DR, centroid, MFCC, chroma). Usar `read_query`:
   ```sql
   SELECT band, filename, genre, tempo_bpm, lufs_integrated,
          mfcc IS NOT NULL AS has_mfcc, chroma_cens IS NOT NULL AS has_chroma
     FROM public.music_reference_tracks
    WHERE quarantined = false
      AND mfcc IS NOT NULL AND chroma_cens IS NOT NULL
      AND lufs_integrated IS NOT NULL AND spectral_centroid IS NOT NULL
    ORDER BY random() LIMIT 3;
   ```

2. **Para cada faixa-controle**, executar a RPC com todas as features dela:
   ```sql
   SELECT t.band, t.filename, t.similarity_score
     FROM public.find_nearest_reference_tracks(
       p_tempo_bpm        => <t.tempo_bpm>,
       p_lufs_integrated  => <t.lufs_integrated>,
       p_dynamic_range_db => <t.dynamic_range_db>,
       p_spectral_centroid => <t.spectral_centroid>,
       p_spectral_flatness => <t.spectral_flatness>,
       p_spectral_rolloff  => <t.spectral_rolloff>,
       p_spectral_bandwidth => <t.spectral_bandwidth>,
       p_zero_crossing_rate => <t.zero_crossing_rate>,
       p_mfcc        => <t.mfcc>,
       p_chroma_cens => <t.chroma_cens>,
       p_energy => <t.energy>, p_danceability => <t.danceability>,
       p_valence => <t.valence>, p_acousticness => <t.acousticness>,
       p_instrumentalness => <t.instrumentalness>,
       p_speechiness => <t.speechiness>, p_liveness => <t.liveness>,
       p_key_name => <t.key_name>, p_mode => <t.mode>,
       p_genre => <t.genre>, p_limit => 5
     ) t;
   ```
   Para evitar 3 queries hardcoded, vou usar **uma única query lateral** que faz isso para 3 faixas aleatórias em uma chamada (LATERAL + ROW_NUMBER).

3. **Critérios de aceite:**
   - **#1 = a própria faixa** (band+filename batem).
   - `similarity_score` do #1 **≥ 0.95** (idealmente ≈ 1.0; pequeno desvio aceitável se houver bônus de gênero/key).
   - #2 com score sensivelmente menor (≥ 0.10 de gap) — sinaliza que o ranking discrimina.

4. **Se falhar:** investigar `total_distance` componente a componente (loggar as parcelas mfcc/lufs/etc.) para localizar feature problemática.

5. **Se passar:** opcionalmente, repetir o teste **alterando** apenas LUFS em ±5 dB para confirmar que o score cai de forma monotônica — saneamento de comportamento.

## Fora de escopo

- Subir áudio no preview (depende da extração client-side; foi tratada em iteração anterior).
- Construir UI "Testar similaridade" no `/admin/reference-tracks` (pode virar plano separado se quiser uma ferramenta permanente).
- Reverificar logs da edge function `music-dna-analyze` — só faz sentido depois que o lado DB estiver verde.

## Saída esperada

Tabela curta no chat com: `band | filename | rank | similarity_score | self_match?` para as 3 faixas, mais um veredicto **OK/FALHA**.
