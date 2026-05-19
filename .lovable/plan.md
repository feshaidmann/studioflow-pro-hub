# Relatório de extração de editais

## Visão geral
- **Editais cadastrados**: 14
- **Tentativas de extração registradas**: 6 (em 4 editais distintos)
- **Sucessos**: 1 (16,7% das tentativas, 25% dos editais tentados)
- **Falhas**: 5 (83,3%)
- **Editais com algum conteúdo extraído pela IA (`resumo` preenchido)**: 3 de 14 (≈21%)

## Falhas por causa
| Causa | Ocorrências |
|---|---|
| `no_fields_extracted` (IA não conseguiu identificar campos) | 3 |
| `invalid_json` (resposta da IA fora do contrato) | 2 |

## Quebra por edital tentado
| Edital | Origem | Link status | Tentativas | Resultado |
|---|---|---|---|---|
| Petrobras Cultural – Novos Eixos | apaci.com.br/editais/ | unknown | 1 | sucesso (1 rascunho com 14 campos) |
| Fomento CULTSP PNAB 27/2025 | perplexity | ok | 2 | falha: `no_fields_extracted` |
| Tim Festival – Abertura de Shows | timfestival.com.br | broken | 1 | falha: `no_fields_extracted` |
| Edital Distribuição Spcine 2025 | spcine.com.br/editais/ | ok | 2 | falha: `invalid_json` |

## Utilidade da IA (rascunhos preenchidos)
- **2 rascunhos** com campos efetivamente preenchidos pela extração (de 4 rascunhos totais).
- Petrobras (id `80d5ddd5…`): 14 campos extraídos automaticamente, progresso 5%.
- Funcultura Música 2026 (id `5c658fe8…`): 5 campos extraídos, progresso 27%.
- Demais 11 editais nunca tiveram extração disparada pelo usuário.

## Diagnóstico
1. Taxa de sucesso de extração ≈17% — baixa.
2. Causas dominantes são previsíveis: páginas-índice (apaci, spcine, timfestival) que listam editais sem o PDF; e respostas da IA que escapam do contrato JSON.
3. Quando funciona, a IA é bastante útil: preenche 5–14 campos de uma vez, eliminando trabalho manual real.
4. O gargalo principal hoje é **acesso ao conteúdo do edital**, não a qualidade da IA — daí a importância do fallback por upload manual.

---

# Plano aprovado: fallback por upload manual do edital

## 1. Edge function `extract-edital-fields`
- Aceitar payload opcional `file: { name, mime_type, base64 }`.
- Quando `file` presente: ignorar Perplexity e chamar Lovable AI Gateway (`google/gemini-2.5-flash`, multimodal/PDF) com o **mesmo prompt e contrato JSON** já usado hoje.
- Validar mime (`application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`) e tamanho base64 (~10 MB).
- Reaproveitar os `cause` codes existentes (`invalid_json`, `no_fields_extracted`, `lovable_ai_error`) para a UI tratar igual.

## 2. Hook `useRascunhoEdital`
- Novo método `extractFieldsFromFile(file: File, editalId?: string)`:
  - Valida tipo/tamanho no cliente.
  - Lê em base64 e invoca a edge function.
  - Reutiliza `setExtracting`, `setExtractedFields`, `setLastError`.
  - Dispara `analytics_events`:
    - `edital_extract_attempt` com `properties.source = 'file'`.
    - `edital_extract_succeeded` / `edital_extract_failed` com mesma convenção.

## 3. UI `EditalInscricao.tsx`
- Abaixo do botão "Tentar novamente", quando `lastError` indica falha de leitura do link, mostrar card "Não conseguimos ler o edital":
  - Texto curto explicando (link fora do ar ou exige login).
  - Input estilizado aceitando PDF/DOC/DOCX/TXT, máx. 10 MB.
  - Botão "Extrair do arquivo" (estado de loading reaproveitado).
  - Mensagens de erro de validação local (tipo/tamanho) em pt-BR.

## 4. Sem alterações de schema
- Arquivo é descartado após extração; nenhum bucket ou migração.

## Detalhes técnicos
- `LOVABLE_API_KEY` já disponível no projeto.
- Sem mudanças em RLS, auth ou tabelas.
- Telemetria por `source` permite acompanhar se o fallback melhora a taxa de sucesso (hoje 17%).

## Como medir o impacto pós-deploy
Comparar, por janela de 7 dias:
- `edital_extract_succeeded` / `edital_extract_attempt` por `source` (`url` vs `file`).
- Esperado: `file` com taxa de sucesso significativamente maior, especialmente nos casos `no_fields_extracted` originados de páginas-índice.
