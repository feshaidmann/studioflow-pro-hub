

## Plano: Mover lista de artistas comparados apenas para o relatório

Hoje a lista completa de `REFERENCE_ARTISTS` (16 nomes) é exibida como "referências sugeridas" no painel de input do `MusicDNAAnalyzer`, antes mesmo de o usuário gerar o diagnóstico. Isso polui a tela inicial e cria confusão: o usuário vê uma lista genérica que não tem relação direta com a faixa dele.

### Mudança proposta

**Remover a exibição prévia** dos artistas no formulário de upload e manter os artistas **apenas no relatório de resultado**, no bloco `referencias_proximas` que a IA já devolve com:

- Nome do artista
- Percentual de similaridade
- Motivo técnico da aproximação

Essas referências contextualizadas (3–5 artistas escolhidos pela IA com base nas métricas reais da faixa) são muito mais úteis do que uma lista fixa de 16 nomes mostrada antes da análise.

### Arquivos a modificar

- `src/components/music-dna/MusicDNAAnalyzer.tsx` — remover o bloco/seção que renderiza `REFERENCE_ARTISTS` no formulário de input. O bloco de resultado (`referencias_proximas`) já existe e permanece intacto.

### O que **não** muda

- `REFERENCE_ARTISTS` continua exportado em `useMusicDNA.ts` (ainda é enviado no prompt da IA como pool de escolha)
- Bloco de resultado com artistas comparados permanece exatamente como está
- Sem mudanças de banco, edge function ou prompt

### Combinação com a expansão proposta antes

Essa mudança fica **alinhada** com o plano de expandir para ~60 artistas: como a lista nunca mais aparece na tela, podemos ampliá-la sem preocupação com poluição visual. O usuário só vê os 3–5 artistas que a IA realmente escolheu como próximos.

