# Enxugar redundâncias da análise de áudio

Escopo aprovado: **A, B, C, E, G, H**. (Mantidos: D — Perfil acústico permanece; F — botão "Nova análise" do footer permanece.)

Arquivo único afetado: `src/components/music-dna/MusicDNAAnalyzer.tsx`.

## Mudanças

### A — Resumo executivo: remover os 3 cards "Força/Gargalo/Próxima ação"
- Apagar o bloco `<div className="grid grid-cols-1 md:grid-cols-3 gap-2">…</div>` (linhas ~478–489) e as constantes `primaryStrength`, `mainBottleneck`, `nextAction` que só servem a ele.
- Mantém: texto `diagnostico_resumo`, badges de status/confiança, feedback A/B e CTA "Adicionar N ações". Esse 1º item já aparece nas listas completas da seção "Diagnóstico" logo abaixo.

### B — Remover `PlatformCompatibilityCard` do topo
- Apagar `<PlatformCompatibilityCard lufs={lufsValue} />` (linha 1360). LUFS continua no MetricCard da seção "Técnico" + nas badges do resumo.
- Remover o import se não restar outro uso.

### C — Fundir "Análise de seções" + "Timeline de seções"
- Criar uma única seção `dna-secoes` "Seções da faixa" contendo:
  - **Timeline visual** (a barra colorida atual) primeiro.
  - Abaixo, em layout compacto, as 3 linhas textuais: *Contraste verso→refrão*, *Seção mais forte*, *Seção mais fraca* (só quando `analise_seccoes` existir).
- Eliminar o `DetailSection id="dna-timeline"` separado; passar seu conteúdo para dentro do `dna-secoes`.

### E — Enxugar "Diagnóstico Técnico"
- O `MetricCard` já mostra valor + alvo + range. Filtrar `technicalItems` para exibir **apenas** itens cujo `text` traga interpretação qualitativa que não esteja implícita no card (ex.: descrição de causa/efeito, recomendação contextual).
- Heurística simples: ocultar item se `text` for curto (< 40 chars) ou for só repetição numérica do valor já exibido. Caso o filtro elimine todos, esconder o card "Diagnóstico Técnico" inteiro.

### G — Remover chip "Catálogo: N faixas" do resumo
- Apagar o `<span>` que renderiza `Catálogo: {totalCompared}` (≈ linha 531). A informação já aparece no `BenchmarkPanel` (seção Referências).

### H — Sincronizar sticky nav
- Lista atual: Resumo / Diagnóstico / Identidade / Técnico.
- Atualizar para refletir as seções reais pós-refactor:
  `Resumo · Diagnóstico · Identidade · Referências · Técnico · Seções · Perfil`.
- Continuar usando `jumpTo(id)` com os ids existentes (`dna-resumo`, `dna-acoes`, `dna-identidade`, `dna-referencias`, `dna-tecnico`, `dna-secoes`, `dna-perfil`).
- Renderizar cada item condicionalmente: só mostra "Seções" se houver `analise_seccoes` **ou** `realAnalysis.sections`; só mostra "Perfil" se houver `trackFeatures`/`refFeatures`.

## Fora de escopo

- D (Perfil acústico) — preservado.
- F (botão duplicado no footer) — preservado.
- Mudança de ordem das seções, conteúdo do `BenchmarkPanel`, `TimbralMap`, `PlaylistMatchCard`.

## Validação

- Conferir visualmente no preview com uma análise ativa.
- Garantir que a página não quebra quando `analise_seccoes` ou `realAnalysis.sections` estão ausentes (cobertura H).
