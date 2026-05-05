## Problema

No `src/components/AppLayout.tsx` atual:

1. **Bug:** `Palcos` está em `gestaoItems[4]`, mas `toolDrawerItems` referencia índices `[3], [5], [4], [2]` — que correspondem a Editais, Profissionais, Criativo, DNA. O `[4]` aqui é Criativo, não Palcos (porque a ordem do array `gestaoItems` no arquivo atual é Finanças, Agenda, DNA, Editais, **Palcos**, Criativo, Profissionais). Resultado: Palcos não aparece no drawer mobile e a sidebar desktop renderiza apenas 4 ferramentas, deixando Palcos fora.
2. **Ordem invertida** vs. jornada real do artista (DNA → Criativo → Palcos → Editais → Profissionais).

## Solução

Aplicar o arquivo enviado em `user-uploads://AppLayout-2.tsx` sobre `src/components/AppLayout.tsx`. Ele já contém:

- `gestaoItems` reordenado pela jornada, com índices comentados:
  - `[0]` Finanças, `[1]` Agenda, `[2]` DNA, `[3]` Criativo, `[4]` Palcos, `[5]` Editais, `[6]` Profissionais.
- `toolDrawerItems` agora inclui os **5** itens de ferramenta na ordem correta (`[2]` DNA → `[3]` Criativo → `[4]` Palcos → `[5]` Editais → `[6]` Profissionais), eliminando o bug de Palcos ausente.
- Bloco da sidebar desktop renderizando os mesmos 5 itens na mesma ordem.
- `drawerSubLabels`, prefetch de `/palcos`, `ROOT_ROUTES`, header mobile, seção Conta e demais comportamentos preservados.

## Passos

1. Sobrescrever `src/components/AppLayout.tsx` com o conteúdo de `user-uploads://AppLayout-2.tsx` (448 linhas).
2. Verificar visualmente:
   - Mobile: drawer "Mais" mostra 5 ferramentas em grid na ordem DNA, Criativo, Palcos, Editais, Profissionais.
   - Desktop: seção "Ferramentas" da sidebar lista as mesmas 5 entradas na mesma ordem, com Palcos visível.
3. Sem mudanças em rotas, traduções (`nav.palcos` já existe) ou outros arquivos.

## Detalhes técnicos

- Arquivo único editado: `src/components/AppLayout.tsx`.
- Sem migrations, sem mudanças em hooks ou edge functions.
- Sem novos imports — `Mic2` já está presente.
