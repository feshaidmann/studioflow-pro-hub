

# Loops de vídeo mais sofisticados — efeitos por elementos/camadas

## Diagnóstico do que existe
Hoje o `VideoLoopGenerator` aplica **um único movimento** (zoom, pan ou parallax) na **imagem inteira** + brilho pulsante + vinheta. É um Ken Burns básico. Nenhuma região nem elemento se move de forma independente.

## Restrição técnica honesta
**Não dá para segmentar elementos da imagem PNG no browser** (céu, pessoa, instrumento) sem rodar um modelo de segmentação (SAM, BodyPix etc.) — adicionaria 30-100MB e 5-15s extras. **Fora do escopo agora.**

O que **dá** para fazer no canvas, mantendo 100% client-side e sem dependências novas:

### A) Efeitos compostos sobre a imagem (camadas globais)
Empilhar múltiplos efeitos com fases independentes — o resultado deixa de ser "a foto se move" e vira "uma cena viva".

- **Light leaks** — gradientes radiais coloridos cruzando o frame em diagonal
- **Film grain** — ruído sutil regenerado a cada frame (já é "movimento de elemento")
- **Dust/particles** — partículas pequenas com física simples (3-15 pontos com velocidade própria, drift + recycle nas bordas)
- **Glow pulse** — brilho concentrado em região (centro, terço, etc.) que respira
- **Color cycle** — leve shift de hue em loop (mood change)
- **Chromatic aberration** — desloca canais R/G/B em micro-pixels (efeito glitch elegante)
- **Light rays / god rays** — feixes de luz translúcidos varrendo
- **Scanlines / VHS** — linhas horizontais com leve jitter (estética retrô/analógica)

### B) Animação por regiões da imagem
Mesmo sem segmentação real, podemos animar **regiões da imagem** com sobreposição (`drawImage` com clip):

- **Região superior (céu/topo)** desloca devagar para um lado
- **Região central (foco)** com zoom mais intenso
- **Região inferior** estática ou com leve oscilação

Funciona muito bem para arte de capa onde o sujeito está centralizado. Tecnicamente: clip por retângulo + transformações independentes por camada (com edge-feather via gradiente alpha para não cortar feio).

### C) Movimento principal expandido
Adicionar 3-4 estilos novos ao seletor atual:

| Estilo | Descrição |
|---|---|
| `zoom-in` | Existente |
| `pan` | Existente |
| `parallax` | Existente |
| **`breathe`** | Respiração lenta (zoom 2-3% sutil + glow pulse) — para capas estáticas |
| **`drift`** | Câmera flutuante com Lissajous (movimento orgânico em 8) |
| **`reveal`** | Começa zoom forte + vinheta pesada → abre para imagem completa → loop reverso |
| **`shake`** | Tremor cinematográfico baixo (energia/show ao vivo) |

### D) Presets temáticos (mais importante para UX)
Em vez de obrigar o usuário a combinar movimento+camadas+intensidade, oferecer **presets prontos** que combinam tudo:

- **Cinematográfico** — drift + light leaks + grain leve + vinheta pesada
- **Sonho** — breathe + glow pulse + chromatic aberration suave + dust
- **Show ao vivo** — shake + light rays + grain forte
- **Lofi / VHS** — scanlines + grain + color cycle + chromatic aberration
- **Minimal Apple** — breathe + glow muito sutil (alinhado com a memória macOS minimalist)
- **Festa/Energia** — pan rápido + light leaks coloridos + pulse de brilho mais forte

Usuário escolhe **1 preset** + intensidade (Sutil/Médio/Forte). Modo avançado expande para tweaks individuais.

## Plano de implementação

### Arquitetura (`VideoLoopGenerator.ts`)
Refatorar para sistema de camadas:
```text
generateVideoLoop({ preset, intensity, customLayers? })
  ↓
  [BaseImageLayer (motion: zoom/pan/parallax/breathe/drift/reveal/shake)]
  [GrainLayer]
  [LightLeakLayer]
  [ParticlesLayer]
  [GlowLayer]
  [ChromaticAberrationLayer]
  [VignetteLayer]
  → cada layer tem render(ctx, t, intensity)
  → composição em ordem fixa por frame
```
Cada camada é uma função pura `(ctx, t∈[0,1], intensity) => void`. Loop perfeito mantido (todas as funções fecham em t=1).

### UI (`Creative.tsx` + novo `VideoEffectPicker.tsx`)
Substituir os 2 selects atuais por:
1. **Card de presets** — 6 chips visuais (ícone + nome), 1 selecionado por vez
2. **Slider de intensidade** — Sutil / Médio / Forte
3. **Duração** — mantém 3/4/5s
4. **Botão "Personalizar"** (collapsible) — expõe camadas individuais com toggles

### Performance
- Particles: máx 15 pontos pré-calculados por preset
- Grain: gerar 4-6 noise tiles uma vez e ciclar (não regenerar a cada frame)
- Chromatic aberration: aplicar só em região central (não no frame inteiro)
- Manter 30 fps, bitrate 4 Mbps. Render de 4s deve ficar em ~4-5s real (parecido com hoje).

### Compatibilidade
- Output continua `.webm` (vp9/vp8) — sem mudança no upload/storage/Gallery
- Assets antigos no `creative_assets` continuam funcionando — só novos vídeos terão os efeitos

## Arquivos
- **Refatorar**: `src/components/creative/VideoLoopGenerator.ts` (sistema de camadas + presets)
- **Criar**: `src/components/creative/videoLayers.ts` (funções de cada efeito)
- **Criar**: `src/components/creative/VideoEffectPicker.tsx` (UI de presets/intensidade)
- **Modificar**: `src/pages/Creative.tsx` (substituir bloco "5b" pelo novo picker, ajustar `handleGenerate`)

## Sem migrações
Tudo client-side. Sem mudança de schema, sem nova edge function, sem custo de IA extra.

## Fora desta entrega (docs como follow-up se quiser)
- Segmentação real de elementos (céu/pessoa/instrumento) via TensorFlow.js — investigar como PR separada
- Sincronização com áudio do projeto — exige carregar trecho da master analisada
- Export MP4 (hoje webm) — exige ffmpeg.wasm, +30MB

