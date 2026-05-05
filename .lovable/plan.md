## Objetivo

Substituir o `useBetaBannerVisible` em `src/hooks/useBetaBanner.ts` pela versão enviada, que lê o `sessionStorage` de forma **síncrona** no `useState` inicial.

## Diferença em relação à versão atual

Hoje o hook inicia com `useState(false)` e só atualiza a visibilidade dentro do `useEffect`. Isso provoca um pequeno flicker: no primeiro render o banner fica oculto mesmo para usuários que ainda não dispensaram, e aparece no segundo render.

A versão enviada usa um inicializador lazy:

```ts
const [visible, setVisible] = useState(
  () => sessionStorage.getItem(STORAGE_KEY) !== "true"
);
```

Assim o estado correto já está disponível no primeiro render — sem flash e sem render extra.

## Mudanças

**`src/hooks/useBetaBanner.ts`**
- Trocar `useState(false)` pelo inicializador lazy lendo `sessionStorage` direto.
- Manter o `useEffect` com listener do evento `beta-banner-changed` para sincronizar entre abas/componentes (a chamada `update()` dentro do effect continua útil para casos em que o storage muda entre o mount e o subscribe).
- `dismissBetaBanner` e o evento `trackEvent("beta_banner_dismissed")` permanecem inalterados.

## Fora de escopo

Nenhuma alteração em `BetaBanner.tsx`, `AppLayout.tsx` ou no schema do Supabase — a API pública do hook (`useBetaBannerVisible`, `dismissBetaBanner`) não muda.

## Risco

Mínimo. Como `sessionStorage` está disponível no browser desde o mount (app SPA Vite, sem SSR), o acesso síncrono é seguro.
