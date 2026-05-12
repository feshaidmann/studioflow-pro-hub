
# Refinar GenreMismatchHint — reduzir falsos alertas

## Problema
Hoje o alerta dispara sempre que `detected !== declared` com `score >= 0.75` e `gap >= 0.03`. Isso gera ruído porque:
1. Comparação é case/acento-sensível ("Pop Brasileiro" vs "Pop" não casam mas são irmãos)
2. Gêneros tecnicamente próximos (Pop ↔ Synth-Pop, Rock ↔ Grunge, Eletrônica ↔ House) disparam alerta sem agregar valor
3. Limiares (0.75 / 0.03) são frouxos: cosseno entre vetores 0–1 quase sempre passa de 0.75; gap de 3% é ruído estatístico

## Mudanças

### 1. Matriz de famílias de gênero (nova)
Arquivo novo `src/lib/genreFamilies.ts` — mapa `genre → familyId`. Pares dentro da mesma família NÃO disparam alerta, mesmo com score/gap altos.

Famílias propostas:
```text
pop:        Pop, Pop Brasileiro, Pop Internacional, Synth-Pop, Axé / Pop Bahia, MPB Contemporânea
rock:       Rock, Rock Alternativo, Rock Alternativo BR, Grunge, Punk Rock, Heavy Metal, Indie BR, Indie Folk, Folk Rock
urban:      Hip-Hop, Rap BR, Trap BR, Lo-Fi Hip Hop, R&B / Soul, Soul, Funk
brazilian-roots: Samba, Pagode, Bossa Nova, Sertanejo Raiz, Sertanejo Universitário, Forró / Piseiro, Reggae BR, Reggae
electronic: Eletrônico, Eletrônica / House, Synth-Pop, Ambient
acoustic:   Jazz, Country, Bossa Nova, Folk Rock, Indie Folk
funk-br:    Funk Carioca
```
(Synth-Pop e Bossa Nova/Folk Rock aparecem em duas famílias propositalmente — match em qualquer overlap suprime alerta.)

### 2. Normalização de nomes
Função `normalizeGenreName()`:
- Lowercase, sem acento, sem espaços extras
- Remove sufixos regionais: ` BR`, ` Brasileiro`, ` Brasileira`, ` BR/`, ` Internacional`, ` Carioca`, ` Raiz`, ` Universitário`, ` / Piseiro`, ` / House`, ` / Soul`, ` / Pop Bahia`
- Aplicada antes de comparar `detected` vs `declared` (match exato após normalização também suprime alerta)

### 3. Limiares mais rígidos
Em `GenreMismatchHint.tsx`:
- `score >= 0.92` (era 0.75) — cosseno em vetores de 8 dims tende a ser alto; só alerta com afinidade muito forte
- `gap >= 0.05` (era 0.03) — exige diferença real entre top1 e top2
- Adicionar regra: top1 e top2 NÃO podem estar na mesma família do declared (se top2 = família do declared, mantém como suficientemente próximo e não alerta)

### 4. Lógica final do componente
```text
if (!detected || !declared) return null
if (normalize(detected) === normalize(declared)) return null
if (sameFamily(detected, declared)) return null
if (score < 0.92) return null
if (score - runnerUp.score < 0.05) return null
if (sameFamily(runnerUp.genre, declared)) return null  // declared é "próximo" o bastante
render alerta
```

### 5. Texto do alerta (microcopy)
Manter, mas trocar o disclaimer final por algo mais específico em PT/EN:
- PT: "Sinal técnico apenas. Esses dois gêneros têm assinaturas acústicas distintas — vale conferir tags e referências."
- EN equivalente em `LanguageContext.tsx` (4 chaves já existem do passo anterior; ajustar a chave do disclaimer).

## Arquivos

**Criar:**
- `src/lib/genreFamilies.ts` — mapa de famílias + `normalizeGenreName()` + `sameFamily(a, b)`

**Editar:**
- `src/components/music-dna/GenreMismatchHint.tsx` — usar normalização, `sameFamily`, novos limiares (0.92 / 0.05), checagem extra do runner-up
- `src/contexts/LanguageContext.tsx` — atualizar string do disclaimer (PT/EN)

**Não tocar:**
- `src/lib/genreClassifier.ts` (cálculo continua igual; só o gating do alerta muda)
- `useMusicDNA.ts` / edge function `music-dna-analyze` (payload `classifier_hint` continua sendo enviado para a IA, independente do alerta visual)

## Riscos
- **Falsos negativos**: limiares mais altos (0.92/0.05) podem suprimir alertas legítimos. Mitigado mantendo o `classifier_hint` no prompt da IA — o modelo ainda usa o sinal técnico mesmo quando o card visual não aparece.
- **Famílias arbitrárias**: a matriz é uma heurística inicial. Estrutura permite ajuste fácil em um único arquivo conforme feedback dos produtores.

## Fora de escopo
- Sistema de feedback explícito ("isso não faz sentido") com persistência → fica para iteração futura
- Recalibração dos perfis hardcoded
- Mudanças no payload enviado à IA
