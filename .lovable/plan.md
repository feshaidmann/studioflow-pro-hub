

# Plano: Remover sistema bilíngue, manter apenas português

## Resumo
Eliminar toda a infraestrutura de i18n (LanguageContext, LanguageToggle, traduções EN) e substituir por strings PT hardcoded. A função `t()` será simplificada para apenas retornar o valor PT diretamente.

## Estratégia
Em vez de remover todas as ~150 chamadas `t("key")` de uma vez (alto risco de quebra), vamos simplificar o `LanguageContext` para sempre retornar PT e remover a UI de troca de idioma. Isso é seguro, rápido e elimina a funcionalidade bilíngue sem reescrever dezenas de componentes.

## Alterações

| Arquivo | Ação |
|---------|------|
| `src/contexts/LanguageContext.tsx` | Remover tipo `Lang`, remover coluna `en` das translations, simplificar `t()` para lookup direto. Remover `setLang` da interface (manter no-op para compatibilidade). |
| `src/components/LanguageToggle.tsx` | Deletar arquivo |
| `src/components/AppLayout.tsx` | Remover import e uso do `LanguageToggle` (2 ocorrências: header mobile e sidebar desktop) |
| `src/components/MasterAnalyzerModal.tsx` | Substituir todos os ternários `lang === "pt" ? "X" : "Y"` por apenas "X" (a string PT). Remover `const { lang } = useLanguage()` |
| `src/lib/audioAnalysis.ts` | Remover parâmetro `lang` de `generateSuggestions`, manter apenas strings PT |
| `src/pages/Welcome.tsx` | Remover `LanguageToggle` se usado lá |

## O que NÃO muda
- Todas as chamadas `t("key")` continuam funcionando — apenas retornam sempre o valor PT
- Nenhuma alteração de banco de dados
- `LanguageProvider` permanece no App.tsx (wrapper inofensivo, evita quebrar imports)

