

# Diagnóstico UX/CX — Jornada do Criativo

## Mapa de Fricção da Jornada

```text
ENTRADA → CONFIGURAÇÃO → CRIAÇÃO → RESULTADO → ITERAÇÃO → GALERIA
  [1]        [2][3]        [4]       [5][6]      [7][8]     [9][10]
```

Cada número corresponde a um ponto de fricção identificado abaixo.

---

## Fricções Identificadas

### [1] Entrada fria — sem onboarding contextual
O artista chega na tela e vê 5 campos empilhados (Projeto, Formato, Estilo, Referência, Prompt) sem hierarquia de importância. Não há indicação de por onde começar. O empty state do preview ("Escolha um formato, descreva sua ideia e clique em Gerar") é genérico demais.

**Melhoria:** Adicionar um estado inicial guiado com 2-3 templates rápidos ("Capa de single", "Post de lançamento", "Story de bastidores") que pré-preenchem formato + estilo + prompt-modelo. O artista clica e já tem um ponto de partida editável. Reduz a "folha em branco" que paralisa.

### [2] Seletor de formato — sobrecarga visual
10 formatos em grid de 3 colunas com cards de 80px mínimos. No mobile (434px), isso gera 4 linhas de scroll antes de chegar ao prompt. Formatos semelhantes (Spotify Cover, Deezer Cover, Tidal Cover — todos 1920x1920) não são agrupados.

**Melhoria:** Agrupar formatos em categorias colapsáveis ("Redes Sociais", "Streaming", "Personalizado"). Mostrar apenas os mais usados por padrão, com "Ver mais" para o restante. Reduz a carga cognitiva de 10 para 3-4 opções visíveis.

### [3] Ordem dos campos inverte a lógica mental
O artista precisa primeiro escolher formato e estilo para só depois descrever a ideia. Mas mentalmente, o processo criativo é inverso: primeiro a ideia, depois as especificações técnicas. O prompt fica enterrado abaixo de 3 seções de configuração.

**Melhoria:** Reorganizar: Prompt primeiro (a ideia), depois Formato, Estilo e Referência como "Configurações" em um accordion/collapsible que abre expandido mas pode ser colapsado. O prompt é o protagonista.

### [4] Sem feedback de progresso real durante geração
O loading mostra apenas um skeleton quadrado fixo e "Gerando imagem com IA…". A geração leva 10-30 segundos. Sem indicação de etapa, o artista não sabe se travou.

**Melhoria:** Adicionar micro-etapas animadas: "Interpretando sua ideia…" → "Compondo a arte…" → "Finalizando…" (ciclo temporizado a cada 5s). Não é progresso real, mas dá sensação de atividade e reduz ansiedade de espera.

### [5] Preview não mostra o formato escolhido
A imagem gerada é exibida em `max-w-md w-full` sem indicar que é uma capa Spotify 1:1 vs. um Story 9:16. O artista não tem referência de como a arte ficará na plataforma real.

**Melhoria:** Exibir a imagem no aspect ratio real do formato selecionado com label de dimensões (ex: "Capa Spotify — 3000×3000"). Adicionar uma moldura sutil simulando onde a arte apareceria (player do Spotify, feed do Instagram).

### [6] Ações pós-geração não têm hierarquia
Quatro botões iguais (Variação, Editar, Desdobrar, Baixar) em linha, todos `variant="outline"`. O artista não sabe qual é a próxima ação mais provável. Na prática, "Baixar" e "Variação" são os mais usados, mas recebem o mesmo peso visual de "Desdobrar".

**Melhoria:** "Baixar" como botão primário (filled), "Variação" e "Editar" como secondary, "Desdobrar" como link/texto. Agrupa por frequência de uso.

### [7] Edição com IA é um Input, deveria ser Textarea
O dialog de edição usa `<Input>` de uma linha. Instruções de edição costumam ser mais elaboradas ("Remover o fundo, adicionar gradiente azul, e colocar o título 'Novo Single' em letras brancas no topo"). Uma linha não acomoda isso.

**Melhoria:** Trocar Input por Textarea de 3 linhas, consistente com o prompt principal.

### [8] Variação reutiliza exatamente o mesmo prompt
Clicar "Variação" chama `handleGenerate` que usa o mesmo prompt. O artista não tem como pedir "igual mas com cores diferentes" sem editar manualmente o prompt e regerar. A variação deveria ser semântica, não idêntica.

**Melhoria:** Ao clicar "Variação", enviar o prompt original + a imagem gerada como referência automaticamente, com instrução interna "Crie uma variação desta arte mantendo o conceito mas alterando composição e paleta". Isso dá resultados realmente diferentes.

### [9] Galeria — ações invisíveis no mobile
As ações da galeria (Baixar, Referência, Desdobrar, Excluir) aparecem em hover overlay (`group-hover:opacity-100`). No mobile/touch, hover não existe — essas ações ficam completamente inacessíveis.

**Melhoria:** No mobile, mostrar as ações via long-press/tap que abre um bottom sheet com as opções. Ou sempre visíveis em um footer discreto abaixo de cada card.

### [10] Sem histórico de prompt na galeria
Ao ver uma arte na galeria, o prompt aparece truncado em 2 linhas no overlay. O artista não consegue reutilizar o prompt que gerou um bom resultado sem adivinhá-lo.

**Melhoria:** Ao clicar/tap na arte, abrir um detail sheet mostrando: imagem em tamanho real, prompt completo, formato, estilo, data, e ações. Isso também resolve o problema [9] de acessibilidade no mobile.

---

## Plano de Implementação

### Arquivo: `src/pages/Creative.tsx`
- Reorganizar layout: prompt primeiro, configurações em collapsible abaixo
- Adicionar 3 templates rápidos no empty state ("Capa de single", "Post de lançamento", "Story de bastidores")
- Variação: passar imagem atual como referência automaticamente com instrução de variação
- Galeria: adicionar detail dialog ao clicar na arte (prompt completo, ações, metadata)
- Galeria mobile: substituir hover overlay por tap-to-detail

### Arquivo: `src/components/creative/ImagePreview.tsx`
- Aceitar `formatLabel` e `aspectRatio` como props para exibir a moldura contextual
- Hierarquizar botões: "Baixar" primário, "Variação"/"Editar" secondary, "Desdobrar" ghost
- Adicionar micro-etapas animadas no loading ("Interpretando…", "Compondo…", "Finalizando…")

### Arquivo: `src/components/creative/FormatSelector.tsx`
- Agrupar formatos em categorias colapsáveis (Redes Sociais, Streaming, Custom)
- Mostrar 3-4 mais comuns expandidos, restante sob "Ver mais"

### Arquivo: `src/pages/Creative.tsx` (Edit Dialog)
- Trocar `<Input>` por `<Textarea rows={3}>` no dialog de edição

### Sem alterações de backend
Toda a lógica permanece na edge function existente. As melhorias são puramente de frontend/UX.

