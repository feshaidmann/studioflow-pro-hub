## Relatório de auditoria do import de gêneros

Tarefa one-off: gerar arquivos para download (não tocar na UI). Vou consultar `music_reference_tracks` e `music_reference_tracks_genre_backup` e produzir relatórios em Markdown + CSVs em `/mnt/documents/`.

### Conteúdo do relatório (Markdown)

1. **Resumo executivo**
   - Total de faixas no catálogo, com backup, atualizadas, sem alteração, não casadas.
   - Datas: `backed_up_at` (snapshot pré-import) e janela do import.

2. **Top 30 gêneros — antes × depois**
   - Tabela lado a lado (count antes do backup vs count atual) + variação absoluta e %.
   - Destaque para gêneros que sumiram (ex.: "Rock Alternativo BR", "Pop Brasileiro") e que cresceram (Rock, Pop, Jazz puros).

3. **Matriz de mudanças (churn)**
   - Top 30 transições `genre_prev → genre_atual` por volume.
   - Permite ver, por exemplo, "Rock Alternativo BR → Rock: 5.310 faixas".

4. **Faixas atualizadas**
   - Sample de 50 + total. CSV completo separado.

5. **Faixas sem alteração**
   - Apenas contagem por gênero (não faz sentido listar 19k).

6. **Faixas no CSV não casadas** (band+filename sem match)
   - Lista completa (foram 13). CSV separado.

7. **Anomalias e observações**
   - Faixas com `genre_prev` vazio que ganharam gênero (cobertura nova).
   - Faixas que perderam gênero (caso existam).
   - Quarentena vs ativas após o import.

### Artefatos gerados em `/mnt/documents/`

- `genre_import_audit.md` — relatório principal.
- `genre_import_updated.csv` — todas as faixas com mudança (`band; filename; genre_prev; genre_now`).
- `genre_import_unmatched.csv` — linhas do CSV original sem match no catálogo.
- `genre_top_before_after.csv` — tabela top gêneros antes/depois.
- `genre_churn_matrix.csv` — `from_genre; to_genre; count`.

### Execução

- Tudo via consultas SQL (`supabase--read_query`) + script Python local para montar Markdown e CSVs.
- Sem migrations, sem mudança de schema.
- QA: abrir o `.md` e os CSVs após gerados para confirmar números coerentes (updated=10.681, unchanged=19.072, unmatched=13 conforme execução anterior).

### Fora do escopo

- Não regenero `playlist_profiles` (assunto separado).
- Não consolido clusters duplicados ("Indie BR Soft" variantes).
