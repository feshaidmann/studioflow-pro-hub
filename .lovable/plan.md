

# Plano: Filtro de status + ordenação por prazo

## O que será feito

Duas mudanças no `src/pages/Editais.tsx`:

### 1. Filtro de status
Adicionar um `Select` com opções "Todos", "Aberto", "Encerrado", "Indefinido" ao lado dos filtros existentes (UF/Área). O filtro se aplica tanto aos resultados da busca quanto aos editais salvos.

### 2. Ordenação: Abertos primeiro, prazo mais próximo no topo
Criar uma função `sortEditais(items)` que:
- Agrupa por status: "Aberto" primeiro, depois "Indefinido", depois "Encerrado"
- Dentro de cada grupo, ordena por `prazo` ascendente (mais próximo primeiro), com `null` no final

Ambas as listas (resultados e salvos) passam por `sortEditais(filterByStatus(items))`.

## Arquivo editado

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Editais.tsx` | Estado `filterStatus`, Select de status, função de sort/filter aplicada nas duas tabelas |

Nenhuma alteração de banco ou traduções necessária — os valores de status já são strings conhecidas.

