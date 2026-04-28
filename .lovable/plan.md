# Documentação visual StudioFlow — UNICAMP/INCAMP/INOVA

Capturas de todas as telas e modais principais (~30-35 prints), em desktop 1366x768, entregues em três formatos: ZIP, PDF e PPTX.

## Etapa 0 — Hotfix bloqueante (necessário para o app rodar)

Antes de capturar, corrigir runtime error em `src/components/AppLayout.tsx` introduzido na remoção do Track Intelligence:
- Sidebar desktop ainda referencia `gestaoItems[6]` (índice inexistente após a remoção) e duplica `gestaoItems[5]`.
- Substituir bloco linhas 386-390 pelos índices corretos (Editais, Profissionais, Criativo, DNA Musical).

Sem esse fix o preview crasheia e nenhuma captura é possível.

## Etapa 1 — Captura via browser automation

Login: usar a sessão atual já autenticada no preview. Viewport: 1366x768.

### Telas principais (~14)
1. `/` Welcome (landing)
2. `/auth` Login + variação "Criar conta" + variação "Esqueci minha senha"
3. `/dashboard` Dashboard
4. `/projects` Lista de projetos
5. `/projects/:id` Project Hub — abas: Overview, Tasks, Files, Team, Finance, Release, Chat (1 print por aba relevante = ~5)
6. `/finance` Gestão financeira
7. `/agenda` Agenda
8. `/music-dna` DNA Musical
9. `/editais` Editais
10. `/criativo` Criativo (galeria + gerador)
11. `/professionals` Profissionais
12. `/settings` Configurações
13. `/perfil` Perfil público do artista
14. `/u/:username` Visualização pública

### Modais e overlays (~12)
- Criar/editar projeto (Projects)
- Convidar parceiro (Project Team)
- Avaliar parceiros — RatePartnersModal (stage Lançado)
- MasterAnalyzerModal (upload + análise)
- Nova transação financeira
- Novo evento Agenda + detecção de conflito
- ProjectAISheet (assistente IA do projeto)
- AITaskAssistant (JamSession flutuante)
- EditalAIAssistant (gerar checklist)
- DeriveBatchDialog (Criativo)
- GalleryLightbox (Criativo)
- NotificationsPanel
- FeedbackModal (DNA Musical)

### Estratégia de captura
- Script Python que orquestra `browser--navigate_to_sandbox` + `browser--act` (abrir modais) + `browser--screenshot` para cada item.
- Cada print salvo em `/tmp/captures/NN_nome-da-tela.png` com numeração sequencial.
- Title + descrição curta de cada tela registrados em manifesto JSON para alimentar PDF/PPTX.

## Etapa 2 — Geração dos artefatos

### ZIP
- `/mnt/documents/studioflow-screenshots.zip` contendo todos os PNGs numerados.

### PDF (documentação)
- Gerado com ReportLab.
- Capa com identidade StudioFlow + título "Documentação visual — Programa INCAMP/INOVA UNICAMP".
- 1 print por página com título da tela e descrição curta (1-2 linhas) abaixo.
- Sumário inicial agrupando por módulo.
- `/mnt/documents/studioflow-documentacao.pdf`.

### PPTX (apresentação)
- Gerado com pptxgenjs, paleta neutra alinhada ao app (cinza claro 220 14% 96% + accent escuro), tipografia macOS-like.
- Slide 1: Capa "StudioFlow — INCAMP/INOVA UNICAMP".
- Slide 2: Visão geral (mapa de módulos).
- Slides 3-N: 1 slide por tela/modal com print à esquerda + título + 2-3 bullets explicativos à direita.
- Slide final: Próximos passos / status do MVP.
- `/mnt/documents/studioflow-apresentacao.pptx`.

## Etapa 3 — QA visual obrigatório

- Converter cada slide do PPTX em JPG via LibreOffice e revisar elementos sobrepostos, prints cortados, contraste.
- Converter cada página do PDF em JPG e revisar.
- Iterar até passe limpo. Reportar issues encontradas e correções.

## Entregáveis finais

- `/mnt/documents/studioflow-screenshots.zip`
- `/mnt/documents/studioflow-documentacao.pdf`
- `/mnt/documents/studioflow-apresentacao.pptx`

## Notas

- Se o browser automation falhar em abrir algum modal específico (ex: drag-drop, upload de áudio real), reporto a tela faltante e sigo com as demais — não bloqueia a entrega.
- Dados sensíveis: como você optou por usar a conta logada atual, os prints podem mostrar nomes reais de projetos, valores financeiros e contatos. Confirme se está OK ou se quer que eu mascare/desfoque informações financeiras antes de circular.