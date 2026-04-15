

# Criador de Peças Visuais com IA — "Criativo"

## Resumo
Novo módulo `/criativo` que permite ao artista gerar capas, banners, posts para redes sociais e thumbnails para streaming usando IA generativa de imagens (Lovable AI — modelo `google/gemini-3.1-flash-image-preview`). O fluxo é simples: escolher formato, descrever a ideia, gerar, ajustar e baixar.

---

## Funcionalidades

### Tela principal (`/criativo`)
- **Seletor de formato** com presets visuais:
  - Post Instagram (1080×1080)
  - Story/Reels (1080×1920)
  - Capa YouTube (2560×1440)
  - Banner Spotify (2660×1140)
  - Post Twitter/X (1600×900)
  - Formato livre (custom)
- **Campo de prompt** com sugestões contextuais (ex: "Capa do single 'Nome da Música' com estética lo-fi e cores quentes")
- **Chips de estilo rápido**: Minimalista, Retro, Neon, Aquarela, Colagem, Fotorrealista
- **Botão "Gerar"** → chama edge function → retorna imagem
- **Preview** da imagem gerada com opções:
  - "Gerar variação" (mesmo prompt, nova geração)
  - "Editar com IA" (adicionar texto, mudar cor, ajustar elemento)
  - "Baixar" (PNG em resolução original)
  - "Salvar na galeria" (persiste no storage para reuso)

### Galeria de criações
- Lista de imagens salvas pelo artista no bucket `creative-assets`
- Filtro por formato e data
- Re-edição a partir de imagem existente

### Integração com Projetos
- No hub do projeto, aba ou seção "Material Visual" com link para `/criativo?project=ID`
- Prompt pré-preenchido com nome do projeto/artista

---

## Arquitetura técnica

### Edge Function: `supabase/functions/generate-creative/index.ts`
- Recebe: `prompt`, `style`, `width`, `height`, `editImage?` (base64 opcional)
- Chama Lovable AI Gateway com modelo `google/gemini-3.1-flash-image-preview`
- Retorna imagem base64
- Faz upload automático para bucket `creative-assets` e retorna URL pública
- Registra uso em `ai_invocations`

### Storage
- Novo bucket `creative-assets` (público) para imagens geradas
- Path: `{user_id}/{timestamp}_{format}.png`

### Tabela (nova)
```sql
CREATE TABLE public.creative_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  style TEXT,
  format TEXT NOT NULL, -- 'instagram_post', 'story', 'youtube_cover', etc.
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.creative_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own assets"
  ON public.creative_assets FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Frontend
| Arquivo | Descrição |
|---|---|
| `src/pages/Creative.tsx` | Página principal com seletor de formato, prompt, preview e galeria |
| `src/hooks/useCreativeAssets.ts` | CRUD de assets + chamada à edge function |
| `src/components/creative/FormatSelector.tsx` | Grid visual com presets de dimensão |
| `src/components/creative/ImagePreview.tsx` | Preview com ações (baixar, editar, salvar) |
| `src/components/creative/StyleChips.tsx` | Chips de estilo rápido |

### Navegação
- Novo item no menu lateral: ícone `Palette` (lucide), label "Criativo"
- Posição: após "DNA Musical" no grupo Gestão

---

## Fluxo do usuário

```text
1. Artista abre /criativo
2. Escolhe formato (ex: "Post Instagram")
3. Digita prompt: "Capa minimalista com violão acústico e tons terrosos"
4. (Opcional) Seleciona estilo: "Minimalista"
5. Clica "Gerar" → loading com skeleton
6. Imagem aparece no preview
7. Pode: baixar, gerar variação, editar com IA, ou salvar na galeria
8. Imagens salvas ficam acessíveis na galeria para reuso
```

## Sem dependências externas
Usa exclusivamente Lovable AI (`google/gemini-3.1-flash-image-preview`) — sem API key adicional.

