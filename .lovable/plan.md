## Inspeção de confiabilidade — "Referências mais próximas"

A seção combina duas fontes muito diferentes (catálogo medido + sugestões IA) sob a mesma UI, com o mesmo formato visual de "% de similaridade". Isso, hoje, gera um resultado de **confiabilidade média-baixa** e com risco real de ser interpretado de forma equivocada pelo usuário. Abaixo o diagnóstico por aba e as correções recomendadas — todas em camada de UI/prompt/RPC, sem mudar pipeline de extração.

---

### 1. Aba "Catálogo Real" — pontos críticos

**a) Catálogo enviesado para mercado anglo**
Snapshot atual de `music_reference_tracks` (1.351 faixas, 144 bandas):
- Pop 141, Hip-Hop 125, Rock 118, Jazz 111, Rock Alt 89, Indie Rock 74, Folk 74, Punk 73, Grunge 64, Eletrônico 61, Synth-Pop 60…
- BR: MPB 13, Bossa Nova 22, Funk 29, Soul 27, Reggae 32. **Sertanejo, Forró, Pagode, Trap BR, Axé, Piseiro, Manguebeat = 0.**

Consequência: para uma faixa de sertanejo/forró/funk BR/trap BR, os 6 vizinhos retornados são quase certamente **gêneros estrangeiros que apenas se assemelham espectralmente**, com similaridade exibida de 70-85%. O usuário lê isso como "minha música parece com o artista X" — falso positivo de identidade.

**b) RPC `find_nearest_reference_tracks` não filtra por gênero**
Chamada atual com `p_strict_genre = false`. O bônus de gênero é apenas `-0.10` no distance — facilmente superado por proximidade de LUFS/centroide. Resultado: cross-genre matches dominam quando o gênero do usuário é raro no catálogo.

**c) Score nunca é "zero"**
`similarity = 1 / (1 + norm_distance)` → mesmo distâncias enormes retornam ~30-50%. Combinado com `LIMIT 6` fixo, a UI sempre mostra 6 vizinhos, dando aparência de "encontramos referências" mesmo quando não há nada próximo. O aviso de `topSim < 55%` existe, mas só aparece para o **primeiro** vizinho — os 5 restantes continuam listados sem qualquer marca de baixa confiança.

**d) Mismatch de extratores (browser vs catálogo)**
Faixa do usuário: Web Audio API no navegador. Catálogo: pipeline Python/Librosa. LUFS, BPM, centroide e ZCR têm offsets sistemáticos entre os dois extratores. O tooltip atual já avisa, mas nenhuma normalização é aplicada — e o aviso fica escondido atrás de um ícone `Info`.

**e) Tom (key/mode) na linha do vizinho**
Web Audio extrai tom com confiabilidade baixa (algoritmo simples baseado em chroma). Mostrar "Tom F# minor" sem marcador de incerteza induz o usuário a crer que houve match tonal real. O bônus de `-0.15` por key+mode coincidentes amplifica esse risco.

**f) BPM half/double-time aware no SQL, mas não comunicado**
A coluna BPM mostra a diferença bruta (`fmtDelta`), não a corrigida. Pode aparecer "BPM 160 (Δ +80)" quando na verdade o match foi por 80 BPM (double-time). Confunde mais do que esclarece.

**g) Sem indicador de cobertura de features**
A RPC ignora silenciosamente features nulas (peso 0). Uma faixa com só LUFS+BPM presentes pode produzir similaridade alta com base em 2 dimensões. O usuário não vê **quantas dimensões realmente compararam**.

---

### 2. Aba "Sugestões IA" — pontos críticos

**a) "Similaridade" é texto livre do LLM**
Campo `similaridade: "84%"` é gerado pelo modelo, sem qualquer medição. Visualmente é idêntico ao % do catálogo (ambos `font-mono text-primary`), o que sugere a mesma natureza. Risco alto de interpretação errada.

**b) Sem validação do nome do artista**
O prompt instrui "não invente artistas fora desta lista" mas nada valida server-side. LLM pode citar artista que não está em `MUSIC_DNA_ARTIST_REFERENCES` nem nos vizinhos do catálogo.

**c) Lista curada não é exibida ao usuário**
`selectReferenceArtists` envia 18 artistas ao LLM com base em território (gênero+features). O usuário não sabe que existe esse "filtro de origem", então a sugestão parece clarividência.

**d) Sem fonte por sugestão**
Não há marcação se uma sugestão veio de "vizinho do catálogo" ou "lista curada de territórios". Reduz a auditabilidade.

**e) Aviso do topo é genérico**
"Sugestões da IA com base em proximidade técnica/sonora" não diferencia que **não há medição direta** entre a faixa do usuário e o artista citado.

---

### 3. Riscos transversais (ambas as abas)

- **Mesma escala visual para coisas incomparáveis**: 78% no catálogo (medido contra 1.351 faixas) e 84% da IA (estimativa narrativa) parecem do mesmo tipo.
- **Sem deduplicação**: se a IA cita um artista que aparece no catálogo, ele aparece duas vezes em abas diferentes sem cross-link.
- **Aba default**: lógica `topSim ≥ 55 → catálogo; senão → IA` é boa, mas reforça o problema (b) acima ao colocar IA como "fallback de confiança baixa".
- **`totalCompared` exibido só dentro do tooltip** — métrica de transparência mais importante deveria estar visível por padrão.

---

### 4. Plano de correções (somente UI + prompt + RPC params)

**A. Reposicionar o significado dos números** (UI, MusicDNAAnalyzer.tsx)
1. Catálogo: trocar "%" por **rótulo categórico** ("Próximo", "Aproximado", "Distante") com badge colorido + valor numérico em fonte menor entre parênteses. Limiares: ≥75 Próximo · 55-74 Aproximado · <55 Distante.
2. IA: remover o "%" totalmente. Substituir por chip "sugestão IA" + frase de motivo. Nunca exibir número que pareça medição.
3. Header da aba IA: tooltip explícito "Sem medição direta — baseado em padrões estilísticos do gênero".

**B. Filtrar resultados de baixa confiança no Catálogo**
4. Esconder vizinhos individuais com `similarity_score < 0.40` (não só o aviso do top). Se sobrarem 0, mostrar empty state honesto: "Nenhuma faixa do catálogo está suficientemente próxima — o catálogo cobre principalmente {lista de gêneros bem representados}."
5. Adicionar contador visível: "Comparado contra {N} faixas do catálogo, {M} no seu gênero ({genero})". Hoje só `totalCompared` aparece em tooltip.

**C. Marcar incerteza por dimensão**
6. Se `key_name` veio de Web Audio (sempre é o caso hoje), suprimir o "Tom X" do card de vizinho ou marcá-lo com `~`.
7. Mostrar contagem de features que entraram no score (ex: "comparado em 9/15 dimensões"). Requer ajustar a RPC para retornar `dims_used` (campo derivado do `total_weight`/peso máximo).

**D. RPC: bias para gênero quando catálogo é raso**
8. Quando o gênero do usuário tem `<30` faixas no catálogo, chamar a RPC com `p_strict_genre = true` E em paralelo sem strict; mesclar dando preferência aos do gênero. Se strict retornar 0, retornar nenhum resultado e exibir o empty state honesto.
9. Aumentar peso do bônus de gênero de `-0.10` para `-0.25` para reduzir cross-genre top-1 acidentais.

**E. Normalização cross-extractor (mínima)**
10. Aplicar offsets conhecidos client-side antes de chamar a RPC (offsets empíricos: ex. `lufs_browser += 0.8`, `centroid_browser *= 0.92`). Documentar como "calibração v1" no código. Pode ser stub inicial com offsets 0 e atualizado depois.

**F. Validação do nome do artista IA**
11. No client (após receber a resposta), filtrar `referencias_proximas` removendo artistas que não estão em `ALL_REFERENCE_ARTISTS` nem em `catalogNeighbors[i].band`. Logar descartados via analytics para tuning do prompt.

**G. Fonte por item**
12. Cada item da aba IA recebe um chip pequeno: "vizinho do catálogo" se o artista também está em `catalogNeighbors`, ou "biblioteca de territórios" se veio só de `selectReferenceArtists`.

**H. Comunicação do half/double-time BPM**
13. No card de vizinho do catálogo: detectar se o match foi half/double (|bpmA - bpmB*2| < |bpmA - bpmB|) e exibir "BPM 160 ↔ 80 (double-time)" em vez de Δ bruto.

**I. Disclosure honesta de cobertura do catálogo**
14. Acima da aba Catálogo (ou no empty state), uma linha discreta: "Catálogo atual: 1.351 faixas, foco em Pop/Rock/Hip-Hop/Jazz/Indie. Cobertura limitada para Sertanejo, Forró, Pagode e Trap BR." Texto vem de uma constante derivada do snapshot atual; pode ser regenerada quando o catálogo crescer.

**J. Pequena reordenação do bloco**
15. No topo do card "Referências mais próximas", linha curta de meta: "{N} faixas comparadas · {gênero detectado}" — substitui parte do que hoje está só no tooltip.

---

### 5. O que NÃO muda

- Pipeline de extração no browser (`src/lib/audioAnalysis.ts`).
- Tabela `music_reference_tracks` e seu pipeline de import.
- Modelo / chamada do LLM e estrutura geral do JSON de diagnóstico.
- Demais cards do diagnóstico (Resumo, Diagnóstico, Identidade, Técnico).

---

### 6. Arquivos afetados (resumo técnico)

- `src/components/music-dna/MusicDNAAnalyzer.tsx` — UI das duas abas, badges categóricos, filtros de confiança, chips de fonte, BPM half/double, disclosure de cobertura, contador visível.
- `src/hooks/useMusicDNA.ts` — calibração cross-extractor antes do envio; validação client-side de `referencias_proximas` contra lista permitida; passar `dims_used` adiante.
- `supabase/functions/music-dna-analyze/index.ts` — lógica de fallback `p_strict_genre = true` quando gênero do usuário tem catálogo raso; passar contagem por gênero no payload.
- Migração SQL: ajustar `find_nearest_reference_tracks` para (i) bônus de gênero `-0.25`, (ii) retornar `dims_used` no resultset.
- `src/lib/musicDnaReferences.ts` — sem mudança estrutural; opcionalmente expor a lista curada para validação no client.

### 7. Resultado esperado

- Usuário entende que Catálogo = medição com escopo limitado e IA = sugestão estilística qualitativa.
- Falsos positivos de "minha música parece a do artista X (78%)" caem drasticamente para gêneros BR sub-representados.
- Quando o catálogo realmente não cobre o estilo, a UI assume isso em vez de inventar 6 vizinhos.
- Auditabilidade: cada item tem fonte, dimensões usadas e categoria de confiança.
