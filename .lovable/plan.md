
## Plano: Mais efeitos sofisticados para Reels + efeitos pontuais

Quero ampliar o sistema de loops de vídeo do Criativo (`VideoLoopGenerator.ts` + `videoLayers.ts`) com presets mais sofisticados e uma nova categoria de **efeitos pontuais** (acentos visuais aplicados a uma região da arte, não à imagem inteira).

### 1. Novos presets de loop (totais: 6 → 12)

Adicionar à lista de `VideoPreset`:

| Preset | Movimento | Camadas-chave | Uso ideal |
|---|---|---|---|
| **noir** | drift lento | grain forte, vignette pesada, dessaturação | MPB, jazz, intimismo |
| **neon** | pan + pulse | glow ciano/magenta, light leaks duotone, chromatic | Pop, eletrônica |
| **vintage** | breathe | grain, sépia, leaks âmbar, vignette | Acústico, folk |
| **glitch** | shake curto | scanlines + RGB split + datamosh frames | Lo-fi, hyperpop |
| **etereo** | float (novo) | bloom forte, light rays, partículas brancas | Ambient, gospel |
| **rua** | handheld (novo) | shake sutil + grain + leaks quentes | Rap, trap, sertanejo |

Movimentos novos a adicionar em `MotionType`: `float` (subida lenta + breathe) e `handheld` (tremor naturalista de câmera na mão, mais orgânico que `shake`).

### 2. Camadas novas em `videoLayers.ts`

- `renderBloom` — destaque suave em áreas claras (etéreo)
- `renderDuotone` — mapeia luminância para 2 cores (neon)
- `renderSepia` — filtro sépia animado (vintage)
- `renderDatamosh` — blocos deslocados por curto frame (glitch)
- `renderFilmBurn` — flash intermitente de queimado (cinematic+)

Todas seguindo o padrão atual (puras, loop-perfect em t∈[0,1]).

### 3. Efeitos pontuais (novo conceito)

Atualmente todas as camadas cobrem a imagem inteira. Vou introduzir um sistema de **spot effects** — efeitos localizados em uma região retangular ou ponto da arte:

```text
┌─────────────────┐
│  ✨             │  ← spot: sparkle no canto
│      [sujeito]  │
│                 │
│           💡    │  ← spot: lens flare
└─────────────────┘
```

Implementação: nova interface `SpotEffect { type, x, y, radius, intensity }` aplicada via novo array `config.spots`. Tipos suportados:

- **sparkle** — partículas brilhantes orbitando um ponto
- **lensflare** — reflexo de lente animado em um ponto
- **smokePuff** — fumaça subindo de uma região
- **emberRise** — brasas/faíscas subindo (shows, rock)
- **glowPulse** — halo pulsante em ponto específico (destacar rosto/produto)
- **textShimmer** — brilho deslizante numa faixa horizontal (para destacar título)

UI: novo bloco "Acentos pontuais" no `VideoEffectPicker` com chips de toggle (até 2 ativos) + um seletor visual de posição (3x3 grid: cantos, bordas, centro) para escolher onde aplicar.

### 4. UI: `VideoEffectPicker.tsx`

Layout em 3 seções:
1. **Estilo do loop** (12 presets em grid 4x3 com scroll)
2. **Intensidade** (mantém Sutil/Médio/Forte)
3. **Acentos pontuais** (novo) — chips multi-select + grid de posição que aparece quando há acento ativo

### 5. Ajustes em `VideoLoopGenerator.ts`

- Estender `PresetConfig.layers` com novas flags (`bloom`, `duotone`, `sepia`, `datamosh`, `filmBurn`, `duotoneColors`)
- Adicionar `config.spots?: SpotEffect[]`
- Loop de render passa a chamar `renderSpot(...)` para cada spot na ordem (após camadas globais, antes de vignette)
- Performance: spots reusam `noiseTiles`/`particles` quando aplicável; em `intensity="strong"` limitamos a 2 spots simultâneos para manter FPS

### 6. Compatibilidade

- API pública (`generateVideoLoop`) permanece — `preset` e `intensity` ainda funcionam
- Adicionar parâmetro opcional `spots?: SpotEffect[]`
- Estado em `Creative.tsx`: novos `videoSpots` e `videoSpotPosition`, passados para `generateVideoLoop`
- `PRESET_LABELS` ganha entradas para os 6 novos presets (PT-BR)

### Arquivos a modificar
- `src/components/creative/videoLayers.ts` (camadas globais + spot effects + 2 motions novos)
- `src/components/creative/VideoLoopGenerator.ts` (presets + tipos + integração spots)
- `src/components/creative/VideoEffectPicker.tsx` (UI ampliada com seção de acentos)
- `src/pages/Creative.tsx` (estado dos spots + props passadas ao generator)

Sem mudanças de banco, sem novas Edge Functions, sem custo extra de IA — todo o processamento continua client-side.
