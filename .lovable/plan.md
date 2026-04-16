

# Diagnóstico CX — Menu "Mais" (mobile)

## O que existe hoje
Bottom nav fixa com 5 slots: Home, Projetos, Finanças, Agenda, **Mais**. O botão "Mais" abre um `Sheet` inferior com grid 3-colunas contendo 6 itens em ordem de declaração:

```text
[ DNA Musical ]  [ Editais ]   [ Criativo ]
[ Profissionais] [ Tutorial ]  [ Configurações ]
```

Abaixo, botão "Sair" no rodapé do drawer.

## Problemas identificados

### 1. Hierarquia plana — todos os 6 itens com mesmo peso visual
Tutorial e Configurações (utilitários, baixa frequência) recebem o mesmo card com borda/altura de DNA Musical, Editais, Criativo (features core, alta frequência). Para o usuário, "Mais" parece um catálogo desorganizado.

### 2. Ordem não reflete uso nem importância
Sequência atual segue ordem do array `gestaoItems`, não frequência ou jornada:
- **DNA Musical** e **Criativo** são features pesadas de IA, usadas pontualmente
- **Editais** e **Profissionais** têm uso recorrente para artistas ativos
- **Tutorial** deveria estar visualmente separado (raramente revisitado após onboarding)
- **Configurações** está enterrada no canto inferior direito (péssimo para mão direita em telas grandes — 414×817)

### 3. Mistura de "features" com "utilitários" sem separador
Tutorial e Configurações deveriam ficar em uma seção secundária visualmente distinta (ex.: lista compacta abaixo do grid, igual ao "Sair"), liberando o grid para apenas as 4 features de produto.

### 4. Sem rótulo/contexto sobre o que cada feature faz
"DNA Musical", "Editais", "Criativo" são nomes internos. Usuário novo abre "Mais" e não sabe que Criativo gera arte com IA ou que Editais monitora chamadas públicas. Falta legenda de 2-3 palavras (sub-label).

### 5. Botão "Sair" destoa do padrão
É um `Button ghost` de largura total enquanto tudo acima é grid de cards. Quebra leitura.

### 6. Falta de "recentes" / atalho contextual
Em apps maduros (Notion, Linear), o "Mais" lembra os 1-2 itens mais usados ou último acessado no topo. Aqui, sempre o mesmo grid estático.

### 7. Densidade desperdiçada
Grid 3×2 com cards de `min-h-[72px]` ocupa ~250px verticais para 6 itens. Em telas pequenas (375px), isso empurra "Sair" e força scroll do drawer.

### 8. Indicador "Pro" inconsistente
Lógica `locked` existe mas hoje todos os itens têm `proOnly: false` — código morto que polui o componente.

## Recomendações (priorizadas)

### P0 — Reorganizar em duas seções semânticas
```text
FERRAMENTAS                          ← seção 1 (grid)
[ Editais ]  [ Criativo ]  [ DNA ]
[ Profissionais ]

CONTA                                ← seção 2 (lista compacta)
⚙  Configurações
?  Tutorial
↗  Sair                              ← já em destaque
```
Reduz ruído, separa "o que faço" de "como ajusto".

### P1 — Reordenar grid por frequência de uso real
Sugestão baseada na jornada do artista independente:
1. **Editais** (recorrente — buscar editais semanalmente)
2. **Profissionais** (recorrente — gerenciar contatos)
3. **Criativo** (sob demanda — arte para releases)
4. **DNA Musical** (pontual — análises de master)

Validar com analytics (`pageviews` por rota dos últimos 30 dias) — posso consultar via `analytics--read_project_analytics` se quiser dados antes de implementar.

### P2 — Adicionar sub-label de 1 linha
```text
┌──────────────┐
│  📄 Editais  │
│  Chamadas e  │
│  inscrições  │
└──────────────┘
```
2 palavras-chave em `text-[10px] text-muted-foreground`. Resolve o "o que é isso?" do usuário novo.

### P3 — Promover "Configurações" do drawer para o header mobile
Adicionar ícone ⚙ ao lado do sino de notificações no header (já tem espaço). Configurações é acesso de "manutenção" que não compete com features — não precisa de slot no drawer principal.

### P4 — Limpeza de código
Remover lógica `proOnly`/`locked` do menu (não usada hoje) para reduzir ruído visual no JSX e simplificar manutenção.

### P5 (opcional) — Atalho contextual
Mostrar chip "Visto recentemente" acima do grid quando aplicável, com último item acessado fora dos primários. Baixo ROI no MVP, postergar.

## Resumo executivo
O menu "Mais" funciona, mas trata 6 itens heterogêneos como iguais. As três mudanças de maior impacto (P0 + P1 + P2) levam o usuário de "lista de coisas" para "ferramentas claras + conta", alinhado ao padrão macOS minimalista do projeto.

**Quer que eu implemente?** Sugiro começar por **P0 + P1 + P4** (agrupamento + reordenação + limpeza) como primeira PR, e P2 (sub-labels) numa segunda iteração após validar copy.

