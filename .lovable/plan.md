

# Fechar modal de edição imediatamente ao submeter

## Problema
Atualmente, ao clicar "Aplicar Edição", o modal permanece aberto durante todo o processamento da IA (que pode demorar vários segundos). O usuário fica preso no modal aguardando.

## Solução
Fechar o dialog imediatamente ao submeter e mostrar o loading no preview principal (ImagePreview já suporta `isLoading`).

## Mudança em `src/pages/Creative.tsx`

Na função `handleEditSubmit` (linha ~290), mover `setEditDialogOpen(false)` para antes da chamada `generate`:

```typescript
const handleEditSubmit = async () => {
  if (!editPrompt.trim() || !generatedBase64) return;
  setEditDialogOpen(false);        // fecha modal imediatamente
  setEditingLoading(true);
  const result = await generate({...});
  if (result) {
    setGeneratedImage(result.imageUrl);
    setGeneratedBase64(result.imageBase64);
  }
  setEditingLoading(false);
};
```

Verificar que o `ImagePreview` recebe `isLoading={generating || editingLoading}` para exibir o skeleton enquanto a edição processa.

## Arquivo modificado
- `src/pages/Creative.tsx`

