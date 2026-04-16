

# Diagnóstico do Módulo Criativo — Inconsistências, Erros e Melhorias

## Problemas Encontrados

### 1. Botão "Salvar" fantasma (BUG)
O `ImagePreview` exibe um botão "Salvar" que chama `onSave={() => {}}` — uma função vazia. A imagem já é salva automaticamente pela edge function. Isso confunde o artista: o botão existe, mas não faz nada de útil. Deve ser removido.

### 2. Sem validação de cota de IA antes de gerar (INCONSISTENCIA)
O sistema tem cotas de fair-use (`ai_usage`: 20 diárias, 80 semanais), mas a edge function `generate-creative` não verifica essas cotas antes de chamar a IA. O artista só descobre que excedeu o limite quando recebe erro 429 do gateway, sem feedback claro. A verificação deveria acontecer no backend.

### 3. Download cross-origin falha silenciosamente (BUG)
O download usa `<a href="URL_PUBLICA" download="...">`. Para URLs de domínio diferente (Supabase Storage), o atributo `download` é ignorado pelo navegador — abre em nova aba em vez de baixar. Precisa de fetch + blob para funcionar.

### 4. Galeria mostra todas as artes sem filtro (MELHORIA UX)
Não há filtro por projeto, formato ou estilo. Conforme o artista acumula artes, encontrar uma específica se torna difícil. Adicionar filtros básicos agrega valor.

### 5. Exclusão sem confirmação (BUG UX)
O botão de deletar na galeria apaga imediatamente sem nenhum diálogo de confirmação. Um clique acidental perde a arte permanentemente (storage + banco).

### 6. `handleGenerate` e `handleRegenerate` são duplicados (TECH DEBT)
Os dois callbacks são quase idênticos — código duplicado que pode divergir com o tempo.

### 7. Galeria usa `aspect-square` para todos os formatos (INCONSISTENCIA VISUAL)
Todas as thumbnails são quadradas, mas os assets podem ser Story (9:16), YouTube (16:9), etc. O artista não consegue distinguir visualmente os formatos na galeria.

### 8. Formato "Livre" não permite dimensões customizadas (FEATURE INCOMPLETA)
O formato "Livre/Custom" está fixo em 1024x1024. Não há campos para o artista inserir largura/altura personalizadas, contradizendo o propósito do formato.

### 9. Seletor de projeto ausente na tela (MELHORIA)
O contexto de projeto só funciona via URL param (`?project=ID`). O artista não tem como vincular/trocar projeto dentro da própria tela Criativo.

### 10. DeriveBatchDialog não reseta canais ao reabrir (BUG)
O estado `channels` é inicializado uma vez com `useState`. Quando o dialog é reaberto, as seleções anteriores persistem de forma inconsistente.

---

## Plano de Correções

### Arquivo: `src/components/creative/ImagePreview.tsx`
- Remover o botão "Salvar" e a prop `onSave`/`isSaving`/`isSaved`
- Adicionar badge textual "Salvo automaticamente" discreto

### Arquivo: `src/pages/Creative.tsx`
- Unificar `handleGenerate` e `handleRegenerate` em uma única função
- Remover props `onSave`/`isSaving`/`isSaved` da chamada ao ImagePreview
- Adicionar `AlertDialog` de confirmação no delete da galeria
- Adicionar seletor de projeto (dropdown dos projetos do artista)
- Adicionar filtros básicos na galeria (por formato/projeto)
- Corrigir download cross-origin com fetch+blob
- Mostrar thumbnails com aspect ratio real do asset

### Arquivo: `src/components/creative/FormatSelector.tsx`
- Quando "Livre" selecionado, exibir inputs de largura/altura customizáveis

### Arquivo: `src/components/creative/DeriveBatchDialog.tsx`
- Resetar seleção de canais ao abrir o dialog

### Arquivo: `supabase/functions/generate-creative/index.ts`
- Consultar `ai_usage` antes de invocar a IA e retornar erro amigável se cota excedida

### Sem migrações de banco
Toda a infraestrutura já existe.

