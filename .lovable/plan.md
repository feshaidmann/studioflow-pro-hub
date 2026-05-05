## Objetivo
Aplicar a nova página de conversão (Welcome) enviada, que reposiciona a comunicação para o artista independente brasileiro, ancora o produto em um mock concreto e inclui credenciais (INCAMP/ABMI).

## Mudanças

**Arquivo único:** `src/pages/Welcome.tsx` — sobrescrever pelo conteúdo de `user-uploads://Welcome.tsx` (515 linhas).

Estrutura nova:
1. Badge "Pré-incubado no INCAMP · Unicamp 2026"
2. Hero "Sua música merece mais do que WhatsApp e planilha"
3. CTA principal (Google + e-mail + login) logo após o hero
4. Mock visual do projeto "Noite Clara" (orçamento + checklist com itens urgentes)
5. Seção de dores específicas BR (4 pares dor → solução)
6. Grid dos 8 módulos com Palcos incluído (Projetos, Financeiro, Agenda, Equipe, Editais, Palcos, Criativo, DNA Musical)
7. CTA final + credenciais (INCAMP, ABMI, artistas BR)

## Compatibilidade verificada
- Imports usados (`useAuth`, `useProfile`, `useLanguage`, `lovable.auth`, `Button`, ícones lucide) já existem no projeto.
- Rotas referenciadas (`/auth`, `/auth?mode=signup`, `/dashboard`, `/onboarding`) já existem.
- Guard de redirecionamento (`needsProfileSetup`/`user`) preservado.
- Não há dependências novas a instalar.

## Não muda
Nenhum outro arquivo é afetado. Navegação, AppLayout, rotas e demais páginas permanecem intactos.
