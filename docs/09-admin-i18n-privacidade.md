# 09 · Admin, Internacionalização e Privacidade

## Painel administrativo (`/admin` e `/admin/reference-tracks`)

- Acesso restrito por role `admin` em `user_roles`, verificado pelo hook `useAdminRole`.
- Dados via `admin-stats` com dupla checagem (JWT + role).
- `/admin/reference-tracks` opera sobre `music_reference_tracks`: importação, cobertura, snapshots públicos via `export-acoustic-catalog`.

### Métricas disponíveis

| Seção | Conteúdo |
|-------|----------|
| Plataforma | Totais de usuários, projetos, tarefas, transações, profissionais |
| Engajamento | Logins 7d, ativos, retenção |
| Usuários | Lista com e-mail, plano, tipo |
| Uso de IA | Chamadas hoje/7d/30d/total, custo por modelo e função |
| Infra | Custos estimados (backend, IA, e-mails) |
| Logs | Últimos 50 logs de Edge Functions |
| Timeline | Atividade dos últimos 30 dias |

> Estatísticas excluem contas com role `admin` para refletir uso real.

## Internacionalização

- Provider: `LanguageContext` com `t("namespace.chave")`.
- Idiomas: `pt` (padrão, completo) e `en` (em expansão).
- Persistência via `localStorage` (`sfp_language`).
- Há chaves específicas para empty states; novos textos devem entrar nos dois idiomas no mesmo PR.

| Área | Status |
|------|--------|
| Welcome / Dashboard / Agenda / loading | Completo |
| Settings / Editais / Carreira / Direção Visual | Parcial |
| Admin | Em português |

## LGPD e privacidade

### Dados pessoais coletados

| Dado | Fonte | Obrigatório | Público |
|------|-------|-------------|---------|
| E-mail | Cadastro | Sim | Não |
| Nome | Onboarding | Sim | Sim (se opt-in) |
| Cidade | Onboarding | Não | Sim (se opt-in) |
| WhatsApp | Settings | Não | Sim (se opt-in) |
| Especialidades | Onboarding | Não | Sim (se opt-in) |
| Bio | Settings | Não | Sim (se opt-in) |
| Avatar | Settings | Não | Sim |

### Práticas

- Isolamento via RLS em todas as tabelas.
- Perfil público é **opt-in** (`allow_global_listing`).
- Cookies apenas essenciais (Supabase Auth).
- PostHog identifica por `user_id` — sem PII no payload.
- Sem rastreamento publicitário.

### Direitos do usuário

- Acesso, correção, exclusão e exportação dos dados (Política de Privacidade em `/legal?tab=privacy`).
- Solicitações tratadas pelo admin via Lovable Cloud + DELETEs cascateados (`auth.users.id` é referenciado por `profiles.id`).

### Documentos legais

| Documento | Rota |
|-----------|------|
| Termos de Uso | `/legal?tab=terms` |
| Política de Privacidade | `/legal?tab=privacy` |
