

Investigando: as ações de IA no Dashboard hoje só fazem `scrollIntoView` na seção do AI Assistant, mas não garantem que ela fique alinhada ao topo da viewport — em mobile o header/nav podem cobrir parte da seção, e em desktop o scroll cai no meio.

# Foco no topo da seção de IA ao clicar em ações

## Comportamento esperado
Ao clicar em qualquer gatilho que dispare a IA do Dashboard (card "Próxima ação", chips de sugestão, ou qualquer atalho que envie mensagem para o Assistente), a página deve rolar de forma que o **topo do card "Assistente IA" fique alinhado ao topo visível da tela** (com pequeno offset para respirar e evitar sobreposição com header sticky/nav mobile).

## Implementação

### 1. Helper de scroll com offset
No `Dashboard.tsx`, criar utilitário local:
```ts
const scrollToAI = () => {
  const el = document.getElementById("ai-assistant-section");
  if (!el) return;
  const offset = 12; // respiro do topo
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
};
```
Usar `getBoundingClientRect` em vez de `scrollIntoView({block:"start"})` porque o segundo não permite offset e fica colado em headers sticky.

### 2. Garantir id no container correto
Conferir que o wrapper do `aiAssistantCard` tem `id="ai-assistant-section"` envolvendo o **Card inteiro** (não só o conteúdo interno), para que o topo da rolagem coincida com a borda superior do card.

### 3. Pontos de chamada
Substituir todos os `scrollIntoView` atuais por `scrollToAI()`:
- Click no card "Próxima ação" (já existe scroll, trocar implementação)
- Qualquer chip/botão dentro do `AITaskAssistant` que parta de fora e injete mensagem
- Auto-expandir o card de IA se estiver colapsado antes de rolar (caso aplicável)

### 4. Foco acessível (bônus leve)
Após o scroll, mover foco para o textarea do chat (`document.querySelector<HTMLTextAreaElement>("#ai-assistant-section textarea")?.focus({ preventScroll: true })`) para que o usuário já comece a digitar — sem reescrever o scroll.

## Arquivos modificados
- `src/pages/Dashboard.tsx` — adicionar helper `scrollToAI`, garantir `id` no wrapper do card de IA, substituir chamadas existentes de scroll
- `src/components/AITaskAssistant.tsx` — se houver chips internos que disparam mensagem e precisem rolar quando renderizados em outros lugares, expor callback `onBeforeSend` opcional (apenas se necessário; provavelmente não)

## Sem migrações
Mudança puramente de UX/navegação no cliente.

