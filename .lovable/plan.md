## Objetivo

Encurtar drasticamente o onboarding (de 6 para 2 passos) e limpar o dashboard de elementos derivados de "momento" e "dor" que deixam de existir.

## Mudanças

### 1. Onboarding (`src/pages/Onboarding.tsx`) — reescrito

Apenas **1 passo de formulário + 1 confirmação opcional** (recomendo eliminar a tela de confirmação — é só 4 campos):

Campos coletados:
- **Nome completo** (novo, obrigatório) → coluna `full_name`
- **Nome artístico** (obrigatório) → `display_name`
- **WhatsApp** (obrigatório, máscara BR) → `whatsapp`
- **Email** (somente leitura, pré-preenchido com `user.email`) → exibido como confirmação visual, não enviado
- Combo "Eu sou…" **REMOVIDO** (decisão: manter `user_type='artist'` fixo, conforme memória)

Campos REMOVIDOS:
- Momento (`current_moment`)
- Tipo de projeto (`projectType`) e nome do projeto inicial
- Dor principal (`main_pain`)
- Modo (`track_view_mode`) — assume default `basic`
- Estado/cidade — sai do onboarding (continua editável em Configurações)
- Bloco "Vamos criar / Plano inicial"

Efeitos colaterais:
- **Não cria projeto automático** nem tarefas iniciais (`MOMENT_TASKS`/`PAIN_TASKS` ficam mortos — manter os mapas no arquivo apenas se usados em outro lugar; remover se órfãos).
- `updateProfile` salva: `full_name`, `display_name`, `whatsapp`, `user_type:'artist'`, `track_view_mode:'basic'`, `onboarding_version: 3`, `onboarding_completed: true`.
- Redireciona para `/dashboard`.
- Mantém analytics `onboarding_completed` (sem campos descontinuados).

### 2. Banco — migration

Adicionar coluna `full_name TEXT NOT NULL DEFAULT ''` em `profiles`. Demais colunas (`current_moment`, `main_pain`, `track_view_mode`) permanecem para não quebrar dados antigos / outros consumidores; deixarão de ser preenchidas em novos cadastros.

### 3. Dashboard — remover hero

- `src/pages/Dashboard.tsx`: remover import e uso de `HeroFocusCard` (linhas ~32 e ~333) e qualquer `nextAction`/`onResolveNextAction` que existia só para alimentá-lo.
- Apagar `src/components/dashboard/HeroFocusCard.tsx`.
- Conferir `src/lib/journeyPersonalization.ts` — se só era consumido pelo HeroFocusCard, remover; senão manter.
- Layout do dashboard começa direto pelos blocos seguintes (FirstRunEmptyState segue intacto para usuários sem projetos).

### 4. Onboarding convidado

`src/pages/OnboardingGuest.tsx` será revisado para alinhar à nova lista de campos (mesmos 3 + email read-only), sem papel/momento/dor.

## Detalhes técnicos

- WhatsApp: máscara `(99) 99999-9999`, validação simples (10–11 dígitos). Sem verificação por SMS.
- `ProfileContext` exporta um `full_name` opcional; tipos vêm do regenerador automático após a migration.
- `onboarding_version: 3` permite migrar usuários antigos no futuro se quisermos forçar coleta de `full_name`.
- Remoções no Onboarding apagam: `MOMENTS`, `PROJECT_TYPES`, `MODES`, `PAINS`, `PROJECT_NAME_MAP`, `TRACK_TEMPLATES`, `MOMENT_TASKS`, `PAIN_TASKS`, `SummaryRow`, e `addProject`/`useProjects` import.

## Fora de escopo

- Backfill de `full_name` para perfis existentes (ficam com string vazia até o próprio usuário editar).
- Reformular Configurações para expor edição dos novos campos (já existe edição de perfil; só somar `full_name` ali em outra iteração se necessário).
- Mexer em `current_moment`/`main_pain` em outros módulos que ainda os leiam — ficam com fallback ("organization" / "").
