# Plano — Marketplace de Captadores (passo crítico #2)

## Por que agora
A pesquisa Colaborativa mostrou que o artista não fecha show porque não tem **acesso direto a quem contrata** (captador, produtor executivo, booker, curador). Hoje o StudioFlow tem `Profissionais` (contatos privados do artista) e `palcos_curados`, mas não conecta os dois: o artista termina o pitch e... não sabe para quem mandar.

Este passo cria um **diretório verificado de captadores/produtores executivos**, filtrável por especialidade, região e tipo de palco que atendem, integrado ao fluxo `/palcos/proposta/:applicationId`.

## Escopo

### 1. Perfil "captador" (opt-in)
Reaproveitar a tabela `profiles` (já tem `allow_global_listing`, `specialties`, `city`, `bio`, `username`, `public_email`, `whatsapp`). Adicionar:
- `is_captador boolean` — flag que destaca no marketplace
- `captador_palco_tipos text[]` — tipos de palco que atendem (festival, casa de show, bar, corporativo, prefeitura, etc.)
- `captador_generos text[]` — gêneros que normalmente contratam
- `captador_regioes text[]` — estados/cidades de atuação
- `captador_porte text[]` — pequeno / médio / grande
- `captador_taxa text` — campo livre ("% sobre cachê", "fee fixo", "a combinar")
- `captador_verificado boolean default false` — verificação manual via admin

Quem marcar `is_captador = true` no Settings aparece no marketplace. Não-captadores continuam listáveis no diretório atual de Profissionais, sem mudança.

### 2. Página `/captadores`
Nova rota com:
- Busca por nome/cidade
- Filtros: tipo de palco, gênero, estado, porte, verificados
- Cards com avatar, nome, cidade, tipos de palco, badge "Verificado"
- Link para `/u/:username` (perfil público já existente)
- Botão "Entrar em contato" → abre modal com e-mail/whatsapp/instagram (campos públicos já existentes)
- Botão "Convidar para projeto" → reusa `send-platform-invite`

### 3. Integração no fluxo de Palcos
No `PalcoProposta.tsx`, na etapa **Contato** (já existente), adicionar bloco "Captadores recomendados":
- Edge function `palco-match-captadores` que cruza `palcos_curados` da aplicação (tipo_palco, generos, estado) com `profiles` (captador_palco_tipos, captador_generos, captador_regioes)
- Mostra top 5 com botão "Usar este contato" que pré-preenche o campo `contact_recipient` e abre WhatsApp/e-mail com o pitch já gerado anexo

### 4. Onboarding/Settings
Em `Settings.tsx`, nova seção "Quero ser captador" (toggle + campos acima). Quando ativada, o perfil é destacado no marketplace e o artista recebe leads de pitch.

### 5. Verificação (admin)
Em `/admin`, lista simples de captadores não-verificados com botão "Verificar" — atualiza `captador_verificado = true`.

## Mudanças técnicas

**Banco** (1 migration):
- `ALTER TABLE profiles` com as 6 colunas novas
- Índice GIN em `captador_palco_tipos`, `captador_generos`, `captador_regioes` para filtros
- RLS já cobre via `allow_global_listing` existente; sem mudanças

**Edge functions**:
- `palco-match-captadores` (nova) — recebe `application_id`, busca a `application` + `palcos_curados`, retorna lista rankeada por match score (tipo_palco + gênero + estado)

**Frontend**:
- Nova rota `/captadores` → `src/pages/Captadores.tsx`
- `src/components/captadores/CaptadorCard.tsx`, `CaptadoresFilters.tsx`, `CaptadorContactModal.tsx`
- `src/hooks/useCaptadores.ts` (lista + filtros)
- `src/hooks/usePalcoCaptadoresMatch.ts` (sugestões no fluxo de Palcos)
- Bloco "Captadores recomendados" no step Contato de `PalcoProposta.tsx`
- Nova seção em `Settings.tsx` para opt-in como captador
- Item de menu admin em `Admin.tsx` para verificar captadores
- Entrada no menu lateral (ícone + label "Captadores") — abaixo de "Profissionais"

**i18n**: chaves PT/EN para os labels novos (filtros, badges, CTAs).

**Fora de escopo** desta entrega:
- Marketplace pago / comissões automatizadas
- Sistema de avaliação específico para captadores (usar o `professional_ratings` existente depois)
- Chat in-app entre artista e captador (mantém WhatsApp/e-mail por enquanto)
- Match com IA — versão 1 usa regras determinísticas (sobreposição de arrays)

## Validação
- Migration aplicada e RLS testado (não-captadores não aparecem; captadores com `allow_global_listing = false` também não)
- Opt-in em Settings → perfil aparece em `/captadores`
- Em uma `application` com palco em SP, gênero MPB: edge function retorna captadores com `captador_regioes` contendo SP e `captador_generos` contendo MPB
- Admin verifica perfil → badge "Verificado" aparece nos cards

## Diagrama

```text
                                              ┌──────────────────────┐
[Artista] → /palcos/proposta/:id  → Contato → │ Captadores recomend. │
                                              │ (match por palco)    │
                                              └─────────┬────────────┘
                                                        │
                                                        v
[Captador opt-in via Settings] → /captadores (marketplace) → /u/:username (perfil público)
                                       ↑
                                  Admin verifica
```

Posso prosseguir com a implementação completa, ou prefere começar só pelo marketplace (`/captadores` + opt-in) deixando o match dentro do fluxo de Palcos para uma segunda entrega?
