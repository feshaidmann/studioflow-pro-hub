## Objetivo

Preencher e corrigir a coluna `genre` da tabela `music_reference_tracks` a partir do CSV `music_analysis_full_genre.csv` (846 bandas × 1 gênero cada), aplicando as decisões aprovadas:

1. **Sobrescrever tudo** — CSV vira fonte única de verdade.
2. **Ignorar gêneros lixo** — não regravar quando o CSV traz valor inválido.
3. **Canonizar** via `public.genre_canonical()` antes de gravar.
4. **Match case-insensitive + trim** entre CSV.band e DB.band.

## Como vai funcionar

### 1. Staging em tabela temporária

Em vez de fazer 846 UPDATEs separados, vou:

a. Criar migration que monta uma tabela de staging `_genre_import_staging(band_norm text, genre_raw text)`.
b. Popular via `INSERT` (uso a ferramenta de inserção do Supabase) com as 846 linhas extraídas do CSV. Apenas duas colunas — payload pequeno (~30 KB).
c. Rodar um único `UPDATE ... FROM staging` que faz todo o trabalho.
d. `DROP TABLE _genre_import_staging` ao final.

### 2. Filtro de "lixo"

Lista bloqueada (case-insensitive, comparada ao valor cru do CSV antes de canonizar):

```
'', 'unknown', 'n/a', 'audiobook', 'non-music', 'soundtrack',
'special purpose artist', 'composer', 'fictional band',
'male vocalist', 'british', 'english', 'brazilian',
'to clean up', 'eric alexander', 'joelho de porco',
'joe meek 60s telstar'
```

Linhas com gênero nesta lista são removidas do staging antes do UPDATE → as faixas correspondentes ficam intocadas no banco.

### 3. UPDATE final

```sql
UPDATE public.music_reference_tracks t
   SET genre = COALESCE(public.genre_canonical(s.genre_raw), s.genre_raw),
       updated_at = now()
  FROM _genre_import_staging s
 WHERE lower(btrim(t.band)) = s.band_norm
   AND COALESCE(public.genre_canonical(s.genre_raw), s.genre_raw) IS DISTINCT FROM t.genre;
```

- `genre_canonical` devolve `NULL` para gêneros considerados ruído pela função (já cobre alguns casos extras como `'(sem)'`).
- O `COALESCE` garante que, se `genre_canonical` retornar `NULL` para algo que escapou da blocklist, gravamos o valor literal do CSV em vez de apagar o gênero existente.
- Cláusula `IS DISTINCT FROM` evita gravações desnecessárias.

### 4. Relatório pós-execução

Após o UPDATE rodo um `SELECT` de auditoria (via read_query) e devolvo no chat:

- Linhas atualizadas vs. inalteradas.
- Bandas do CSV que não bateram com nenhum registro no banco (após normalização).
- Bandas no banco que continuam sem gênero (não estavam no CSV).
- Top-20 gêneros após a operação, para conferência visual.

## Etapas

1. **Migration** — cria `_genre_import_staging` (temp permanente até o próximo passo) + função auxiliar opcional. Aprovação do usuário no popup do Supabase.
2. **Insert** — popular staging com as 846 tuplas `(band_norm, genre_raw)`. Geração local do SQL a partir do CSV já copiado em `/tmp/genres.csv`.
3. **Migration final** — roda o UPDATE em massa e dropa a tabela de staging.
4. **Auditoria** — `read_query` com as 4 consultas acima; resumo no chat.

## Riscos e mitigações

- **Bandas com nome diferente entre CSV e banco** (ex.: "Beatles" vs "The Beatles"): não tento fuzzy-match para evitar falsos positivos; entram no relatório de não-batidas para você decidir caso a caso.
- **Rollback**: como vamos sobrescrever, preparo o `INSERT` da staging guardando também o `genre` antigo numa coluna `genre_prev text` — assim, se você quiser reverter, basta um único `UPDATE` de espelho. A tabela de staging é dropada ao final, mas posso opcionalmente persistir um snapshot em `public.music_reference_tracks_genre_backup` antes de dropar (recomendo manter por 30 dias).
- **Tamanho do payload**: 846 linhas × 2 colunas curtas = ~30 KB, bem abaixo do limite da ferramenta de insert.

## Fora de escopo nesta tarefa

- Ajustes no algoritmo de similaridade do prompt `prompt_lovable_music_dna_fix.md` — abro plano separado após esta tarefa, conforme você confirmar.
- Limpeza dos 23 registros com `band` parecendo nome de arquivo (problema antigo de importação) — relato no fim, mas não toco.
