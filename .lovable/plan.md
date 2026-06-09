# Carreira · Simplificar inscrição: de "preencher campos" para "analisar edital"

## Por que mudar

A tela atual extrai dezenas de "campos" do edital, oferece preenchimento em lote por IA, salva rascunho campo-a-campo e tenta simular um formulário. No fim, o usuário sempre precisa abrir o portal oficial do edital e colar tudo lá — então estamos pagando IA, cota e complexidade para entregar algo que não conecta ao destino. Vamos focar onde realmente agregamos valor: **ajudar o artista a decidir se vale a pena se inscrever e dar a base de texto para começar**.

## Novo fluxo (UX)

```text
/carreira/inscricao/:id
┌─────────────────────────────────────────────┐
│ ← Voltar           [link oficial do edital] │
├─────────────────────────────────────────────┤
│ 1. Forneça o edital                         │
│    ( ) Upload PDF/DOC/TXT (até 10 MB)       │
│    ( ) Colar texto                          │
│    [Projeto vinculado: dropdown opcional]   │
│    [ Analisar edital ]                      │
├─────────────────────────────────────────────┤
│ 2. Resultado da análise (após gerar)        │
│   • Resumo executivo (3-5 linhas)           │
│   • Prazos-chave (inscrição, resultado)     │
│   • Documentos exigidos (checklist)         │
│   • Rascunho de carta/memorial sugerido     │
│     [Copiar] [Regenerar] [Refinar]          │
├─────────────────────────────────────────────┤
│ 3. Próximos passos                          │
│   [Marcar como inscrito] [Abrir portal ↗]   │
└─────────────────────────────────────────────┘
```

Sem campos dinâmicos, sem botão "preencher tudo", sem progresso de candidatura. A análise fica salva por candidatura para reabrir depois.

## Mudanças no código

### Frontend
- `src/pages/EditalInscricao.tsx`: reescrever do zero como página de análise. Sai: `FieldInput`, `handleBatchFill`, `preFillProfile`, `aiGeneratedFields`, `batchProgress`, `handleCopyAll`, auto-save campo-a-campo, "Substituir campos com outro documento", estado `step`. Entra: dois modos de entrada (upload + colar texto), botão único "Analisar", card de resultado com seções (resumo, prazos, documentos, rascunho de carta).
- `src/hooks/useRascunhoEdital.ts`: substituir por `useEditalAnalysis.ts` — expõe `analyze(input, projectId?)`, `analysis`, `loading`, `error` e persiste/recupera em `edital_applications.analise_ia`.
- `src/components/editais/UploadEditalPanel.tsx`: mantém upload, adiciona prop opcional para alternar com textarea de "colar texto" (ou criar wrapper `EditalSourceInput` que combina os dois).

### Backend / edge functions
- Renomear/refatorar `extract-edital-fields` → `analyze-edital`: recebe `{ source: { type: 'file'|'text', content } , project_id? }`, devolve `{ resumo, prazos: [], documentos: [], carta_sugerida }`. Output via `Output.object` do AI SDK para garantir estrutura. Mantém upload de PDF/DOC com mesma lib de extração de texto atual.
- Deletar `edital-ai-assistant` (já enxuto na fase 4, mas as únicas ações restantes — `fill_field`/`refine_field` — desaparecem com o novo fluxo). Posso preservar só `refine_field` se quisermos botão "Refinar" no rascunho de carta; nesse caso o reaproveito.

### Banco de dados (migração)
1. `DROP TABLE public.rascunhos_editais` (e RLS/policies associadas). Confirmado pelo usuário — beta perde rascunhos antigos.
2. `ALTER TABLE public.edital_applications ADD COLUMN analise_ia jsonb`. Sem migração de dados.
3. Sem alteração em `editais`, `palcos_curados`, `alertas_editais`, `fontes_editais`, `edital_documents`, `edital_application_docs`.

## Limpeza adicional
- Remover botões/labels: "Preencher com meu perfil", "Preencher tudo com IA", "Salvar rascunho", "Copiar tudo".
- Remover dependências: `useRascunhoEdital`, `extractCauseLabel`, `extractCauseGuidance` (se não usados em outro lugar).
- Atualizar `docs/04-banco-de-dados.md` e a entrada de memória de Carreira para refletir que rascunhos foram removidos e que a tabela `edital_applications` agora guarda `analise_ia`.

## Fora de escopo
- Não mexer no fluxo de descoberta (`/carreira`, `oportunidades-search`, `AISearchPanel`).
- Não mexer em palcos (`PalcoProposta`).
- Não tocar em `edital_documents` (banco de docs reutilizáveis, módulo separado já entregue).

## Resultado esperado
~600 linhas a menos em `EditalInscricao.tsx`, uma edge function unificada (`analyze-edital`), uma tabela a menos no schema e uma proposta de valor mais honesta: "entendemos o edital pra você e te damos um texto-base pronto pra adaptar".
