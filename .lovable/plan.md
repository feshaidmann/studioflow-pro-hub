# Top-header de Beta com convite a feedback

## Objetivo
Exibir uma faixa fina, fixa no topo de toda a aplicação autenticada, comunicando que o StudioFlow está em fase de testes (beta) e convidando o usuário a enviar feedback.

## Onde aparece
- Em todas as rotas envoltas pelo `AppLayout` (mobile e desktop).
- Posição: topo absoluto da viewport, acima do header mobile e da sidebar desktop.
- Não aparece em `/welcome`, `/auth`, `/legal` etc. (essas não usam `AppLayout`; o `Welcome` já tem seu próprio banner beta).

## Conteúdo
- Ícone: `Sparkles` (lucide) à esquerda.
- Texto (pt-BR): "StudioFlow está em fase beta — sua experiência pode ter pequenos ajustes."
- CTA inline: botão/link "Enviar feedback" que dispara a abertura do `FeedbackButton` já existente.
- Botão fechar (X) à direita: dispensa o banner pela sessão atual (persistido em `sessionStorage` com a chave `sfp_beta_banner_dismissed`).

## Design (alinhado ao tema macOS minimalista)
- Altura ~28px, `bg-card/80 backdrop-blur-xl`, borda inferior sutil `border-border/60`.
- Texto `text-[11px] text-muted-foreground`, ícone e CTA em `text-primary`.
- `sticky top-0 z-[60]` (acima do header mobile `z-50` e sidebar `z-40`).
- Responsivo: em telas estreitas, oculta o subtítulo longo e mantém apenas "Beta · Enviar feedback".

## Implementação técnica
1. **Novo componente** `src/components/BetaBanner.tsx`:
   - Lê/escreve `sessionStorage.sfp_beta_banner_dismissed`.
   - Expõe um evento global (`window.dispatchEvent(new CustomEvent('open-feedback'))`) ao clicar no CTA.
2. **`src/components/FeedbackButton.tsx`**: adiciona `useEffect` que escuta o evento `open-feedback` e seta `setOpen(true)`.
3. **`src/components/AppLayout.tsx`**:
   - Importa `BetaBanner` e renderiza no topo, tanto no branch mobile quanto desktop, antes do header/sidebar.
   - Ajusta apenas o necessário para que o banner fique fixo no topo (no desktop, envolve sidebar+main em um wrapper com `pt-7` quando o banner está visível; no mobile, o `header` h-12 sticky já fica abaixo do banner pois o banner é o primeiro elemento sticky na hierarquia).

## Fora de escopo
- Não altera o conteúdo do `FeedbackButton` (modal continua igual).
- Não cria página nova.
- Não toca em rotas públicas (`Welcome`, `Auth`, etc.).
