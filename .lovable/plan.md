
## Plano: Ratificar preservação das feições do artista no Criativo

Vou reforçar o fluxo de geração de imagem para que, sempre que houver uma imagem de referência com rosto humano, a IA seja instruída de forma explícita a preservar identidade, feições e características faciais do artista. A experiência também deixará claro ao usuário que a imagem enviada é tratada como material autorizado por ele.

## Ajustes propostos

### 1. Reforçar o prompt da função de geração de imagem

Atualizar `supabase/functions/generate-creative/index.ts` para tornar a regra de preservação facial mais forte quando `editImageUrl` existir.

Hoje já existe uma instrução de preservação, mas vou ampliar para cobrir:

- não alterar feições;
- não trocar identidade;
- não “embelezar” ou reconstruir o rosto;
- não mudar estrutura facial, idade aparente, expressão essencial, tom de pele ou traços distintivos;
- usar a referência como base de identidade, não apenas como inspiração visual;
- permitir alterações apenas em composição, cenário, iluminação, paleta, roupa, tipografia e formato da peça.

Exemplo de intenção do prompt:

```text
Preserve the artist's facial identity exactly. Do not modify facial features,
face shape, skin tone, age appearance, expression essence, distinctive marks,
or identity. The user is assumed to hold the necessary image and related rights.
Use the reference image as authorized source material.
```

### 2. Incluir a premissa de direitos de imagem no backend

Adicionar ao system prompt uma instrução clara de contexto:

- a plataforma parte do princípio de que o usuário possui autorização/direitos sobre a imagem enviada;
- a IA não deve recusar a edição por esse motivo;
- a edição deve se limitar a criar material artístico/promocional preservando a identidade.

Isso evita respostas ambíguas quando o modelo interpreta rosto real como conteúdo sensível.

### 3. Melhorar o texto visível na área de referência

Atualizar `src/pages/Creative.tsx`, no bloco “Imagem de referência”, para substituir a mensagem atual:

```text
A IA usará esta imagem como base para criar sua peça.
```

por algo mais explícito e tranquilizador:

```text
A IA usará esta imagem como referência autorizada e deverá preservar as feições do artista, alterando apenas estética, composição, cenário e iluminação.
```

### 4. Ajustar o componente de upload de referência

Atualizar `src/components/creative/ReferenceImageUpload.tsx` para incluir uma microcopy abaixo do upload, seguindo o padrão visual minimalista atual:

```text
Envie uma foto autorizada do artista. As feições devem ser preservadas na geração.
```

Quando houver imagem carregada, também manter um lembrete discreto:

```text
Referência carregada — preservar identidade facial.
```

### 5. Reforçar variações, edições e desdobramentos

Garantir que os fluxos que usam imagem base também recebam a mesma regra:

- “Gerar a partir da referência”;
- “Criar variação”;
- “Editar imagem”;
- “Desdobrar para canais”.

A função backend já detecta `editImageUrl`, então a principal blindagem ficará centralizada ali. No frontend, a comunicação será alinhada para o usuário entender que a preservação facial é parte do comportamento esperado.

### 6. Atualizar linguagem sem criar fricção jurídica

Não vou adicionar checkbox obrigatório nem modal de consentimento, para não atrapalhar a jornada criativa. A premissa será comunicada como orientação de uso:

- “foto autorizada”;
- “preservar feições”;
- “alterar apenas estética/composição”.

## Resultado esperado

Depois da alteração:

- imagens de referência com artista terão preservação facial reforçada;
- a IA receberá instruções mais rígidas para não alterar a identidade;
- o usuário entenderá que a foto enviada é assumida como autorizada;
- variações e desdobramentos manterão o rosto do artista consistente;
- o Criativo continuará fluido, sem adicionar etapas burocráticas.
