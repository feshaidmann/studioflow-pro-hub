## Problema

O toggle "Mostrar dados financeiros" em `ProfessionalDetailModal.tsx` já usa `localStorage` por `user.id` com fallback `:anon`, mas tem 3 falhas sutis:

1. **Escrita prematura no mount.** O `useEffect` de persistência roda na primeira renderização, gravando `0`/`1` no slot do usuário atual mesmo quando o estado é apenas o "default" recém-lido — ou seja, se o usuário ainda não tem chave, criamos uma com `false` que vira valor "real". Não estraga nada hoje, mas faz o write effect também disparar durante a transição `user?.id` (login/logout) e gravar a preferência **do dono anterior na chave do novo usuário** (race entre os dois `useEffect`).
2. **Reciclagem visual durante `loading`.** Enquanto `auth.loading=true`, `user` é `null` → lemos `:anon`. Se a modal abrir nesse intervalo, mostramos o estado anônimo e logo trocamos para o do usuário (pisca). Pior: o effect de persistência grava `:anon` com o valor que pertencia ao usuário antes dele "aparecer".
3. **Não reage a logout no meio da sessão.** O reset acontece, mas o write effect roda em seguida com o valor antigo já no estado, gravando em `:anon` algo que veio do usuário logado.

## Solução

Arquivo único: `src/components/professionals/ProfessionalDetailModal.tsx`.

### Mudanças

1. **Consumir `loading` do `useAuth()`** e tratar `user.id` como "indefinido" enquanto carrega — não ler nem gravar nada nesse intervalo.

2. **Chave estável por sessão:**
   ```ts
   const authKey = loading ? null : (user?.id ?? "anon");
   ```
   - `null` ⇒ não persistir, não hidratar (estado fica em "indeterminado").
   - `"anon"` ⇒ slot exclusivo de não logados.
   - `<uid>` ⇒ slot do usuário.

3. **Hidratação determinística com `useEffect` no `authKey`:**
   - Quando `authKey` muda (incluindo a primeira vez que sai de `null`), lê do storage e seta o estado.
   - Usa um `ref` (`hydratedKeyRef`) para marcar "já carregamos a chave X" — evita race do write effect rodar antes da hidratação concluir.

4. **Persistência guardada:**
   ```ts
   useEffect(() => {
     if (authKey === null) return;
     if (hydratedKeyRef.current !== authKey) return; // ainda não hidratou esta chave
     localStorage.setItem(`${PREFIX}:${authKey}`, showFinancial ? "1" : "0");
   }, [showFinancial, authKey]);
   ```
   Garante que o write **só ocorre depois** da leitura da chave atual — elimina o vazamento entre slots.

5. **Default seguro:** valor inicial do `useState` é `false` (mantém comportamento "oculto por padrão"). Se a chave não existir no storage, mantém `false` e **não grava nada** até o usuário interagir (evita criar entrada parasita).
   - Implementação: distinguir "não existe" (`getItem === null`) de "existe `0`" — se não existe, marca como hidratado mas não escreve no localStorage até o `setShowFinancial` do usuário disparar.
   - Para isso, separar o effect de hidratação (que apenas lê e seta) do de write (que só dispara em mudanças subsequentes via comparação com um `lastWrittenRef`).

6. **Limpeza visual durante `loading`:** Enquanto `authKey === null`, o botão do toggle ainda aparece (não bloqueia UI), mas o painel financeiro permanece fechado e qualquer clique no toggle é tratado como interação local — quando `authKey` resolver, o effect de hidratação sobrescreve com o valor real do storage.

### Pseudocódigo final

```ts
const PREFIX = "professionals.show_financial";
const { user, loading: authLoading } = useAuth();
const authKey = authLoading ? null : (user?.id ?? "anon");

const [showFinancial, setShowFinancial] = useState(false);
const hydratedKeyRef = useRef<string | null>(null);
const userInteractedRef = useRef(false);

// Hidrata quando a chave muda
useEffect(() => {
  if (authKey === null) return;
  userInteractedRef.current = false;
  try {
    const raw = localStorage.getItem(`${PREFIX}:${authKey}`);
    setShowFinancial(raw === "1");
  } catch { setShowFinancial(false); }
  hydratedKeyRef.current = authKey;
}, [authKey]);

// Persiste somente após interação do usuário (para não criar entradas vazias)
useEffect(() => {
  if (authKey === null) return;
  if (hydratedKeyRef.current !== authKey) return;
  if (!userInteractedRef.current) return;
  try { localStorage.setItem(`${PREFIX}:${authKey}`, showFinancial ? "1" : "0"); } catch {}
}, [showFinancial, authKey]);

// onClick do toggle:
onClick={() => { userInteractedRef.current = true; setShowFinancial(v => !v); }}
```

## Fora de escopo

- Sincronização cross-tab (StorageEvent) — não foi pedido.
- Migrar a preferência para o servidor (coluna em `profiles`) — manter local por enquanto.
- Outros toggles fora do `ProfessionalDetailModal`.
