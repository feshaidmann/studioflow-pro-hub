# Plano — Conformidade dos formatos do Criativo

## Diagnóstico

O modelo de imagem (`gemini-2.5-flash-image` / Nano Banana) **não aceita largura/altura como parâmetro de saída** — ele retorna sempre uma imagem ~1024px no aspect ratio que conseguir inferir do prompt. Hoje:

- `FormatSelector` declara, por exemplo, "Capa Spotify 1920×1920", mas a IA devolve algo próximo de 1024×1024 e o app salva como está.
- O system prompt diz `Aspect ratio: 1920x1920`, o que o modelo pode interpretar como referência mas não garante o pixel-perfect.
- Resultado: o usuário escolhe "Capa Spotify" e recebe arquivo bem menor que o anunciado, fora do spec real do Spotify (3000×3000 mínimo).

## Mudanças propostas

### 1. Atualizar specs reais das plataformas (`FormatSelector.tsx`)

Alinhar com requisitos oficiais:

| Formato         | Atual       | Correto              |
|-----------------|-------------|----------------------|
| Capa Spotify    | 1920×1920   | **3000×3000**        |
| Capa Deezer     | 1920×1920   | **3000×3000**        |
| Capa Tidal      | 1920×1920   | **3000×3000**        |
| Capa YouTube    | 1280×720    | **1920×1080**        |
| Banner Spotify  | 1280×720    | 2560×1440            |
| Twitter/X       | 1600×900    | 1600×900 (ok)        |
| Post IG / Story / Reels | 1080×… | (ok)              |

Atualizar `description` para refletir os novos números.

### 2. Garantir aspect ratio correto na IA

No edge function `generate-creative`, trocar a instrução de "Aspect ratio: WxH" por uma orientação semântica que o modelo respeita melhor:
- Calcular `gcd(width, height)` → `aspect ratio: 1:1` / `9:16` / `16:9` / `4:5`.
- Reforçar com texto: `Output MUST be a [1:1 square / 9:16 vertical / 16:9 horizontal] composition.`

### 3. Upscale server-side para resolução final

Adicionar etapa de pós-processamento no edge function usando `ImageScript` (Deno-native, sem deps nativas):

```ts
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

// Após receber imageData base64:
const raw = imageData.replace(/^data:image\/\w+;base64,/, "");
const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
const img = await Image.decode(bytes);

// Crop para o aspect ratio exato (caso a IA tenha desviado)
const targetRatio = width / height;
const currentRatio = img.width / img.height;
if (Math.abs(targetRatio - currentRatio) > 0.02) {
  // center-crop para o aspect alvo
  ...
}

// Resize para a resolução nominal
const resized = img.resize(width, height);
const out = await resized.encode(); // PNG
imageData = `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(out)))}`;
```

Isso garante que **o arquivo entregue tenha exatamente as dimensões prometidas** (ex.: 3000×3000 para Spotify), independentemente do que a IA produziu.

### 4. UI de transparência

- Em `ImagePreview.tsx`, mostrar badge com a resolução real do arquivo gerado (`{width}×{height} px`).
- No `FormatChips`, manter dimensões na descrição secundária para reforçar a expectativa.

## Arquivos editados

- `src/components/creative/FormatSelector.tsx` — specs corretas
- `supabase/functions/generate-creative/index.ts` — aspect-ratio semântico + upscale com ImageScript
- `src/components/creative/ImagePreview.tsx` — badge de resolução

## Notas técnicas

- **ImageScript** é puro TypeScript, roda no edge runtime sem binários nativos.
- Upscale 1024 → 3000 com Lanczos é qualidade aceitável para capas de streaming (e é o que apps como Distrokid já fazem internamente). Para qualidade máxima, futuramente trocar pelo modelo `google/gemini-3-pro-image-preview` que pode entregar resolução nativa maior.
- Tempo extra de processamento: ~1–2s por imagem.
- Sem mudança de schema, sem novos secrets.

Aprove para executar.