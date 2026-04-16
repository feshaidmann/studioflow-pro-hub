# StudioFlow Pro — Documentação Técnica para Auditoria Externa

> **Versão:** 3.1  
> **Data:** Abril 2026  
> **Classificação:** Documento técnico para auditoria  
> **Mantido por:** Fernando Shaidmann (admin)  
> **URL publicada:** `https://studioflow-pro-hub.lovable.app`

---

## Sumário

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Arquitetura da Aplicação](#3-arquitetura-da-aplicação)
4. [Modelo de Dados (Banco de Dados)](#4-modelo-de-dados-banco-de-dados)
5. [Políticas de Segurança (RLS)](#5-políticas-de-segurança-rls)
6. [Autenticação e Controle de Acesso](#6-autenticação-e-controle-de-acesso)
7. [Edge Functions (Backend Serverless)](#7-edge-functions-backend-serverless)
8. [Integrações de Inteligência Artificial](#8-integrações-de-inteligência-artificial)
9. [Módulo de Checklist e Tarefas](#9-módulo-de-checklist-e-tarefas)
10. [Módulos Funcionais](#10-módulos-funcionais)
11. [Fluxo de Convites e Colaboração](#11-fluxo-de-convites-e-colaboração)
12. [Armazenamento de Arquivos](#12-armazenamento-de-arquivos)
13. [Comunicação em Tempo Real](#13-comunicação-em-tempo-real)
14. [Painel Administrativo](#14-painel-administrativo)
15. [Internacionalização (i18n)](#15-internacionalização-i18n)
16. [Conformidade e Privacidade](#16-conformidade-e-privacidade)
17. [Infraestrutura e Deploy](#17-infraestrutura-e-deploy)
18. [Inventário de Secrets e Variáveis](#18-inventário-de-secrets-e-variáveis)
19. [Matriz de Riscos Conhecidos](#19-matriz-de-riscos-conhecidos)
20. [Changelog de Correções (v3.0)](#20-changelog-de-correções-v30)
21. [Changelog v3.1](#21-changelog-v31)

---

## 1. Visão Geral do Produto

O **StudioFlow Pro** é uma plataforma SaaS de gestão para **artistas independentes** do setor musical. O sistema centraliza:

- Gestão de projetos musicais (singles, EPs, álbuns) com workflow de 6 estágios
- Controle financeiro completo (receitas, despesas, contratos, status de pagamento)
- Agenda de eventos com integração a projetos
- Gerenciamento de equipe e profissionais colaboradores
- Análise técnica de masters (LUFS, compatibilidade com plataformas de streaming)
- Análise de DNA Musical via IA (características sonoras de faixas)
- Checklist inteligente com tarefas geradas automaticamente por IA e regras configuráveis
- **Módulo de Editais** — busca, match e inscrição em editais de fomento cultural com assistência de IA
- **Módulo Criativo** — geração de artes visuais, capas e legendas com IA generativa
- Convites digitais para colaboração em projetos e na plataforma
- Perfil público com portfólio e avaliações
- Chat em tempo real dentro de projetos
- Interface bilíngue (Português / Inglês)

**Fase atual:** Beta pública com acesso Pro liberado para todos os usuários durante o período de validação.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React + TypeScript + Vite | React 18.3, Vite 5.4 |
| **Estilização** | Tailwind CSS + shadcn/ui + Radix UI | Tailwind 3.4 |
| **Roteamento** | React Router DOM | v6.30 |
| **Estado/Cache** | TanStack React Query + Context API | React Query v5.83 |
| **Formulários** | React Hook Form + Zod | RHF 7.61, Zod 3.25 |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions + Storage) | supabase-js 2.97 |
| **Edge Functions** | Deno Runtime (Supabase Functions) | — |
| **IA** | Lovable AI Gateway (Google Gemini / OpenAI GPT-5) | — |
| **Gráficos** | Recharts | 2.15 |
| **Analytics** | PostHog | 1.363 |
| **Notificações** | Sonner (toast) + Web Push API | — |
| **Build/Deploy** | Lovable Cloud (CI/CD automático) | — |

---

## 3. Arquitetura da Aplicação

### 3.1 Estrutura de Diretórios

```
src/
├── pages/              # 25 telas (rotas)
├── components/         # Componentes reutilizáveis
│   ├── ui/             # 50+ primitivos shadcn/ui
│   ├── finance/        # Cards e formulários financeiros
│   ├── agenda/         # Componentes de agenda
│   ├── editais/        # Assistente IA, checklist, métricas de editais
│   ├── creative/       # Gerador de artes, galeria, templates
│   ├── music-dna/      # Analisador de DNA Musical
│   ├── dashboard/      # Componentes do dashboard
│   └── project-hub/    # Abas e componentes de detalhe do projeto
├── contexts/           # 4 contextos (Auth, Profile, Project, Language)
├── hooks/              # 25+ hooks customizados
├── constants/          # Categorias de transações
├── lib/                # Utilitários (análise de áudio, analytics, detecção de instrumentos)
├── integrations/
│   ├── supabase/       # Client e types (gerados automaticamente)
│   └── lovable/        # Integração com Lovable AI
└── data/               # Dados mock para demonstração

supabase/
├── functions/          # 18 Edge Functions
├── migrations/         # Migrações SQL
└── config.toml         # Configuração de funções
```

### 3.2 Contextos React

| Contexto | Arquivo | Responsabilidade |
|----------|---------|-----------------|
| `AuthContext` | `AuthContext.tsx` | Estado de autenticação, sessão, listeners de auth |
| `ProfileContext` | `ProfileContext.tsx` | Perfil do usuário, `needsProfileSetup`, plano, `isPro` |
| `ProjectContext` | `ProjectContext.tsx` | Projeto selecionado, tracks de mix, CRUD de tracks |
| `LanguageContext` | `LanguageContext.tsx` | Idioma ativo (PT/EN), função `t()` para traduções |

### 3.3 Hooks Customizados

| Hook | Responsabilidade |
|------|-----------------|
| `useAIConversations` | CRUD de conversas e mensagens do assistente IA |
| `useAdminRole` | Verificação de role admin via `has_role()` RPC |
| `useApplicationDocs` | Documentos de inscrição de editais |
| `useCreativeAssets` | CRUD de artes geradas pelo módulo criativo |
| `useEditais` | CRUD de editais encontrados |
| `useEditalAI` | Assistente IA contextual para editais |
| `useEditalApplications` | Inscrições em editais |
| `useEditalDocuments` | Banco de documentos reutilizáveis para editais |
| `useEvents` | CRUD de eventos de agenda |
| `useFontesEditais` | Fontes de busca de editais |
| `useMatchEditais` | Match de editais com perfil cultural |
| `useMusicDNA` | Análise de DNA Musical (upload + edge function) |
| `useNotifications` | Leitura e marcação de notificações |
| `useProfessionals` | CRUD de profissionais na agenda pessoal |
| `useProjectAlerts` | Alertas de risco em projetos |
| `useProjectChat` | Mensagens em tempo real de projetos |
| `useProjectFiles` | Arquivos do projeto |
| `usePushNotifications` | Gerenciamento de subscriptions Web Push |
| `useRascunhoEdital` | Rascunhos de inscrição em editais |
| `useReleaseChecklist` | Checklist de lançamento com 7 seções |
| `useSavedAnalyses` | Histórico de análises de DNA Musical |
| `useTaskRules` | CRUD de regras configuráveis de tarefas |
| `useTasks` | Tarefas manuais e automáticas com deduplicação via `upsert` |
| `useTrackTemplates` | Templates reutilizáveis de tracks de mix |
| `use-mobile` | Detecção de viewport mobile |
| `use-toast` | Proxy para sistema de toasts |

### 3.4 Fluxo de Navegação

```
/ (Welcome — landing page pública)
├── /auth (Login / Signup / Esqueci senha)
│     └── Verificação de e-mail (obrigatória)
│           └── /onboarding (configuração de perfil — obrigatório na 1ª vez)
│                 └── /dashboard (app principal — rotas protegidas)
├── /u/:username (Perfil público — sem autenticação)
├── /invite/:token (Resposta a convite de projeto — sem autenticação)
├── /platform-invite/:token (Resposta a convite de plataforma — sem autenticação)
├── /legal (Termos de Uso e Política de Privacidade)
└── /* (Catch-all → redireciona para /dashboard)
```

### 3.5 Rotas Protegidas

Todas as rotas abaixo exigem autenticação + perfil configurado (`onboarding_completed = true`):

| Rota | Módulo |
|------|--------|
| `/dashboard` | Central de controle |
| `/projects` | Listagem de projetos |
| `/projects/:id` | Detalhes e chat do projeto |
| `/finance` | Controle financeiro |
| `/agenda` | Agenda de eventos |
| `/professionals` | Rede de profissionais |
| `/editais` | Busca e gestão de editais de fomento |
| `/editais/inscricao` | Inscrição assistida por IA em editais |
| `/criativo` | Geração de artes e legendas com IA |
| `/music-dna` | Análise de DNA Musical |
| `/settings` | Configurações do perfil |
| `/perfil` | Perfil do freelancer |
| `/tutorial` | Guia de uso |
| `/admin` | Painel administrativo (apenas admin) |
| `/upgrade` | Tela de planos |

---

## 4. Modelo de Dados (Banco de Dados)

### 4.1 Diagrama de Tabelas

O banco PostgreSQL possui **31 tabelas** com RLS ativado em todas. Segue o inventário:

#### Tabelas de Domínio Principal

| Tabela | Registros-chave | FK | Descrição |
|--------|----------------|-----|-----------|
| `profiles` | `id` (= auth.users.id) | — | Perfil do usuário (nome, tipo, plano, cidade, especialidades, avatar) |
| `projects` | `id`, `user_id` | — | Projetos musicais com metadados, estágio, financeiro, `perfil_cultural` |
| `mix_tracks` | `id`, `project_id`, `user_id` | `projects.id` | Tracks de mixing (gain, EQ, compressor, músico, cachê) |
| `transactions` | `id`, `user_id`, `project_id` | `projects.id` | Transações financeiras (receitas/despesas) |
| `events` | `id`, `user_id`, `project_id` | `projects.id` | Eventos de agenda |
| `tasks` | `id`, `user_id`, `project_id` | `projects.id` | Tarefas manuais e automáticas (com soft-delete via `dismissed`). Possui **unique index parcial** em `(user_id, source_key) WHERE source_key != ''` para evitar duplicação. |
| `task_rules` | `id`, `user_id` | — | Regras configuráveis de geração automática de tarefas |
| `professionals` | `id`, `user_id` | — | Agenda pessoal de profissionais |
| `professional_ratings` | `id`, `user_id`, `project_id` | `projects.id` | Avaliações de profissionais |

#### Tabelas de Editais e Fomento

| Tabela | Descrição |
|--------|-----------|
| `editais` | Editais de fomento cultural encontrados (título, órgão, prazo, área, status, link) |
| `edital_applications` | Inscrições em editais (status, projeto vinculado, valor aprovado, resultado) |
| `edital_application_docs` | Documentos individuais de cada inscrição |
| `edital_documents` | Banco de documentos reutilizáveis (bio, currículo, portfólio) |
| `rascunhos_editais` | Rascunhos de inscrição com campos JSON e progresso |
| `alertas_editais` | Alertas de novos editais compatíveis |
| `fontes_editais` | Fontes configuráveis de busca de editais |

#### Tabelas de Criativo

| Tabela | Descrição |
|--------|-----------|
| `creative_assets` | Artes geradas (prompt, estilo, formato, dimensões, URL pública) |

#### Tabelas de Colaboração

| Tabela | Descrição |
|--------|-----------|
| `project_invitations` | Convites a profissionais para projetos (token único, validade 7 dias) |
| `project_members` | Membros confirmados em projetos |
| `project_messages` | Chat em tempo real dentro de projetos |
| `project_files` | Arquivos do projeto (stems, mixes, capas, contratos) |
| `platform_invitations` | Convites para a plataforma StudioFlow |

#### Tabelas de IA e Análise

| Tabela | Descrição |
|--------|-----------|
| `ai_conversations` | Conversas do assistente IA |
| `ai_messages` | Mensagens individuais das conversas IA |
| `ai_invocations` | Log de chamadas à API de IA (custo, modelo, tokens, status) |
| `music_dna_analyses` | Análises de DNA musical salvas |
| `music_dna_feedback` | Feedback de usuários sobre análises de DNA |

#### Tabelas de Suporte

| Tabela | Descrição |
|--------|-----------|
| `user_roles` | Roles separadas do perfil (`admin`, `user`) — segurança por design |
| `track_templates` | Templates reutilizáveis de tracks |
| `template_tracks` | Tracks individuais dentro de templates |
| `notifications` | Notificações in-app |
| `push_subscriptions` | Assinaturas Web Push (endpoint, p256dh, auth) |
| `beta_feedback` | Feedback dos usuários durante o beta |
| `function_logs` | Logs de execução de Edge Functions |
| `page_views` | Rastreamento de visualização de páginas |
| `release_checklists` | Checklist de lançamento por projeto (itens JSON) |

### 4.2 Constraints e Índices Notáveis

| Tabela | Tipo | Definição | Propósito |
|--------|------|-----------|-----------|
| `tasks` | Unique Index (parcial) | `(user_id, source_key) WHERE source_key != ''` | Impede duplicação de tarefas auto-geradas |
| `user_roles` | Unique | `(user_id, role)` | Impede roles duplicadas |

### 4.3 Campos Sensíveis

| Tabela | Campos | Classificação |
|--------|--------|---------------|
| `profiles` | `public_email`, `whatsapp`, `city` | PII |
| `professionals` | `name`, `email`, `phone` | PII |
| `project_invitations` | `professional_email`, `token` | PII + Segredo |
| `platform_invitations` | `invitee_email`, `token` | PII + Segredo |
| `push_subscriptions` | `endpoint`, `p256dh`, `auth` | Credencial |

### 4.4 Função de Segurança

```sql
-- SECURITY DEFINER: evita recursão em políticas RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### 4.5 Funções de Banco de Dados

| Função | Tipo | Descrição |
|--------|------|-----------|
| `has_role(_user_id, _role)` | SECURITY DEFINER | Verifica role do usuário sem recursão RLS |
| `get_member_projects()` | RPC | Retorna projetos onde o usuário é membro |
| `get_project_for_member(p_project_id)` | RPC | Retorna dados de um projeto específico para um membro |
| `get_professional_project_count(p_email, p_name)` | RPC | Conta projetos de um profissional |
| `get_public_profile(p_username)` | RPC | Retorna perfil público por username |
| `get_public_profile_ratings(p_profile_id)` | RPC | Retorna média de avaliações de um perfil |
| `get_public_profile_history(p_email)` | RPC | Retorna histórico de projetos de um profissional |
| `get_auth_email()` | RPC | Retorna e-mail do usuário autenticado |
| `get_file_download_url(p_file_id)` | RPC | Retorna URL de download de um arquivo |

---

## 5. Políticas de Segurança (RLS)

**Total de políticas:** 48+ políticas RLS + 4 políticas de Storage.

### 5.1 Padrão Base

A maioria das tabelas segue o padrão de isolamento por usuário:
```sql
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

### 5.2 Políticas por Tabela

#### Tabelas com acesso estritamente próprio (padrão `auth.uid() = user_id`)

| Tabela | Operações |
|--------|-----------|
| `tasks` | ALL |
| `task_rules` | ALL |
| `notifications` | ALL |
| `push_subscriptions` | ALL |
| `ai_conversations` | ALL |
| `ai_messages` | ALL |
| `music_dna_analyses` | ALL (authenticated only) |
| `music_dna_feedback` | ALL |
| `professional_ratings` | ALL |
| `track_templates` | ALL |
| `editais` | ALL |
| `edital_applications` | ALL |
| `edital_application_docs` | ALL |
| `edital_documents` | ALL |
| `rascunhos_editais` | ALL |
| `alertas_editais` | ALL |
| `fontes_editais` | ALL |
| `creative_assets` | ALL |
| `release_checklists` | ALL |
| `events` | SELECT, INSERT, UPDATE, DELETE (separados) |
| `transactions` | SELECT, INSERT, UPDATE, DELETE (separados) |
| `mix_tracks` | SELECT, INSERT, UPDATE, DELETE (separados) |
| `projects` | SELECT, INSERT, UPDATE, DELETE (separados) |

#### Tabelas com regras especiais

| Tabela | Política | Condição |
|--------|---------|----------|
| `profiles` | Leitura própria | `auth.uid() = id` |
| `profiles` | Leitura pública | `allow_global_listing = true` (anon + authenticated) |
| `profiles` | INSERT/UPDATE | `auth.uid() = id` |
| `professionals` | Leitura | `auth.uid() = user_id OR allow_global_listing = true` (authenticated) |
| `professionals` | INSERT/UPDATE/DELETE | `auth.uid() = user_id` |
| `project_invitations` | SELECT público | `true` (necessário para fluxo de resposta por token) |
| `project_invitations` | ALL por dono | `auth.uid() = invited_by` |
| `platform_invitations` | SELECT público | `true` (necessário para fluxo de resposta por token) |
| `platform_invitations` | ALL por dono | `auth.uid() = invited_by` |
| `project_members` | ALL | `auth.uid() = user_id` |
| `project_messages` | SELECT | Autor, dono do projeto ou membro do projeto |
| `project_messages` | INSERT | `auth.uid() = user_id` |
| `template_tracks` | ALL | Verifica via JOIN se o template pertence ao usuário |
| `user_roles` | SELECT apenas | `auth.uid() = user_id` |
| `function_logs` | SELECT | `has_role(auth.uid(), 'admin')` |
| `beta_feedback` | INSERT | `auth.uid() = user_id` |
| `beta_feedback` | SELECT | Próprio ou admin (`has_role`) |
| `ai_invocations` | SELECT | `has_role(auth.uid(), 'admin')` |

### 5.3 Políticas de Storage

| Bucket | Acesso | Política |
|--------|--------|----------|
| `avatars` | Público (leitura) | Qualquer usuário pode ler |
| `avatars` | Upload/Update/Delete | Restrito à pasta `{auth.uid()}/` via `storage.foldername()` |
| `project-files` | Leitura/Upload | Restrito a membros e donos do projeto |

---

## 6. Autenticação e Controle de Acesso

### 6.1 Métodos de Autenticação

| Método | Status | Observações |
|--------|--------|-------------|
| E-mail + Senha | ✅ Ativo | Verificação de e-mail obrigatória |
| Google OAuth | ✅ Ativo | Redireciona para `/dashboard` ou `/onboarding` |
| Recuperação de senha | ✅ Ativo | Via link por e-mail |

### 6.2 Fluxo de Sessão

- **Armazenamento:** `localStorage` (padrão Supabase Auth)
- **Refresh:** Automático via `supabase-js`
- **Listener:** `onAuthStateChange` em `AuthContext` atualiza estado global
- **Analytics:** `identifyUser(userId)` chamado no login; `resetAnalytics()` no logout

### 6.3 Controle de Acesso por Role

| Role | Descrição | Verificação |
|------|-----------|-------------|
| `user` | Usuário padrão | Implícito (sem verificação necessária) |
| `admin` | Administrador da plataforma | `useAdminRole()` → consulta `user_roles` → `has_role()` SECURITY DEFINER |

**Princípio:** Roles são armazenadas em tabela separada (`user_roles`), nunca no perfil, para evitar ataques de escalação de privilégio.

### 6.4 Proteção de Rotas (Frontend)

```
ProtectedRoute
├── Verifica user (auth state)
├── Verifica needsProfileSetup:
│     ├── profile === null && !loading && !!user → requer setup
│     └── profile !== null && !onboarding_completed → requer setup
├── Redireciona para /auth se não autenticado
└── Redireciona para /onboarding se perfil incompleto ou inexistente
```

**Nota (v3.0):** O tratamento de `profile === null` foi adicionado para cobrir o caso de novos usuários via Google OAuth cujo trigger de criação de perfil falhou.

### 6.5 Proteção de Edge Functions

Todas as Edge Functions usam `verify_jwt = false` no `config.toml` e realizam validação manual do token JWT:

```typescript
// Padrão em todas as funções que exigem autenticação
const authHeader = req.headers.get("Authorization");
const { data: { user } } = await anonClient.auth.getUser(token);
const userId = user.id;
```

Para funções administrativas (ex: `admin-stats`), há verificação adicional de role via `SERVICE_ROLE_KEY`:
```typescript
const { data: roleData } = await adminClient
  .from("user_roles")
  .select("role")
  .eq("user_id", userId)
  .eq("role", "admin")
  .maybeSingle();
```

---

## 7. Edge Functions (Backend Serverless)

### 7.1 Inventário de Funções

| Função | Auth | Descrição | Modelo IA |
|--------|------|-----------|-----------|
| `admin-stats` | JWT + role admin | Agrega métricas da plataforma (usuários, projetos, custos de IA) | — |
| `ai-task-assistant` | JWT | Chat de IA contextual com dados do usuário | Gemini 3 Flash Preview |
| `audio-analyze` | JWT | Análise técnica de áudio (LUFS, peak, streaming compatibility) | — |
| `edital-ai-assistant` | JWT | Assistente IA contextual para editais (dúvidas, redação) | Gemini 3 Flash Preview |
| `edital-monitor` | JWT | Monitoramento de novas publicações de editais | — |
| `edital-search` | JWT | Busca de editais em fontes configuradas | Gemini (via Lovable AI) |
| `extract-edital-fields` | JWT | Extração automática de campos de formulário de editais | Gemini (via Lovable AI) |
| `generate-creative` | JWT | Geração de artes visuais com IA generativa | Gemini Image Preview |
| `generate-daily-tasks` | JWT | Geração automática de tarefas para o usuário autenticado | Gemini 3 Flash Preview |
| `match-editais` | JWT | Match de editais com perfil cultural do projeto | — |
| `music-dna-analyze` | JWT | Análise de DNA Musical de faixas | Gemini (via Lovable AI) |
| `project-ai-assistant` | JWT | Assistente IA contextual dentro de projetos | Gemini 3 Flash Preview |
| `respond-to-invite` | Público (token) | Processa resposta a convite de projeto (aceite/recusa) | — |
| `respond-to-platform-invite` | Público (token) | Processa resposta a convite de plataforma | — |
| `search-platform-professionals` | Público | Busca global de profissionais com `allow_global_listing = true` | — |
| `send-project-invite` | JWT | Envia convite por e-mail a profissional (link tokenizado) | — |
| `send-platform-invite` | JWT | Envia convite para ingressar na plataforma | — |
| `send-push-notification` | JWT | Envia notificação push via Web Push API | — |

### 7.2 Configuração (`config.toml`)

Todas as funções estão configuradas com `verify_jwt = false` para permitir validação manual de tokens no código, possibilitando fluxos públicos (convites) e fluxos autenticados no mesmo runtime.

### 7.3 Rastreamento de Custos de IA

Cada chamada à API de IA é registrada na tabela `ai_invocations` com:
- `function_name`: função que originou a chamada
- `model`: modelo utilizado (ex: `google/gemini-3-flash-preview`)
- `tokens_input` / `tokens_output`: contagem de tokens
- `cost_usd`: custo estimado em USD
- `status`: `success` ou `error`
- `user_id`: usuário que originou (nullable para chamadas de sistema)

---

## 8. Integrações de Inteligência Artificial

### 8.1 Modelos Utilizados

| Modelo | Uso Principal | Gateway |
|--------|--------------|---------|
| `google/gemini-3-flash-preview` | Assistente IA, geração de tarefas, assistente de editais | Lovable AI |
| `google/gemini-2.5-pro` | Análises complexas (quando necessário) | Lovable AI |
| `google/gemini-3-pro-image-preview` | Geração de artes visuais no módulo Criativo | Lovable AI |

**Autenticação:** Chave `LOVABLE_API_KEY` gerenciada automaticamente pelo Lovable Cloud. Não requer API key do usuário.

### 8.2 Assistente IA (Dashboard)

- Chat contextual com histórico persistente (`ai_conversations` + `ai_messages`)
- Contexto injetado: projetos ativos, tarefas pendentes, finanças do usuário
- Sugestões de ações baseadas no contexto
- Chip "Dúvida técnica" para modo engenheiro de áudio
- Isolamento por `user_id` em todas as tabelas de conversa

### 8.3 Análise de DNA Musical

- Upload de áudio (WAV/MP3) para análise via Web Audio API + IA
- Detecção de instrumentos client-side (`src/lib/instrumentDetection.ts`) com:
  - Análise espectral em 7 bandas de frequência (sub-bass a brilliance)
  - FFT com janelas Hann e overlap de 50%
  - Métricas derivadas: spectral flux, zero-crossing rate, transient density
- Gera diagnóstico por IA com recomendações
- Feedback do usuário armazenado para refinamento
- Integração com módulo Criativo ("Criar arte com este DNA")

### 8.4 Assistente IA para Editais

- Chat contextual com dados do edital selecionado
- Ajuda a redigir justificativas, objetivos e descrições para inscrições
- Extração automática de campos de formulário de editais via IA

### 8.5 IA Contextual por Módulo

- **Projeto:** `project-ai-assistant` analisa estágio, tarefas, equipe e finanças do projeto
- **Editais:** `edital-ai-assistant` auxilia na redação e análise de editais
- **Dashboard:** `ai-task-assistant` faz análise global dos dados do artista
- Todos usam `AIMarkdownContent` para formatação padronizada das respostas

---

## 9. Módulo de Checklist e Tarefas

### 9.1 Arquitetura

O módulo de tarefas opera em dois eixos:

| Tipo | Fonte | Deduplicação |
|------|-------|-------------|
| **Tarefas manuais** | Criadas pelo usuário no Dashboard | `source_key = ''` (sem deduplicação) |
| **Tarefas automáticas** | Geradas pela edge function `generate-daily-tasks` | `source_key` único + unique index no banco |

### 9.2 Geração Automática de Tarefas

A edge function `generate-daily-tasks` processa **apenas o usuário autenticado** (extraído do JWT) e:

1. Carrega as `task_rules` ativas do usuário
2. Consulta projetos, convites, transactions e deadlines
3. Aplica regras configuráveis:

| Regra (`rule_type`) | Trigger | Parâmetros |
|---------------------|---------|------------|
| `inactivity` | Projeto sem atualização há N dias | `days` (padrão: 7) |
| `budget` | Despesas > X% da receita estimada | `threshold` (padrão: 80%) |
| `invite_pending` | Convite sem resposta há N dias | `days` (padrão: 5) |
| `deadline` | Prazo de profissional em N dias | `days` (padrão: 3) |
| `master_check` | Projeto em estágio "master" sem upload | — |
| `release` | Projeto em estágio "upload" aguardando lançamento | — |

4. Usa `upsert` com `ON CONFLICT (user_id, source_key) DO NOTHING` para evitar duplicação

### 9.3 Deduplicação

**Mecanismo de banco:** Unique index parcial `uq_tasks_user_source_key` em `(user_id, source_key) WHERE source_key != ''`.

**Mecanismo client-side:** O hook `useTasks.ensureAutoTask()` usa `.upsert()` com `{ onConflict: "user_id,source_key", ignoreDuplicates: true }` e inclui o `source_key` no payload.

### 9.4 Throttling

O Dashboard limita chamadas à edge function `generate-daily-tasks` a no máximo **uma vez por hora**, persistido via `localStorage` (chave `sfp_tasks_last_gen`).

### 9.5 Soft-delete

Tarefas removidas pelo usuário são marcadas com `dismissed = true`. Tarefas dismissed não aparecem no frontend (`fetchTasks` filtra `dismissed = false`) mas persistem no banco para evitar que a mesma `source_key` seja recriada.

---

## 10. Módulos Funcionais

### 10.1 Dashboard (`/dashboard`)

- KPIs financeiros (Receita, Investimento, Resultado, Margem)
- Checklist do Dia (tarefas manuais + automáticas via IA)
- Projetos Ativos com barra de progresso e badges de estágio
- Assistente IA (chat contextual) com chip "Dúvida técnica"
- Próximos Lançamentos

### 10.2 Projetos (`/projects`, `/projects/:id`)

**Workflow de 6 estágios com progressão fixa (constante `stagePercent` definida fora do componente):**

| Estágio | Progresso | Descrição |
|---------|-----------|-----------|
| Projeto Iniciado | 10% | Início do projeto |
| Gravação | 50% | Fase de gravação |
| Mix | 80% | Mixagem |
| Master | 90% | Masterização |
| Upload | 98% | Check de áudio e upload |
| Lançado | 100% | Projeto concluído |

- Cards com tipo (single/EP/álbum), artista, notas
- Gerenciamento de mix tracks (posição, gain, EQ, compressor, músico, cachê)
- Seção de equipe/colaboradores com sistema de convites
- Chat em tempo real (via Supabase Realtime)
- Avaliação de parceiros ao concluir projeto
- **Compartilhar via WhatsApp** — botão que gera deeplink `wa.me` com resumo do projeto
- **Checklist de Lançamento** expandido com 7 seções (incluindo Divulgação: MusixMatch, pré-save, newsletter, press release)

### 10.3 Financeiro (`/finance`)

- Resumo com saldo, receitas e despesas (geral e por mês)
- Formulário de transação com 13 categorias de receita e 17 de despesa
- Filtros por projeto, tipo, categoria, status de pagamento
- Histórico ordenado por data
- KPIs: Saldo atual, receitas pagas, despesas pagas

### 10.4 Agenda (`/agenda`)

- Visualização por mês/semana/dia
- Tipos de evento: show, ensaio, gravação, reunião, deadline, outro
- Vinculação opcional a projetos
- Status: confirmado, pendente, cancelado

### 10.5 Profissionais (`/professionals`)

- Agenda pessoal (nome, especialidade, contato, bio)
- Banco global de profissionais com `allow_global_listing = true`
- Busca por nome e especialidade

### 10.6 Configurações (`/settings`)

- Nome de exibição, bio, cidade, especialidades
- Modo de visualização de tracks (básico/avançado)
- Templates de tracks reutilizáveis
- Regras de tarefas automáticas (ativar/desativar + parâmetros)
- Seed de projetos de demonstração

### 10.7 Perfil Público (`/u/:username`)

- Portfólio visível sem autenticação
- Informações: nome, bio, cidade, especialidades, contato
- Média de avaliações por estrelas
- Link compartilhável

### 10.8 Editais (`/editais`, `/editais/inscricao`)

- **Busca de editais** com IA a partir de fontes configuráveis (URLs de portais governamentais e culturais)
- **Match de editais** com perfil cultural do projeto (área, estado, palavras-chave, porte)
- **Assistente IA** contextual para dúvidas sobre requisitos e redação de projetos culturais
- **Inscrição assistida** com extração automática de campos e auto-preenchimento com dados do perfil
- **Banco de documentos** reutilizáveis (bio artística, currículo, portfólio, carta de intenção)
- **Comparação** lado a lado de dois editais
- **Métricas** de taxa de sucesso, valor aprovado e histórico de inscrições

### 10.9 Criativo (`/criativo`)

- **Geração de artes** visuais com IA generativa a partir de prompt + estilo + formato
- **Formatos suportados:** Capa (1:1), Stories (9:16), Banner (16:9), Post (4:5), YouTube Thumbnail (16:9)
- **Estilos visuais:** Minimalista, Neon, Vintage, Aquarela, Glitch, Futurista, etc.
- **Templates rápidos:** Capa de Single, Post de Lançamento, Stories de Bastidores, etc.
- **Geração em lote:** múltiplos formatos de uma vez (ex: capa + stories + post)
- **Imagem de referência:** upload opcional para guiar o estilo da geração
- **Galeria:** todas as artes geradas, organizadas por projeto, com download direto
- **Integração com DNA Musical:** gerar arte a partir do mood e identidade sonora da faixa

---

## 11. Fluxo de Convites e Colaboração

### 11.1 Convite para Projeto

```
1. Usuário cria convite em /projects/:id
     ↓
2. Edge function send-project-invite envia e-mail via Resend
   Link: /invite/<token>
     ↓
3. Profissional acessa link (sem necessidade de login)
     ↓
4. Edge function respond-to-invite processa aceite/recusa
     ↓
5. Se aceito:
   ├── project_member criado
   ├── Transação de despesa gerada automaticamente (valor do cachê)
   └── Notificação enviada ao dono do projeto
```

- **Token:** 32 bytes aleatórios em hex (`extensions.gen_random_bytes(32)`)
- **Validade:** 7 dias (padrão via `DEFAULT`)
- **Status:** `pending` → `accepted` / `declined`

### 11.2 Convite para Plataforma

Fluxo similar, mas para convidar novos usuários ao StudioFlow:
- Link: `/platform-invite/<token>`
- Pode incluir flag `allow_global_listing` pré-configurado
- Ao aceitar, o convidado é redirecionado para signup com dados pré-preenchidos

---

## 12. Armazenamento de Arquivos

### 12.1 Buckets

| Bucket | Tipo | Uso |
|--------|------|-----|
| `avatars` | Público (leitura) | Fotos de perfil dos usuários |
| `project-files` | Restrito | Arquivos de projetos (stems, mixes, capas, contratos) |
| `creative-assets` | Público (leitura) | Artes geradas pelo módulo criativo |

### 12.2 Segurança de Storage

- Upload restrito à pasta `{user_id}/` (verificação via `storage.foldername()`)
- Leitura pública para avatares (necessário para perfis públicos)
- Update/Delete restrito ao proprietário

---

## 13. Comunicação em Tempo Real

### 13.1 Supabase Realtime

| Tabela | Publicação | Uso |
|--------|-----------|-----|
| `project_messages` | `supabase_realtime` | Chat em tempo real dentro de projetos |

**Observação para auditoria:** Não há políticas RLS específicas configuradas em `realtime.messages`. Qualquer usuário autenticado pode se inscrever em canais de Realtime. O controle de acesso é feito via RLS na tabela `project_messages` (SELECT permitido para autor, dono do projeto ou membro).

### 13.2 Web Push Notifications

- Subscriptions armazenadas em `push_subscriptions`
- Edge function `send-push-notification` envia via Web Push Protocol
- Chaves VAPID gerenciadas via secrets

### 13.3 WhatsApp Sharing

- Botões de compartilhamento via deeplink `https://wa.me/?text=...`
- Disponível em: visão geral do projeto e checklist de lançamento
- Sem integração backend — usa `window.open()` com URL pré-formatada

---

## 14. Painel Administrativo

### 14.1 Acesso

- Rota: `/admin`
- Visível apenas para usuários com role `admin` na tabela `user_roles`
- Verificação via hook `useAdminRole()` no frontend
- Dados carregados via Edge Function `admin-stats` com dupla verificação (JWT + role)

### 14.2 Métricas Disponíveis

| Seção | Dados |
|-------|-------|
| **Plataforma** | Total de usuários, projetos, tarefas, transações, profissionais, mix tracks |
| **Engajamento** | Logins últimos 7 dias, usuários ativos, taxa de retenção |
| **Usuários** | Lista completa com e-mail, nome, data de cadastro, plano, tipo |
| **Uso de IA** | Chamadas hoje/7d/30d/total, custo por período, breakdown por função e modelo |
| **Infraestrutura** | Custos estimados (backend, IA, e-mails) |
| **Receita** | Estimativa baseada em planos (Free vs Pro) |
| **Logs** | Últimos 50 logs de Edge Functions |
| **Timeline** | Gráfico de atividade dos últimos 30 dias |

### 14.3 Exclusão de Admins das Métricas

Todas as estatísticas de usuários excluem contas com role `admin` para refletir apenas o uso real da plataforma.

---

## 15. Internacionalização (i18n)

### 15.1 Implementação

O sistema utiliza um `LanguageContext` com suporte a dois idiomas:

| Idioma | Código | Status |
|--------|--------|--------|
| Português (Brasil) | `pt` | Idioma padrão, cobertura completa |
| English | `en` | Cobertura em expansão |

### 15.2 Função de Tradução

```typescript
const { t } = useLanguage();
// Uso: t("dashboard.title") → "Meu Painel" ou "My Dashboard"
```

### 15.3 Áreas Traduzidas

| Área | Status | Observações |
|------|--------|-------------|
| Welcome / Landing page | ✅ Completo | Hero, features, CTA |
| Dashboard | ✅ Completo | KPIs, checklist, títulos |
| Agenda | ✅ Completo | Formulários, labels, estados vazios |
| Loading states | ✅ Completo | `t("misc.loading")` em todos os pontos |
| Páginas Admin | ⚠️ Parcial | Maioria ainda em português hardcoded |
| Settings | ⚠️ Parcial | Labels principais traduzidos |
| Editais | ⚠️ Parcial | Módulo novo, tradução em progresso |
| Criativo | ⚠️ Parcial | Módulo novo, tradução em progresso |

### 15.4 Persistência

Idioma selecionado é persistido via `localStorage` (chave `sfp_language`).

---

## 16. Conformidade e Privacidade

### 16.1 Documentos Legais

| Documento | Rota | Última atualização |
|-----------|------|-------------------|
| Termos de Uso | `/legal?tab=terms` | Março 2026 |
| Política de Privacidade | `/legal?tab=privacy` | Março 2026 |

### 16.2 Dados Pessoais Coletados

| Dado | Fonte | Obrigatório | Público |
|------|-------|-------------|---------|
| E-mail | Cadastro (auth) | Sim | Não |
| Nome de exibição | Onboarding | Sim | Sim (se perfil público) |
| Cidade | Onboarding | Não | Sim (se perfil público) |
| WhatsApp | Configurações | Não | Sim (se perfil público) |
| Especialidades | Onboarding | Não | Sim (se perfil público) |
| Bio | Configurações | Não | Sim (se perfil público) |
| Avatar | Configurações | Não | Sim |

### 16.3 Práticas de Privacidade

- **Isolamento de dados:** RLS em todas as tabelas garante que usuários só acessem seus próprios dados
- **Perfil público opt-in:** Campo `allow_global_listing` controlado pelo usuário
- **Cookies:** Apenas essenciais para autenticação (Supabase Auth)
- **Analytics:** PostHog com identificação por `user_id` (sem PII no tracking)
- **Sem rastreamento publicitário**

### 16.4 Direitos do Usuário

Conforme Política de Privacidade:
- Acesso aos dados pessoais
- Correção de informações
- Exclusão de conta e dados
- Exportação de dados

---

## 17. Infraestrutura e Deploy

### 17.1 Pipeline de Deploy

| Componente | Método | Observações |
|-----------|--------|-------------|
| Frontend | Build `vite build` → Deploy via Lovable Cloud | Automático |
| Edge Functions | Deploy automático ao salvar | Via Lovable Cloud |
| Migrations | Executadas automaticamente | Via migration tool |
| URL publicada | `https://studioflow-pro-hub.lovable.app` | — |

### 17.2 Ambientes

| Ambiente | URL |
|----------|-----|
| Preview (desenvolvimento) | `https://id-preview--13754490-93be-4386-ad4d-a7a95dda27bb.lovable.app` |
| Produção (publicado) | `https://studioflow-pro-hub.lovable.app` |

---

## 18. Inventário de Secrets e Variáveis

### 18.1 Variáveis de Ambiente (Frontend — `.env`)

| Variável | Descrição | Sensível |
|----------|-----------|----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Não (pública) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anon (pública) | Não |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto | Não |

### 18.2 Secrets (Edge Functions — servidor)

| Secret | Descrição | Uso |
|--------|-----------|-----|
| `SUPABASE_URL` | URL do Supabase | Todas as funções |
| `SUPABASE_ANON_KEY` | Chave anon para contexto de usuário | Todas as funções |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave com acesso total (bypass RLS) | `admin-stats`, `respond-to-invite`, `respond-to-platform-invite`, `match-editais` |
| `SUPABASE_DB_URL` | String de conexão direta ao PostgreSQL | Migrações |
| `LOVABLE_API_KEY` | Chave do gateway de IA Lovable | `ai-task-assistant`, `generate-daily-tasks`, `music-dna-analyze`, `edital-ai-assistant`, `edital-search`, `extract-edital-fields`, `generate-creative`, `project-ai-assistant` |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública | — |

**Nota:** O `SUPABASE_SERVICE_ROLE_KEY` é usado exclusivamente em Edge Functions para operações administrativas. Nunca é exposto ao frontend.

---

## 19. Matriz de Riscos Conhecidos

| Risco | Severidade | Status | Mitigação |
|-------|-----------|--------|-----------|
| `project_invitations` SELECT público (`true`) | Média | Aceito | Necessário para fluxo de resposta por token. Token é 32 bytes aleatórios (256 bits de entropia). Dados expostos são limitados a metadados do convite. |
| `platform_invitations` SELECT público (`true`) | Média | Aceito | Mesma justificativa acima. |
| Realtime sem policy em `realtime.messages` | Baixa | Aceito | Controle feito via RLS na tabela `project_messages`. Usuários só leem mensagens de projetos onde são dono ou membro. |
| Todos os usuários com acesso Pro na fase beta | Informativo | Temporário | `isPro = true` hardcoded em `ProfileContext`. Será removido quando a monetização for ativada. |
| `verify_jwt = false` em todas as Edge Functions | Baixa | Aceito | Validação JWT manual no código. Permite funções públicas (convites) e autenticadas no mesmo deploy. |
| Bucket `avatars` público para leitura | Baixa | Aceito | Necessário para exibir avatares em perfis públicos. Uploads restritos à pasta do usuário. |
| Traduções incompletas em algumas páginas | Baixa | Em progresso | Páginas principais traduzidas. Editais e Criativo parcialmente. |

---

## 20. Changelog de Correções (v3.0)

Correções aplicadas em Abril 2026 para resolver inconsistências identificadas por auditoria interna:

| # | Correção | Impacto |
|---|---------|---------|
| 1 | **ThemeContext removido** — código morto após remoção do modo escuro | Limpeza de arquitetura |
| 2 | **`as any` removidos** — 26+ arquivos usavam type casts desnecessários em chamadas Supabase | Type-safety restaurada |
| 3 | **Traduções expandidas** — Welcome, Dashboard, Agenda, loading states agora usam `t()` | UX bilíngue funcional |
| 4 | **Profile null tratado** — `needsProfileSetup` agora cobre `profile === null` | Bug fix (OAuth users) |
| 5 | **Error handling adicionado** — queries Supabase em hooks agora logam erros | Observabilidade |
| 6 | **DB writes com error handling** — `addTrack`, `updateTrack`, `removeTrack` no ProjectContext | Confiabilidade |
| 7 | **Catch-all route** — rota `/*` redireciona para `/dashboard` | UX (404 handling) |
| 8 | **`stagePercent` externalizado** — constante movida para fora do componente | Performance |
| 9 | **Duplicação massiva de tarefas corrigida** — 309 tarefas reduzidas a 43 (unique index + upsert) | Bug crítico resolvido |
| 10 | **Edge function `generate-daily-tasks` refatorada** — processa apenas usuário autenticado, respeita `task_rules`, usa upsert | Performance + correção lógica |
| 11 | **`ensureAutoTask` corrigido** — agora inclui `source_key` no payload e usa upsert | Bug fix (deduplicação) |
| 12 | **Throttle de geração de tarefas** — máximo 1x/hora via localStorage | Performance |

---

## 21. Changelog v3.1

Melhorias implementadas em Abril 2026 baseadas na pesquisa Unicamp/INCAMP 2026 (17 respondentes):

| # | Mudança | Impacto |
|---|---------|---------|
| 1 | **Módulo de Editais** — busca, match IA, inscrição assistida, banco de documentos, métricas | Novo módulo completo |
| 2 | **Módulo Criativo** — geração de artes com IA, galeria, templates, integração DNA Musical | Novo módulo completo |
| 3 | **Release Checklist expandido** — seção "Divulgação" com MusixMatch, pré-save, newsletter, press release | Reduz micro-tarefas esquecidas |
| 4 | **WhatsApp sharing** — botões de compartilhamento via deeplink em projetos | Reduz dependência do WhatsApp como hub |
| 5 | **Chip "Dúvida técnica"** no Dashboard — atalho para modo engenheiro de áudio na IA | Descoberta de IA técnica |
| 6 | **Auto-preenchimento de editais** — campos preenchidos automaticamente com dados do perfil | Reduz burocracia de inscrição |
| 7 | **AIMarkdownContent** — componente unificado de formatação de respostas de IA | Consistência visual |
| 8 | **IA contextual por módulo** — `ProjectAISheet` + `EditalAIAssistant` reutilizáveis | Arquitetura modular de IA |
| 9 | **Welcome refatorada** — layout mobile-first, features atualizadas, antes/depois responsivo | UX mobile |
| 10 | **Tutorial expandido** — 2 novas abas (Editais, Criativo) + atualizações nas existentes | Onboarding de novos módulos |
| 11 | **18 Edge Functions** (antes 11) — 7 novas para editais, criativo e projeto | Backend expandido |
| 12 | **Documentação v3.1** — URLs corrigidas, novos módulos documentados, tabelas atualizadas | Auditoria atualizada |

---

*Documentação gerada para auditoria externa · StudioFlow Pro · Abril 2026*
