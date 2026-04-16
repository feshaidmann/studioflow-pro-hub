

# Corrigir alinhamento das âncoras de scroll (topo da seção / campo de texto)

## Diagnóstico

Hoje só existe **uma âncora real**: `#ai-assistant-section` no Dashboard, usada pelo `scrollToAI()`. O código tem 2 problemas:

**1. Container scrollável errado em mobile**
```ts
window.scrollTo({ top, behavior: "smooth" })
```
Em mobile, `AppLayout` define `<main className="flex-1 overflow-y-auto">` — a rolagem acontece **dentro do `<main>`**, não na `window`. Resultado: `window.scrollTo` não move nada e a seção não vai para o topo. Em desktop funciona porque a `<main>` não é scrollável (só tem `ml-52`).

**2. Offset não considera o header fixo**
Mobile tem header `h-12` (48px) sticky no topo. O offset atual é só 12px → mesmo se a rolagem funcionasse, o título do card de IA ficaria coberto pela barra "StudioFlow / Settings / Sino".

**3. Foco rola de novo**
`textarea?.focus({ preventScroll: true })` está correto (evita re-scroll), mas vale conferir que nenhuma re-renderização do `AITaskAssistant` chame outro `scrollIntoView` competindo.

## Decisão de UX: para onde alinhar?

Duas opções legítimas para "ações de IA":
- **(A) Topo do card** — usuário vê o título "Assistente IA" + textarea logo abaixo. Contexto visual completo.
- **(B) Topo do textarea** — pula direto para o campo de digitação, sem ver o título.

**Recomendado: (A) topo do card com offset do header.** Mantém contexto, evita sensação de "fui jogado no meio". O foco automático no textarea já indica onde digitar.

## Solução

### 1. Helper utilitário `scrollToAnchor`
Criar `src/lib/scrollToAnchor.ts`:
```ts
export function scrollToAnchor(elementId: string, opts?: { extraOffset?: number; focusSelector?: string }) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  // Offset = header mobile (48px) ou 0 desktop + margem visual
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const headerOffset = isMobile ? 48 : 0;
  const margin = 12 + (opts?.extraOffset ?? 0);
  const offset = headerOffset + margin;
  
  // Detectar container scrollável (mobile = <main>, desktop = window)
  const scrollContainer = isMobile 
    ? (document.querySelector("main") as HTMLElement | null)
    : null;
  
  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const top = elRect.top - containerRect.top + scrollContainer.scrollTop - offset;
    scrollContainer.scrollTo({ top, behavior: "smooth" });
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }
  
  if (opts?.focusSelector) {
    setTimeout(() => {
      const target = document.querySelector<HTMLElement>(opts.focusSelector!);
      target?.focus({ preventScroll: true });
    }, 450);
  }
}
```

### 2. Atualizar `Dashboard.tsx` → `scrollToAI`
Substituir o cálculo manual pelo helper:
```ts
const scrollToAI = () => {
  localStorage.setItem("sfp_ai_collapsed", "false");
  requestAnimationFrame(() => {
    scrollToAnchor("ai-assistant-section", {
      focusSelector: "#ai-assistant-section textarea",
    });
  });
};
```

### 3. Reaproveitar em `ProjectDetail.tsx`
O `#project-chat-section` usa `scrollIntoView({ behavior: "smooth" })` puro — também sofre do problema do header em mobile (cobre o cabeçalho do chat). Trocar por `scrollToAnchor("project-chat-section")`.

### 4. Defesa adicional via CSS
Em `src/index.css`, garantir que qualquer âncora futura via `:target` ou `scroll-into-view` respeite o header:
```css
@layer base {
  [id] { scroll-margin-top: 60px; } /* 48 header + 12 margem */
  @media (min-width: 768px) { [id] { scroll-margin-top: 12px; } }
}
```
Backup defensivo — se algum dia trocarmos para `scrollIntoView`, já fica certo.

## Arquivos
- **Criar**: `src/lib/scrollToAnchor.ts`
- **Modificar**: `src/pages/Dashboard.tsx` (substituir lógica do `scrollToAI`)
- **Modificar**: `src/pages/ProjectDetail.tsx` (linha 263 — usar helper)
- **Modificar**: `src/index.css` (adicionar `scroll-margin-top` defensivo)

## Sem migrações
Mudança puramente client-side de UX/scroll.

## Fora do escopo
TOC sticky do DNA Musical (P1 da plan anterior, ainda não implementado) — quando for implementado, já usará o `scrollToAnchor` pronto.

