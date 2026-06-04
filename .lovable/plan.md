## Decisão a confirmar antes de codar

A direção escolhida (v3 "Festival ao pôr-do-sol") é **dark** — fundo `#0d0216` (roxo-preto profundo) com blocos saturados em laranja/magenta/roxo, tipografia Bebas Neue display. Isso **conflita com a memória core** do projeto:

> "Light mode ONLY, macOS minimalist. NO dark mode, NO neon/gamer effects"

A landing pública (`/welcome`, `/u/:username`) é a única superfície "marketing" — o app autenticado (Dashboard, Projetos, Financeiro, Agenda, etc.) segue o macOS light minimalista. A leitura mais saudável é:

- **Welcome (público) = dark, sunset, cartaz de show.** Função de marca/conversão.
- **App (autenticado) = light, macOS.** Função de trabalho — não muda.

Vou implementar com esse escopo. Se você quiser estender a estética dark para o app autenticado, isso vira projeto separado.

---

## Escopo da implementação

**Em escopo (só landing pública):**
- `src/pages/Welcome.tsx` e componentes em `src/components/welcome/*` (Hero, ImpactMetrics, PainPoints, Modules, ProductPreview, FinalCTA)
- `src/components/TutorialMockups.tsx` se renderizado no Welcome
- Footer beta + links Termos/Privacidade

**Fora de escopo:**
- `src/index.css` tokens globais — **não tocar** (quebra todo o app autenticado)
- AppLayout, sidebars, qualquer rota autenticada
- `/u/:username` (perfil público) — fica pra um próximo round se quiser

## Como implementar a paleta sem mexer nos tokens globais

Criar um escopo CSS local só para Welcome — bloco `.welcome-shell { ... }` em `src/index.css` (sem mexer nos `--background`/`--foreground` raiz) com variáveis próprias:

```css
.welcome-shell {
  --welcome-bg: 270 80% 5%;        /* #0d0216 */
  --welcome-surface: 270 60% 11%;  /* #1a0b2e */
  --welcome-orange: 20 100% 60%;   /* #ff6b35 */
  --welcome-amber: 33 95% 54%;     /* #f7931e */
  --welcome-magenta: 333 80% 58%;  /* #e84393 */
  --welcome-violet: 252 73% 60%;   /* #6c5ce7 */
}
```

Em vez de classes Tailwind arbitrárias `bg-[#0d0216]`, registrar essas cores em `tailwind.config.ts` sob prefixo `welcome-*` (`welcome.bg`, `welcome.orange`, etc.) para manter o token system limpo.

## Tipografia

- Adicionar `<link>` Google Fonts (Bebas Neue + Barlow) no `index.html` (preconnect + display=swap).
- Estender `tailwind.config.ts` com `fontFamily.display = ["Bebas Neue", ...]` e `fontFamily.body = ["Barlow", ...]`.
- Aplicar `font-body` no shell do Welcome (o resto do app continua usando o SF system stack).

## Estrutura de componentes (refatorar para casar com o protótipo)

```
src/pages/Welcome.tsx               → shell .welcome-shell, max-w-6xl, espaçamento bento
└── components/welcome/
    ├── WelcomeHero.tsx             → card gradiente 8/12 + side block 4/12 (CTAs + 2 KPIs coloridos)
    ├── WelcomeProductPreview.tsx   → card Noite Clara (9/12) borda gradient + KPIs restantes (3/12)
    ├── WelcomePainPoints.tsx       → grid 3 colunas, cards bg-white/5 borda discreta
    ├── WelcomeModules.tsx          → "Tudo que um lançamento precisa" + grid 6 módulos
    └── WelcomeFinalCTA.tsx         → bloco branco com gradient sutil, CTAs em magenta
```

Conteúdo, ícones e copy permanecem os mesmos da versão atual — só muda embalagem visual.

## Animações

- `framer-motion` (já no projeto) para reveal do hero e fade-up dos blocos no scroll
- Hover dos KPIs e módulos: `transition-colors` + lift -1px
- Sem parallax, sem bounce

## Memória do projeto

Após aplicar, atualizar memória:
- Editar core: remover "Light mode ONLY" → trocar para "App autenticado: light mode macOS minimalista. Landing pública /welcome: dark sunset (exceção marca)."
- Criar `mem://estilo/landing-publica-dark-sunset` documentando paleta `welcome-*`, fontes Bebas+Barlow, escopo restrito a /welcome.

## Validação

1. Build limpa
2. Screenshot full-page após implementar — comparar lado a lado com o protótipo
3. Confirmar que rotas autenticadas (`/dashboard`, `/projects`) continuam light/macOS
4. Mobile (375px) — bento colapsa para coluna única, hero não estoura

## Pergunta antes de seguir

Confirma o escopo restrito (só `/welcome` vira dark; resto do app fica light)? Ou quer expandir para o app inteiro?