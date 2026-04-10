

# Correção do Fluxo de Participação em Projetos como Parceiro

## Diagnóstico

Há 3 problemas interligados impedindo o fluxo de parceiro de funcionar:

### Problema 1: `addProfessional` grava `user_id` do dono
Em `ProjectContext.tsx` linha 437, ao adicionar um membro, o `user_id` é sempre o do dono do projeto (`user.id`). Isso significa que o registro em `project_members` pertence ao dono, não ao colaborador.

### Problema 2: `respond-to-invite` não atualiza o `project_members` existente
A edge function tenta fazer `upsert` com `onConflict: "project_id,user_id"`, mas **não existe unique constraint** nessas colunas. Além disso, o registro existente tem `user_id = dono`, então mesmo com constraint, não daria match com o `user_id` do colaborador.

### Problema 3: RLS de `project_members` bloqueia o colaborador
A policy `Users manage own project_members` usa `auth.uid() = user_id`. Como o `user_id` é do dono, o colaborador não consegue ler seus próprios registros.

## Solução (4 passos)

### 1. Migração: Adicionar RLS para colaboradores em `project_members`
Adicionar policy que permite ao colaborador ler registros onde seu email aparece em um convite aceito para o mesmo projeto:
```sql
CREATE POLICY "Collaborators can view their membership"
ON public.project_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_invitations pi
    WHERE pi.project_id = project_members.project_id
      AND pi.status = 'accepted'
      AND lower(pi.professional_email) = lower((
        SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
      ))
  )
);
```

### 2. Corrigir `respond-to-invite` edge function
Ao aceitar convite, em vez de `upsert` com `onConflict`, fazer:
- Buscar `project_members` existente por `project_id + email`
- Se encontrar, fazer `UPDATE` adicionando o `user_id` correto do colaborador
- Se não encontrar, fazer `INSERT` com o `user_id` do colaborador

### 3. Migração de dados: Corrigir registros existentes
Atualizar `project_members` existentes cujo email corresponde a um usuário real, colocando o `user_id` correto:
```sql
UPDATE public.project_members pm
SET user_id = u.id
FROM auth.users u
WHERE lower(pm.email) = lower(u.email)
  AND pm.user_id != u.id;
```

### 4. Adicionar RLS para `project_messages`, `project_files` e `tasks` — acesso via convite
As policies de chat e arquivos verificam `project_members.user_id = auth.uid()`. Com o passo 3 corrigindo os dados, isso já funciona. Mas adicionamos fallback via `project_invitations` para robustez.

## Arquivos modificados
- `supabase/functions/respond-to-invite/index.ts` — corrigir lógica de upsert do membro
- Migração SQL — RLS para colaboradores + correção de dados existentes

## Resultado esperado
Após a correção, um colaborador que aceite o convite verá:
- Projeto listado no Dashboard ("Projetos como Parceiro")
- Detalhes do projeto acessíveis ao clicar
- Chat, arquivos e tarefas visíveis dentro do projeto

