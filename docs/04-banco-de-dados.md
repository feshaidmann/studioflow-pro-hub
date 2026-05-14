# 04 · Modelo de dados

Todas as tabelas têm **RLS ativada**. As políticas estão detalhadas em [05-seguranca.md](./05-seguranca.md).

## Domínio principal

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfil do artista (id = `auth.users.id`); contém `allow_global_listing`, `onboarding_completed`, plano, especialidades |
| `projects` | Projetos com workflow de 6 estágios, `perfil_cultural`, financeiro consolidado |
| `mix_tracks` | Tracks do projeto (gain, EQ, comp, músico, cachê) |
| `transactions` | Receitas e despesas; só "pagas" entram nos totais |
| `events` | Agenda; eventos `show` criam receita automaticamente |
| `tasks` | Tarefas manuais e auto-geradas; soft-delete via `dismissed`; **unique index parcial** em `(user_id, source_key) WHERE source_key != ''` |
| `task_rules` | Regras configuráveis de geração automática |
| `professionals` | Rede pessoal de colaboradores |
| `professional_ratings` | Avaliações disparadas no estágio "Lançado" |
| `release_checklists` | Checklist de lançamento por projeto (JSONB) |

## Carreira (editais + palcos)

| Tabela | Descrição |
|--------|-----------|
| `editais` | Editais encontrados; inclui `link`, `link_status`, `link_checked_at` |
| `palcos_curados` | Palcos curados; mesmo padrão de `link_status` |
| `edital_applications` | Inscrições com status, projeto vinculado, valor aprovado, resultado |
| `edital_application_docs` | Documentos individuais da inscrição (ver `DocType` em `src/types/editais.ts`) |
| `edital_documents` | Banco de documentos reutilizáveis (bio, currículo, portfólio…) |
| `rascunhos_editais` | Rascunhos com campos JSON e progresso |
| `alertas_editais` | Alertas de novos editais compatíveis |
| `fontes_editais` | Fontes de busca configuráveis |

## Direção Visual

| Tabela | Descrição |
|--------|-----------|
| `visual_briefings` | Briefing artístico, geração e revisão; armazena URLs de `creative-assets` (não base64) |
| `visual_briefing_shares` | Tokens públicos para `/briefing/share/:token` |

## DNA Musical e referências

| Tabela | Descrição |
|--------|-----------|
| `music_dna_analyses` | Análises persistidas do usuário |
| `music_dna_feedback` | Feedback livre do usuário |
| `music_reference_tracks` | Catálogo curado para benchmarks (admin-only) |
| `genre_mismatch_feedback` | Calibração de classificador por usuário (Falso/Correto) |
| `music_external_metadata` | Cache 30 dias de Deezer/MusicBrainz/ListenBrainz |

## Colaboração

| Tabela | Descrição |
|--------|-----------|
| `project_invitations` | Convite a profissional (token 32 bytes hex, validade 7 dias) |
| `project_members` | Membros confirmados |
| `project_messages` | Chat realtime do projeto |
| `project_files` | Arquivos do projeto (stems, mixes, capas, contratos) |
| `platform_invitations` | Convite à plataforma |

## IA e telemetria

| Tabela | Descrição |
|--------|-----------|
| `ai_conversations` / `ai_messages` | Histórico do assistente IA |
| `ai_invocations` | Log por chamada (modelo, tokens, custo, status) |
| `ai_usage` | Quota fair-use (20/dia, 80/semana) por usuário e função |

## Suporte

| Tabela | Descrição |
|--------|-----------|
| `user_roles` | `app_role` enum (`admin`, `user`); roles **nunca** ficam em `profiles` |
| `track_templates` / `template_tracks` | Templates reutilizáveis de mix |
| `notifications` | Notificações in-app |
| `push_subscriptions` | Web Push (endpoint, p256dh, auth) |
| `beta_feedback` | Feedback do beta |
| `function_logs` | Logs de Edge Functions (admin-only) |
| `page_views` | Tracking interno de páginas |

## Constraints e índices notáveis

| Tabela | Tipo | Definição | Propósito |
|--------|------|-----------|-----------|
| `tasks` | Unique parcial | `(user_id, source_key) WHERE source_key != ''` | Anti-duplicação de tasks auto-geradas |
| `user_roles` | Unique | `(user_id, role)` | Um role por par usuário/role |
| `editais` / `palcos_curados` | Index | `link_checked_at` | Suporta cron de revalidação |

## Funções e RPCs principais

| Função | Tipo | Descrição |
|--------|------|-----------|
| `has_role(_user_id, _role)` | `SECURITY DEFINER` | Verifica role sem recursão RLS |
| `get_member_projects()` | RPC | Projetos onde o usuário é membro |
| `get_project_for_member(p_project_id)` | RPC | Dados não-financeiros de um projeto para guest |
| `get_professional_project_count(p_email, p_name)` | RPC | Conta projetos de um profissional |
| `get_public_profile(p_username)` | RPC | Perfil público por username |
| `get_public_profile_ratings(p_profile_id)` | RPC | Média de avaliações do perfil |
| `get_public_profile_history(p_email)` | RPC | Histórico de projetos do profissional |
| `get_auth_email()` | RPC | E-mail do usuário autenticado |
| `get_file_download_url(p_file_id)` | RPC | URL assinada para download |

> **Diretriz:** novos endpoints que precisem expor dados de projeto a guests devem ser RPCs `SECURITY DEFINER` que **excluem campos financeiros**.
