

# Redesign UX do Módulo Criativo — Eliminar Fricção

## Diagnóstico de Problemas

Analisando o fluxo atual com olhar de UI-CX:

1. **Sobrecarga cognitiva no primeiro contato**: 6+ campos visíveis simultaneamente (track name, artist, prompt, format, style, reference) antes de qualquer ação. No viewport mobile (434px), o botão "Gerar" fica abaixo do fold.

2. **Hierarquia invertida**: O **formato** (decisão primária que define o canvas) está escondido dentro de "Configurações" colapsáveis. O usuário precisa de 2 cliques para chegar nele.

3. **Campos sempre visíveis sem necessidade**: "Nome da música" e "Artista" aparecem mesmo quando o usuário quer criar arte genérica sem vínculo musical. Poluição visual.

4. **Fluxo DNA→Criativo desconectado**: O banner DNA é informativo mas não guia o próximo passo. O usuário chega com tudo pré-preenchido mas ainda precisa scrollar até "Gerar".

5. **QuickTemplates desaparece cedo demais**: Só aparece se prompt vazio E sem imagem gerada. Após gerar uma vez, nunca mais volta.

6. **Preview e controles em colunas separadas no mobile**: No viewport 434px, o grid `md:grid-cols-2` colapsa para 1 coluna, criando scroll infinito.

## Solução: Layout de Fluxo Linear com Revelação Progressiva

### Princípio
Mostrar apenas o que importa no momento. Cada decisão revela a próxima.

### Estrutura nova

```text
┌─────────────────────────────────────┐
│ [Format chips]  Spotify · Insta · + │  ← Formato como PRIMEIRA escolha
├─────────────────────────────────────┤
│ 🧬 DNA: "Noite Clara" — MPB    ✕   │  ← Banner DNA (se ativo)
├─────────────────────────────────────┤
│ [Prompt textarea]                   │  ← Prompt como área principal
│ "Capa artística para single..."     │
├─────────────────────────────────────┤
│ ▸ Detalhes da faixa (opcionais)     │  ← Collapsible: track/artist/date
│ ▸ Estilo e referência               │  ← Collapsible: style/ref image
├─────────────────────────────────────┤
│        [ ✨ Gerar Imagem ]          │  ← Botão sempre visível
├─────────────────────────────────────┤
│          [PREVIEW]                  │  ← Preview logo abaixo
│     Baixar · Variação · Editar      │
└─────────────────────────────────────┘
```

### Mudanças Concretas

**1. Formato como chips horizontais scrolláveis no topo (não dentro de Settings)**
- Remover o FormatSelector colapsável de dentro de "Configurações"
- Adicionar uma fila horizontal de chips scrolláveis com os formatos mais usados (Spotify, Instagram Post, Story, YouTube) + botão "Mais" que abre o seletor completo
- Seleção de formato é o ato #1 do usuário

**2. Colapsar "Detalhes da faixa" por padrão (abrir automaticamente se DNA ativo)**
- Track name, artist name, release date vão para dentro de um Collapsible "Detalhes da faixa"
- Se `dnaSource` está ativo OU se `trackName` já tem valor → abrir automaticamente
- Caso contrário, colapsado — zero ruído para quem só quer arte genérica

**3. Colapsar "Estilo e referência" (manter como está, renomear)**
- O Collapsible existente "Configurações" perde o formato (que subiu) e o projeto
- Renomear para "Estilo e referência"
- Projeto selector vai para dentro de "Detalhes da faixa"

**4. Layout single-column em mobile, side-by-side em desktop**
- Mover preview para ABAIXO do botão gerar em mobile (já é assim, mas garantir que o botão fica acima do fold)
- Em desktop (md+), manter grid 2 colunas

**5. Botão "Gerar" sticky no mobile**
- Quando o prompt tem conteúdo, fixar o botão de gerar no bottom do viewport em mobile para que nunca fique fora do alcance

**6. Quick templates como estado vazio do prompt**
- Mostrar templates como placeholders clicáveis DENTRO da área de prompt quando vazio
- Não como componente separado que desaparece

## Arquivos modificados

- `src/pages/Creative.tsx` — reestruturar layout, chips de formato no topo, collapsibles reorganizados, botão sticky mobile
- `src/components/creative/FormatSelector.tsx` — adicionar modo `chips` (horizontal scrollável) além do modo expandido
- `src/components/creative/QuickTemplates.tsx` — adaptar para inline no textarea

## Sem migrações de banco
Mudanças puramente de UI/UX.

