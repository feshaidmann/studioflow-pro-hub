# StudioFlow Pro — Documentação

> **Versão:** 4.0 · **Última revisão:** Maio 2026
> **Mantido por:** Fernando Shaidmann (admin)
> **URL pública:** https://app.jamsessionproject.com.br

A documentação técnica é organizada por tema para facilitar leitura e auditoria.
Cada arquivo é independente e cobre uma camada da plataforma.

## Índice

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 01 | [Visão geral do produto](./01-visao-geral.md) | Persona, escopo, fase atual, princípios de produto |
| 02 | [Stack e arquitetura](./02-stack-arquitetura.md) | Tecnologias, estrutura de diretórios, contextos, hooks, navegação |
| 03 | [Módulos funcionais](./03-modulos.md) | Dashboard, Projetos, Carreira, DNA Musical, Direção Visual, Agenda, Finanças, Profissionais, Perfil público |
| 04 | [Banco de dados](./04-banco-de-dados.md) | Tabelas, índices, RPCs e funções |
| 05 | [Segurança, RLS e Auth](./05-seguranca.md) | Políticas RLS, fluxo de autenticação, guest flow, admin, storage |
| 06 | [Edge Functions](./06-edge-functions.md) | Inventário, autenticação, custos de IA, cron jobs |
| 07 | [Inteligência Artificial](./07-ia.md) | Modelos via Lovable AI, assistentes contextuais, quotas, DNA Musical, Direção Visual |
| 08 | [Realtime, Storage, Push e Compartilhamento](./08-integracoes.md) | Chat, buckets, Web Push, WhatsApp, Resend |
| 09 | [Admin, i18n e Privacidade](./09-admin-i18n-privacidade.md) | Painel admin, idiomas, LGPD, dados pessoais |
| 10 | [Infra, deploy e secrets](./10-infra-secrets.md) | Pipeline, ambientes, variáveis e secrets |
| 11 | [Riscos e changelog](./11-riscos-changelog.md) | Matriz de riscos aceitos, histórico de versões |

## Convenções e princípios fixos

Estes princípios valem para toda a plataforma (ver memória do projeto):

- **Persona:** apenas Artista Independente — não há papel "Produtor".
- **UI:** light mode only, estética macOS minimalista, fundo neutro `hsl(220 14% 96%)`, raio `0.875rem`. Sem dark mode, sem efeitos neon/gamer.
- **Localização:** formatação pt-BR para moeda/números (`1.234,56`); CSV com `;` e BOM UTF-8.
- **Privacidade financeira:** dados financeiros são estritamente do dono; convidados nunca veem métricas financeiras (RLS + RPCs `SECURITY DEFINER`).
- **Constraints aceitos:** módulo `/studio` foi removido permanentemente; delegação de NS HostGator é proibida; convites automáticos por e-mail/WhatsApp estão desligados no MVP.

## Como editar

- Atualize o arquivo mais específico possível e mantenha o changelog em [11-riscos-changelog.md](./11-riscos-changelog.md).
- Para mudanças de schema, sempre referencie a migration ao invés de duplicar SQL aqui.
- Quando um módulo for renomeado ou removido, mantenha apenas uma nota curta no histórico — não preserve a documentação antiga inline.
