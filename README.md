# StudioFlow Pro

Plataforma SaaS de gestão para **artistas independentes** do setor musical brasileiro — projetos, finanças, agenda, carreira (editais + palcos), DNA Musical, Direção Visual e colaboração, com assistente IA contextual em todos os módulos.

- 🌐 **App:** https://app.jamsessionproject.com.br
- 📚 **Documentação técnica:** [`docs/`](./docs/README.md)

## Stack

React 18 · TypeScript · Vite 5 · Tailwind 3 · shadcn/ui · React Router 6 · TanStack Query · Lovable Cloud (Supabase: Postgres, Auth, Edge Functions Deno, Storage, Realtime) · Lovable AI Gateway (Gemini / GPT-5).

## Princípios fixos

- **Persona única:** Artista Independente (sem papel "Produtor").
- **UI:** light mode only, estética macOS minimalista — sem dark mode.
- **Localização:** pt-BR para moeda, datas e CSV (`;` + BOM UTF-8).
- **Privacidade financeira:** convidados nunca veem dados financeiros.
- **Sem `/studio`**, sem convites automáticos por e-mail/WhatsApp no MVP.

## Scripts

```bash
npm run dev       # Dev server (Vite)
npm run build     # Build de produção
npm run preview   # Preview do build
npm test          # Vitest
```

## Estrutura

```
src/         App React (pages, components, contexts, hooks, lib, workers)
supabase/    Edge Functions Deno + migrations + config.toml
docs/        Documentação técnica (índice em docs/README.md)
public/      Assets estáticos + service worker (sw.js)
```

## Documentação

Toda a documentação técnica (arquitetura, banco, RLS, edge functions, IA, infra, riscos e changelog) está em [`docs/`](./docs/README.md), dividida por tema.

## Editar localmente

Este projeto é mantido pelo agente Lovable. Para editar localmente:

```bash
git clone <repo>
cd studioflow-pro
npm install
npm run dev
```

A configuração do backend (URL, anon key, project id) vem do `.env` gerado automaticamente pelo Lovable Cloud — **não edite manualmente**.

## Licença

Proprietário · StudioFlow Pro · Fernando Shaidmann
