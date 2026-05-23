
# Diagnóstico profundo do código

Análise feita sobre o projeto StudioFlow (React + Vite + Supabase/Cloud), ~50k linhas em 275 arquivos TS/TSX e 33 edge functions. Sem propor mudanças ainda — apenas um relatório do estado atual com prioridades.

## 1. Saúde geral

- **Build TypeScript:** `tsc --noEmit` passou limpo (0 erros).
- **Testes:** 7 suítes / 75 testes — todos verdes em ~5,4s.
- **Console no preview:** apenas o erro esperado `Invalid Refresh Token: Refresh Token Not Found` (sessão expirada, sem ação requerida).
- **Edge functions com problemas reais nos últimos 7 dias:** somente `extract-edital-fields` (9 warns: 1 `auth_error`, 6 `no_fields_extracted`, 2 `invalid_json`). Nenhuma 5xx.

Resumo: a base está estável. Os riscos abaixo são de manutenção, segurança e performance — não bloqueiam o produto hoje.

---

## 2. Riscos altos (recomendo tratar nos próximos ciclos)

### 2.1. Linter Supabase: 28 warnings de SECURITY DEFINER expostas
- 1 `extension in public` + 27 `SECURITY DEFINER` executáveis por `anon`/`authenticated`.
- 9 dessas funções são realmente públicas/legítimas (ex.: `get_public_profile`, `get_public_profile_ratings`, `get_genre_reference_examples`, `find_nearest_reference_tracks`, `count_reference_tracks_by_genre`, `report_reference_coverage` — esta última já valida `has_role admin` no corpo).
- As 18 restantes (`authenticated`) provavelmente também são intencionais (`list_user_applications`, `get_member_projects`, `get_extract_metrics`, etc.) mas o **EXECUTE** não está sendo revogado de quem não deveria chamar. Padrão recomendado: `REVOKE EXECUTE … FROM public/anon` e conceder apenas a `authenticated` (ou `service_role`) caso a caso.

### 2.2. Privacidade financeira (regra core do projeto)
- O guard de "guest nunca vê financeiro" está implementado via RLS + RPCs `SECURITY DEFINER`. Não vi vazamento no client (busquei `from("transactions")` — só aparece em `ProjectContext.tsx`, contexto do dono).
- Mas vale uma auditoria explícita: confirmar que **nenhuma** das 18 SECURITY DEFINER de `authenticated` retorna campos de `transactions`/`fee`/`valor_aprovado` para usuários que não são dono.

### 2.3. `extract-edital-fields` — qualidade do output
- `no_fields_extracted` (6 ocorrências) e `invalid_json` (2) representam ~89% das falhas na semana. Hoje retornam **HTTP 200** com `cause` no payload — o frontend já mapeia isso pro retry e pro purge depois de 3 tentativas (implementado no último ciclo). Funcionalmente OK, mas duas coisas mereceriam atenção:
  - **Métricas:** o RPC `get_extract_metrics` existe mas a retry loop conta cada attempt como evento; vale conferir se o `attempt` está sendo enviado pelo frontend (o RPC depende disso para calcular `retry_rate`).
  - **Prompt do Perplexity:** taxa de `no_fields_extracted` sugere que o modelo está achando a página do edital mas devolvendo descrição em vez de JSON. Vale enviar exemplos few-shot ou forçar JSON mode quando disponível.

---

## 3. Riscos médios (dívida técnica)

### 3.1. Arquivos gigantes (refactor recomendado)
- `src/components/music-dna/MusicDNAAnalyzer.tsx` — **1.990 linhas**
- `src/pages/Projects.tsx` — 1.380
- `src/pages/FinancialTracker.tsx` — 1.174
- `src/pages/Admin.tsx` — 998
- `src/pages/EditalInscricao.tsx` — 826
- `src/pages/PalcoProposta.tsx` — 748
- `src/hooks/useMusicDNA.ts` — 731
- `src/pages/Carreira.tsx` — 730
- `src/contexts/ProjectContext.tsx` — 598 (concentra projects + transactions + mix_tracks + members + professionals — é o single-point-of-failure do app)

Sugestão: quebrar `ProjectContext` em sub-providers (`ProjectsProvider`, `ProjectFinanceProvider`, `ProjectTeamProvider`) reduziria re-renders e isolaria escopos de RLS.

### 3.2. Uso de `: any` (53 ocorrências em ~38 arquivos)
Volume não-crítico, mas vale tipar gradualmente — sobretudo em hooks que tocam o banco (`useRascunhoEdital`, `useEditalAI`, `useMusicDNA`).

### 3.3. Console.log em produção
53 ocorrências de `console.{log,error,warn}` em 38 arquivos. Vários parecem debug esquecido (storage upload, chat, AI). Recomendação: centralizar via `lib/logger.ts` que vira no-op em prod.

### 3.4. React Router v6 → v7
Testes mostram avisos `v7_startTransition` e `v7_relativeSplatPath`. Migrar agora evita refactor maior depois.

---

## 4. Riscos baixos / observações

- **Bundle:** sem `dist` no sandbox para medir, mas o `types.ts` do Supabase (2.969 linhas, ~auto-gerado) e o `MusicDNAAnalyzer` puxam muito código. Lazy-loading já está bem aplicado em `App.tsx`.
- **Service worker (`public/sw.js`)** existe mas não vi testes de versionamento — risco baixo de cache stale em deploy.
- **i18n PT/EN:** memória diz que o sistema é bilíngue, mas vários `toast()` em hooks têm strings hardcoded em PT (`useRascunhoEdital`, `useMatchEditais`). Pequena inconsistência.
- **Rotas legadas** (`/editais`, `/palcos`, `/master`) já estão redirecionando corretamente — coberto por testes.

---

## 5. Prioridades sugeridas

| # | Tema | Esforço | Impacto |
|---|---|---|---|
| 1 | Revogar EXECUTE das 18 SECURITY DEFINER `authenticated` que não precisam ser expostas | Médio | Alto (segurança) |
| 2 | Auditar RLS/RPC contra vazamento financeiro para guests | Baixo | Alto (regra core) |
| 3 | Melhorar prompt do `extract-edital-fields` para reduzir `no_fields_extracted` | Baixo | Médio (UX) |
| 4 | Quebrar `ProjectContext` em sub-providers | Médio | Médio (perf + DX) |
| 5 | Refatorar `MusicDNAAnalyzer.tsx` em sub-componentes | Alto | Médio (manutenção) |
| 6 | Centralizar logger e remover `console.*` espalhados | Baixo | Baixo |
| 7 | Migrar future flags do React Router v7 | Baixo | Baixo |

---

Se quiser, posso aprofundar qualquer um desses itens (ex.: listar exatamente quais SECURITY DEFINER deveriam ter EXECUTE revogado, ou abrir o `MusicDNAAnalyzer` e propor o split) — só me dizer por onde começar.
