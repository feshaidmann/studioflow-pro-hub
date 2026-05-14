# 01 · Visão geral do produto

O **StudioFlow Pro** é uma plataforma SaaS de gestão para **artistas independentes** do setor musical brasileiro. Centraliza a operação criativa, administrativa e estratégica de um artista solo ou banda independente.

## Persona única

A plataforma atende **exclusivamente o Artista Independente**. Não existem papéis "Produtor" ou "Estúdio" como contas distintas — engenheiros, mixers e profissionais entram apenas como colaboradores convidados em projetos.

## Pilares funcionais

| Pilar | Módulo |
|-------|--------|
| Operação criativa | Projetos (workflow de 6 estágios), DNA Musical, Direção Visual, Master Analyzer |
| Carreira | Editais e Palcos curados unificados em **/carreira** |
| Administração | Financeiro, Agenda, Profissionais, Convites, Chat |
| Estratégia | Dashboard com checklist diário, Perfil público com avaliações |
| Suporte | Assistente IA contextual em todos os módulos |

## Fase atual

Beta pública. Todos os usuários têm acesso Pro liberado durante o período de validação (`isPro = true` em `ProfileContext`). A flag será removida quando a monetização for ativada.

## Posicionamento

- **Bilíngue:** PT-BR (idioma principal) e EN.
- **Light mode only**, estética macOS minimalista — sem dark mode.
- **Pt-BR para tudo:** moeda, datas e CSV (`;` + BOM).

## Constraints permanentes

- Módulo `/studio` **não pode ser readicionado** — Master Analyzer existe como modal dentro do estágio "Upload" do projeto.
- Convites automáticos por e-mail/WhatsApp estão desligados no MVP — apenas link manual copy/paste.
- Delegação de NS para HostGator é proibida (ver [10-infra-secrets.md](./10-infra-secrets.md)).
