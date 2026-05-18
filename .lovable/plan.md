# Plano — Aprofundar módulo Palcos (passo crítico #1)

## Por que este é o passo mais crítico
A pesquisa Colaborativa apontou **booking de shows + negociação** como dor #1. Hoje o StudioFlow cobre **descoberta** (Carreira) e o **pitch inicial** (`/palcos/proposta/:applicationId` com EPK + 3 variações de pitch + contato + follow-up). Faltam os dois passos que efetivamente **fecham o show**:

1. **Proposta comercial** (cachê, condições, validade, contrato simples)
2. **Pacote técnico** (rider de áudio, mapa de palco, orçamento de produção)

Sem isso o artista ainda precisa sair da plataforma para fechar o evento — exatamente o que a pesquisa diz que ele não faz hoje.

## Escopo desta entrega

Adicionar **2 novas etapas** ao fluxo de proposta já existente, mantendo EPK/Pitch/Contato/Follow intactos:

```text
EPK  →  Pitch  →  [NOVO] Proposta Comercial  →  [NOVO] Pacote Técnico  →  Contato  →  Acompanhamento
```

### Etapa 3 — Proposta Comercial
Formulário + gerador IA para uma **carta-proposta** em PDF/Markdown:
- Cachê (com sugestão por porte do palco, base no `cachet_medio` do `palcos_curados`)
- Condições: deslocamento, hospedagem, alimentação, equipe inclusa, duração do set, número de músicos
- Forma de pagamento e validade da proposta
- IA gera o texto formal a partir desses campos + perfil do artista
- Botões: copiar, baixar PDF, anexar ao envio em "Contato"

### Etapa 4 — Pacote Técnico
Três sub-abas em uma só etapa:
- **Rider de áudio**: lista editável de canais (vocal, violão, etc.) com mic/DI sugerido, monitores, P.A. mínimo. Template inicial baseado em `primary_genre` e formação do projeto.
- **Mapa de palco**: editor visual simples (grid drag-drop com posições) renderizado em SVG; export PNG.
- **Orçamento interno**: tabela de custos (cachê líquido, transporte, hospedagem, sideman, técnico) com cálculo automático de margem vs. cachê bruto da etapa anterior. Reutiliza categorias de `transactionCategories.ts`.

Tudo persistido por `application_id` para o artista voltar e iterar.

## Mudanças técnicas

**Banco** (1 migration):
- Tabela `palco_proposals` (application_id, cache_bruto, condicoes jsonb, validade, proposta_md, status) — RLS por `user_id`.
- Tabela `palco_tech_packages` (application_id, rider jsonb, stage_map jsonb, orcamento jsonb) — RLS por `user_id`.

**Edge functions**:
- Estender `palco-pitch-generate` com 2 novas `action`s: `generate_commercial_proposal` e `generate_rider_template` (mesmo padrão Gemini Flash já em uso, sem novas chaves).

**Frontend**:
- `src/pages/PalcoProposta.tsx`: adicionar 2 entradas em `STEPS` e os 2 componentes de step.
- Novos: `src/components/palco/CommercialProposalStep.tsx`, `TechPackageStep.tsx`, `StageMapEditor.tsx`.
- Hook `usePalcoProposal(applicationId)` para CRUD.
- Export PDF: usar `html2canvas` + `jspdf` (já no projeto se existir; senão `bun add`).

**Fora de escopo** desta entrega (próximos passos):
- Assinatura eletrônica do contrato
- Marketplace de captadores (passo #2)
- Integração com WhatsApp Business API

## Validação
- Migration aplicada com RLS testado (owner-only).
- Fluxo end-to-end em uma application existente: criar proposta → gerar via IA → criar rider → exportar PDF.
- Mobile: steps acessíveis no menu lateral do fluxo.

Quer que eu prossiga com esta entrega ou prefere reduzir/ampliar o escopo (ex: só Proposta Comercial primeiro, deixando Pacote Técnico depois)?
