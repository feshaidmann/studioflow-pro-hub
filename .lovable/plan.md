

# Vídeo loop para Reels e Spotify Canvas

## Visão
Story/Reels e Spotify Canvas (formatos verticais 1080×1920) passam a gerar **vídeo loop de 3-5 segundos** automaticamente: a IA gera uma imagem estática de alta qualidade, e o navegador anima essa imagem (Ken Burns + parallax sutil + leves variações de luz) gravando o resultado como WebM via MediaRecorder. Zero custo extra de IA, zero dependências externas.

## Fluxo do usuário
1. Seleciona **Story/Reels** ou **Spotify Canvas** nos chips de formato
2. Aparece um seletor de **duração do loop** (3s / 4s / 5s) e estilo de movimento (zoom-in / pan-horizontal / parallax)
3. Clica "Gerar Vídeo"
4. IA gera imagem 1080×1920 (mesmo pipeline atual)
5. Cliente renderiza a animação em `<canvas>` por N segundos a 30fps, captura via `MediaRecorder` → blob WebM
6. Preview mostra `<video autoplay loop muted>` com download (.webm) e botão "Salvar na galeria"
7. Galeria reconhece vídeos e renderiza `<video>` em vez de `<img>`

## Arquitetura técnica

### 1. Detecção de formato de vídeo
Adicionar flag `isVideo` em `FORMAT_OPTIONS` para `story` e `spotify_canvas`.

### 2. Novo componente `VideoLoopGenerator.tsx`
- Recebe a imagem base64 + duração + estilo de movimento + dimensões
- Cria `<canvas>` offscreen 1080×1920
- Loop de animação com `requestAnimationFrame`:
  - **Ken Burns**: `scale` de 1.0 → 1.12 e translate sutil (volta ao início no fim do loop = loop perfeito)
  - **Parallax**: aplicar leve gradient overlay animado (vignette deslizando) por cima
  - **Brilho pulsante**: filter `brightness(0.95 → 1.05 → 0.95)` em senoide
- Usa `canvas.captureStream(30)` + `MediaRecorder` (`video/webm;codecs=vp9` com fallback `vp8`)
- Garante loop perfeito: keyframes do início = keyframes do fim
- Retorna `Blob` WebM

### 3. Estado e UI em `Creative.tsx`
- Novo estado: `loopDuration` (3|4|5), `loopMotion` ('zoom'|'pan'|'parallax')
- Quando `selectedFormat.isVideo`: 
  - mostrar painel "Configurações do loop" com 2 selects compactos
  - botão muda de "Gerar Imagem" → "Gerar Vídeo Loop"
  - após `generate()` retornar imagem, chamar `VideoLoopGenerator` para produzir blob
  - armazenar em `generatedVideoBlob` + URL via `URL.createObjectURL`
- Preview condicional: se vídeo, renderiza `<video src loop autoplay muted playsInline>`; senão `<img>`

### 4. Salvar na galeria
- `useCreativeAssets.saveAsset` ganha parâmetro opcional `videoBlob`
- Quando presente, faz upload do `.webm` (mime `video/webm`) ao bucket `creative-assets` em vez do PNG
- `creative_assets` precisa de coluna nova `media_type` ('image' | 'video') — **migração SQL**
- `public_url` aponta para o webm; `storage_path` termina em `.webm`

### 5. Renderização na galeria
- `GalleryDetailSheet` e cards da galeria detectam `media_type === 'video'` e renderizam `<video controls loop>`
- Ícone de play overlay nas miniaturas para vídeos

### 6. ImagePreview
- Renomear conceitualmente; aceitar prop `videoUrl?: string` que sobrescreve a renderização para `<video>`
- Botões "Baixar" passam a usar extensão `.webm` quando vídeo

## Migração SQL necessária
```sql
ALTER TABLE creative_assets 
ADD COLUMN media_type text NOT NULL DEFAULT 'image' 
CHECK (media_type IN ('image', 'video'));
```

## Limitações conhecidas (transparentes ao usuário)
- Saída em **WebM** (suportado por Chrome/Firefox/Edge nativamente; Safari recente também). Instagram aceita WebM convertendo automaticamente; para upload manual, usuário pode converter, mas a maioria das plataformas aceita direto.
- Movimento é "animação de imagem", não geração de vídeo verdadeira — comunicar isso na UI com label sutil "loop animado"
- Tamanho do arquivo: ~1-3 MB para 5s a 1080×1920 (aceitável)

## Arquivos modificados/criados
- **Criar** `src/components/creative/VideoLoopGenerator.ts` (lógica pura: imagem + params → Blob)
- **Modificar** `src/components/creative/FormatSelector.tsx` (flag `isVideo` em story e spotify_canvas)
- **Modificar** `src/components/creative/FormatChips.tsx` (badge "vídeo" nos formatos com loop)
- **Modificar** `src/components/creative/ImagePreview.tsx` (suporte a `videoUrl`)
- **Modificar** `src/components/creative/GalleryDetailSheet.tsx` (renderização condicional)
- **Modificar** `src/pages/Creative.tsx` (estados, painel de configuração, fluxo de geração de vídeo, preview condicional)
- **Modificar** `src/hooks/useCreativeAssets.ts` (saveAsset aceita videoBlob, upload .webm)
- **Migração** adicionar coluna `media_type` em `creative_assets`

