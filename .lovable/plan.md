
User wants to improve the UX when hitting the daily/weekly AI generation limit. Currently in `generate-creative/index.ts` it returns plain error strings. Let me check how the frontend surfaces these.

Quick scan: errors return as `{ error: "Limite diário de 20..." }` with status 429. The frontend likely shows via `toast.error(err.error)` — a fleeting toast that doesn't help the user understand or act.

Better UX: structured response (limit type, count, reset time) + dedicated UI (modal/alert) explaining what hit, when it resets, and what they can do meanwhile. Apply same treatment to other AI endpoints.

# Melhorar resposta ao atingir limite de gerações de IA

## Diagnóstico
Hoje, ao bater 20 gerações diárias ou 80 semanais no `/criativo`:
- Edge function retorna `{ error: "Limite diário de 20 gerações atingido. Tente novamente amanhã." }` com status 429
- Frontend mostra um **toast vermelho** que some em 4s
- Usuário fica sem entender: quanto faltava? quando reseta? o que fazer agora?
- Mesma fragilidade existe em `music-dna-analyze`, `edital-ai-assistant`, `ai-task-assistant`, `project-ai-assistant`

## Mudanças

### 1. Edge function `generate-creative` — resposta estruturada
Trocar a string solta por payload rico:
```json
{
  "error": "rate_limit",
  "limit_type": "daily",         // "daily" | "weekly"
  "limit": 20,
  "used": 20,
  "resets_at": "2026-04-17T03:00:00Z",  // próximo midnight local BR
  "message": "Você usou todas as 20 gerações de hoje."
}
```
Calcular `resets_at` no servidor (próxima 00:00 BRT para diário, próximo domingo 00:00 BRT para semanal).

### 2. Novo componente `RateLimitDialog.tsx`
Modal (não toast) que aparece quando 429 vem com `error: "rate_limit"`. Mostra:
- **Ícone** ⏱ + título "Limite de gerações atingido"
- **Frase clara**: "Você usou suas 20 gerações de hoje" / "Você usou suas 80 gerações desta semana"
- **Countdown ao vivo** até `resets_at`: "Reseta em **14h 23min**" (atualiza a cada minuto)
- **Barra de progresso** mostrando 20/20 (visual do consumo)
- **O que fazer enquanto isso** (lista curta):
  - "Refine prompts para os próximos lotes"
  - "Use as artes já geradas na Galeria"
  - "Volte amanhã às 00h"
- **Botões**: "Ver Galeria" (link `#gallery`) + "Fechar"

Sem CTA de upgrade — alinhado com a memória "MVP validation phase: all users have Pro access".

### 3. Hook `useRateLimitDialog`
Estado global leve (Zustand já está no projeto? Se não, Context simples) para qualquer página abrir o dialog passando o payload do 429. Evita duplicar a UI em cada página.

### 4. Atualizar `useCreativeAssets.ts`
No catch do `generate`, detectar `error: "rate_limit"` no JSON e chamar `openRateLimitDialog(payload)` em vez de `toast.error`. Manter toast como fallback para outros erros (402, 500 etc.).

### 5. Aplicar mesmo padrão (mesmo dialog + payload) em
- `supabase/functions/music-dna-analyze/index.ts` (se tiver quota — verificar)
- `supabase/functions/edital-ai-assistant/index.ts`
- `supabase/functions/ai-task-assistant/index.ts`
- `supabase/functions/project-ai-assistant/index.ts`

E nos hooks/components que consomem esses endpoints, trocar `toast.error` pelo `openRateLimitDialog`.

### 6. Indicador preventivo (bonus pequeno)
No `/criativo`, mostrar um **chip discreto** acima do botão "Gerar" quando o usuário passar de **15/20 diárias**: "5 gerações restantes hoje". Vem de uma chamada GET nova `/functions/v1/ai-quota-status` (ou inferido das próprias respostas — armazenar em context após cada geração bem-sucedida).

## Arquivos
- **Modificar**: `supabase/functions/generate-creative/index.ts` (payload estruturado + cálculo de `resets_at`)
- **Modificar**: `supabase/functions/music-dna-analyze/index.ts`, `edital-ai-assistant/index.ts`, `ai-task-assistant/index.ts`, `project-ai-assistant/index.ts` (mesmo padrão — só onde já há checagem de quota)
- **Criar**: `src/components/ai/RateLimitDialog.tsx`
- **Criar**: `src/hooks/useRateLimitDialog.ts` (context + provider)
- **Modificar**: `src/App.tsx` (montar `<RateLimitDialogProvider>` + `<RateLimitDialog />` global)
- **Modificar**: `src/hooks/useCreativeAssets.ts` + outros hooks consumidores
- **Modificar**: `src/pages/Creative.tsx` (chip "X restantes" acima do botão gerar)

## Sem migrações
Quota já é calculada via `ai_invocations` existente. Sem mudança de schema.

## Fora do escopo
- Aumentar os limites (20/80) — é decisão de produto, não UX
- Sistema de créditos pagos / upgrade — MVP é flat Pro
- Notificação push quando o limite resetar
