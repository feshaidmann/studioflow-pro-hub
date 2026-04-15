

# Upload de Ativos Próprios para Geração com IA

## Resumo
Adicionar zona de upload de imagem de referência na tela Criativo, permitindo que o artista envie fotos, logos ou ilustrações como base para a geração/edição com IA. A infraestrutura backend já suporta isso (`editImageUrl`).

## Mudanças

### 1. Componente de upload de referência
**Novo:** `src/components/creative/ReferenceImageUpload.tsx`
- Dropzone com drag-and-drop e botão "Escolher arquivo"
- Aceita PNG, JPG, WEBP (max 5MB)
- Preview da imagem carregada com botão de remover
- Converte o arquivo para base64 `data:image/...` para enviar à edge function
- Posicionado entre os chips de estilo e o campo de prompt

### 2. Integrar na página Creative
**Arquivo:** `src/pages/Creative.tsx`
- Novo state `referenceImage: string | null` (base64)
- Passar `referenceImage` como `editImageUrl` ao chamar `generate()`
- Quando há imagem de referência, o label do botão muda para "Gerar a partir da referência"
- Texto de ajuda: "A IA usará esta imagem como base para criar sua peça"

### 3. Galeria como fonte de referência
**Arquivo:** `src/pages/Creative.tsx`
- Na galeria, adicionar botão "Usar como referência" no hover de cada asset
- Ao clicar, carrega a `public_url` do asset como `editImageUrl` e volta para a aba "Criar"

### 4. Hook — passar editImageUrl na geração principal
**Arquivo:** `src/hooks/useCreativeAssets.ts`
- Já suporta `editImageUrl` — nenhuma mudança necessária

### 5. Edge function
**Arquivo:** `supabase/functions/generate-creative/index.ts`
- Já suporta `editImageUrl` via multimodal content — nenhuma mudança necessária

## Arquivos impactados

| Arquivo | Tipo |
|---|---|
| `src/components/creative/ReferenceImageUpload.tsx` | Novo |
| `src/pages/Creative.tsx` | Modificado |

## Sem migrações de banco de dados
Toda a infraestrutura já existe.

