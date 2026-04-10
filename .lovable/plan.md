
# Expandir opções de função/profissão no convite de parceiros

## Contexto
Atualmente, o wizard de "Adicionar à equipe" oferece apenas 4 tipos: **Instrumentista, Produtor, Mix, Master**. Faltam profissões relevantes para o ciclo de produção musical como Videomaker, Fotógrafo, Diretor Criativo, Compositor, Arranjador, etc.

## Plano

### 1. Expandir `WizardProfType` com categorias relevantes

Substituir os 4 botões fixos por uma seleção mais completa, porém **curada para o contexto de produção musical**. Profissões como "Gestor de Mídias Sociais" ou "Assessor de Imprensa" não participam diretamente de um projeto de estúdio e ficarão de fora.

**Categorias propostas (8 opções):**

| Tipo | Ícone | Specialty padrão |
|------|-------|-----------------|
| Instrumentista | Guitar | (livre) |
| Produtor | Layers | Produtor |
| Mix | Sliders | Mix Engineer |
| Master | Mic | Mastering Engineer |
| Compositor | FileText | Compositor |
| Arranjador | Music | Arranjador |
| Videomaker | Video | Videomaker |
| Fotógrafo | Camera | Fotógrafo |

### 2. Ajustar layout do grid

Mudar de `grid-cols-4` para `grid-cols-4 sm:grid-cols-4` com 2 linhas (8 itens), mantendo visual compacto. Em mobile, usar `grid-cols-3` para não comprimir demais.

### 3. Atualizar `profTypeSpecialty` e `profTypeIcons`

Adicionar as novas entradas nos dois mapeamentos existentes em `src/pages/Projects.tsx`.

### 4. Sincronizar com `SPECIALTY_OPTIONS` do perfil

As novas opções já existem em `FreelancerProfile.tsx` (`SPECIALTY_OPTIONS`), portanto a consistência entre perfil e convite será mantida.

---

**Arquivo editado:** `src/pages/Projects.tsx` (tipos, mapeamentos e grid do wizard).

**Sem alterações no banco de dados** — o campo `professional_role` em `project_invitations` já é texto livre.
