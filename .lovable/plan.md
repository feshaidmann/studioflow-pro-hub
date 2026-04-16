

Faz total sentido. Hoje a galeria abre um `Sheet` por arte, o que força o usuário a fechar e reabrir para ver a próxima — quebra o fluxo visual de quem está revisando lote de criativos. Um lightbox/carrossel é o padrão esperado (Instagram, Drive, Apple Photos).

# Lightbox de galeria com navegação fluida

## Comportamento
- Clicar em qualquer arte abre **modal fullscreen** com a mídia centralizada e grande (~85vh)
- **Navegação**: setas laterais (desktop), swipe (mobile), teclas ← → e Esc
- **Contador** "3 / 12" no topo
- **Metadados e ações** em barra inferior translúcida (formato, dimensões, projeto, data, prompt expansível)
- **Ações** mantidas: baixar, usar como referência, desdobrar, excluir, copiar prompt
- **Vídeos** (Reels/Canvas .webm) tocam autoplay loop muted, com controles
- **Pré-carrega** próxima e anterior para transição instantânea
- Animação de slide horizontal sutil entre artes (`translateX` + fade)

## Layout
```text
┌─────────────────────────────────────┐
│  [3/12]                       [X]   │
│                                     │
│  ‹      [   MÍDIA CENTRAL   ]    ›  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Story • 1080×1920 • Projeto X   │ │
│ │ "prompt completo aqui…"  [copy] │ │
│ │ [Baixar] [Ref.] [Desdobrar] [🗑]│ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Implementação
1. **Criar** `src/components/creative/GalleryLightbox.tsx`
   - Recebe `assets[]`, `currentIndex`, `open`, callbacks de ação
   - Usa `Dialog` fullscreen (não `Sheet`)
   - Estado interno de `index`, handlers de teclado/swipe (touch events)
   - Pré-carrega `assets[index±1]` via `<link rel="preload">` ou `new Image()`

2. **Modificar** `src/pages/Creative.tsx`
   - Substituir abertura do `GalleryDetailSheet` pela `GalleryLightbox`, passando lista completa filtrada e índice clicado
   - Manter `GalleryDetailSheet` apenas se quiser fallback mobile (sugiro **remover**, lightbox funciona em ambos)

3. **Reaproveitar** lógica de ações já existente (download, derive, delete, useAsReference) — sem duplicação

## Arquivos
- **Criar**: `src/components/creative/GalleryLightbox.tsx`
- **Modificar**: `src/pages/Creative.tsx`
- **Remover** (opcional): `src/components/creative/GalleryDetailSheet.tsx`

## Sem migrações
Mudança puramente de UI/UX.

