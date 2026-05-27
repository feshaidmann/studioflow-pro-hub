
# Admin — Import de Gêneros (CSV → staging → apply)

Materializa, em UI admin, o pipeline que já existe no banco: popular `public._genre_import_2026` com `(band, filename, genre)` e disparar `public.apply_genre_import_2026(p_drop_staging)` para aplicar nas faixas de referência, com relatório completo.

## Rota e acesso

- Nova rota: `/admin/genre-import` (lazy em `src/App.tsx`).
- Card de entrada em `src/pages/Admin.tsx` ao lado dos cards existentes.
- Guarda via `useAdminRole` + `<Navigate to="/dashboard">` se não-admin (padrão idêntico ao `ReferenceTracks.tsx`).

## Formato do CSV

Colunas obrigatórias (header exato): `band`, `filename`, `genre`.
Linhas com qualquer campo vazio são descartadas no client e contabilizadas como "ignoradas".

## Edge Function `apply-genre-import` (nova)

`POST` multipart com `file` (ou JSON `{ csv, dropStaging? }`).

Fluxo server-side:
1. Validação de auth: `Authorization: Bearer`, `getClaims`, `has_role(uid,'admin')` via service-role client; sem admin → 403.
2. Parse CSV com `papaparse`; valida headers; rejeita 400 se colunas faltam ou nenhuma linha válida.
3. Garante existência da staging (caso a RPC anterior tenha sido chamada com `p_drop_staging=true`):
   ```sql
   CREATE TABLE IF NOT EXISTS public._genre_import_2026 (
     band text NOT NULL,
     filename text NOT NULL,
     genre text NOT NULL
   );
   TRUNCATE public._genre_import_2026;
   ```
   (executado via uma RPC nova `reset_genre_import_staging()` SECURITY DEFINER, para não precisar de SQL arbitrário).
4. Insere linhas em chunks de 500 usando `admin.from('_genre_import_2026').insert(...)`.
5. Chama `admin.rpc('apply_genre_import_2026', { p_drop_staging: body.dropStaging ?? true })`.
6. Loga `function_logs` (`function_name: 'apply-genre-import'`) com contagens.
7. Retorna o JSON tal qual a RPC devolve, acrescentando `staging_inserted` (linhas inseridas no client→staging) e `csv_skipped` (linhas vazias do CSV):
   ```
   {
     staging_inserted, csv_skipped,
     staging_rows, staging_unique,
     updated, unchanged, unmatched,
     top_genres_after: [{ genre, n }, ...]
   }
   ```

`verify_jwt = false` (padrão Lovable; validação em código).

## Migração — `reset_genre_import_staging()`

Função SECURITY DEFINER, sem args, executável por `service_role`:
- `CREATE TABLE IF NOT EXISTS public._genre_import_2026 (band text NOT NULL, filename text NOT NULL, genre text NOT NULL)`.
- `TRUNCATE public._genre_import_2026`.
- Concede `INSERT, SELECT, TRUNCATE` na tabela para `service_role` (idempotente).
- `GRANT EXECUTE` da função somente para `service_role`.

Não altera `apply_genre_import_2026` (já existente e usada como está).

## Frontend — `src/pages/admin/GenreImport.tsx`

Mesmo visual e estrutura de `src/pages/admin/ReferenceTracks.tsx`:

- Dropzone CSV (`.csv` apenas) com `papaparse` client-side para preview:
  - linhas válidas, gêneros distintos, bandas distintas, linhas ignoradas (campos vazios), colunas faltando.
- Badges de preview (linhas / gêneros / bandas / faltando).
- Checkbox **"Apagar staging após aplicar"** (default: marcado → mantém o comportamento da RPC).
- Botão **"Aplicar import"** com `<AlertDialog>` de confirmação avisando:
  - "Faz backup automático em `music_reference_tracks_genre_backup` antes de qualquer update."
  - "Benchmarks são atualizados automaticamente (view derivada)."
- Estado de loading com `Loader2`; chamada via `supabase.functions.invoke('apply-genre-import', { body: formData })`.

Relatório pós-execução em `<Alert>` + cards/tabelas:
- 4 KPIs em grid: **Atualizadas** (`updated`), **Sem mudança** (`unchanged`), **Sem correspondência** (`unmatched`), **Únicas em staging** (`staging_unique`).
- Linha secundária: `staging_rows` (linhas brutas enviadas) e `staging_inserted` (após dedupe da RPC).
- Tabela "Top 30 gêneros após aplicação" com `genre` e `n` (vindo de `top_genres_after`), ordenada desc.
- Botão **"Limpar cache do catálogo acústico"** que faz `sessionStorage.removeItem("acoustic-catalog:v1")` (consistente com `ReferenceTracks.tsx`).
- Toast de sucesso com resumo: `${updated} atualizadas · ${unmatched} sem correspondência`.

## Garantias

- **Segurança**: edge function exige role `admin` server-side; RPCs SECURITY DEFINER já fazem o mesmo check; UI tem guarda `useAdminRole`.
- **Idempotência**: re-rodar o mesmo CSV → `updated=0`, todas como `unchanged`.
- **Reversibilidade**: a RPC já grava `music_reference_tracks_genre_backup` antes do update (via `ON CONFLICT (track_id) DO UPDATE` no backup).
- **Light mode**, tokens semânticos, sem alteração em outros módulos.

## Fora de escopo

- Não cria a tabela de backup nem altera `apply_genre_import_2026` (ambos já existem).
- Não expõe UI de rollback (manual via SQL se necessário).
- Não toca em `import-reference-tracks` (catálogo completo) nem em `/admin/reference-tracks`.

## Arquivos

- `supabase/migrations/<ts>_reset_genre_import_staging.sql` (nova RPC + GRANTs)
- `supabase/functions/apply-genre-import/index.ts` (nova edge function)
- `src/pages/admin/GenreImport.tsx` (nova tela)
- `src/App.tsx` (1 import + 1 rota)
- `src/pages/Admin.tsx` (1 card de entrada)
