
# Fix: "Projeto não encontrado" for Guest/Collaborator Projects

## Problem
When a collaborator clicks "Ver projeto e chat", they navigate to `/projects/:id` which uses the `get_project_for_member` RPC. This function checks `project_members.user_id = auth.uid()`, but `project_members.user_id` is set to the **project owner's** ID (the owner adds the member via `addProfessional`). So the collaborator's `auth.uid()` never matches, and the project isn't found.

Meanwhile, the project list (`get_member_projects`) correctly finds guest projects by matching the collaborator's **email** in `project_invitations`. The two functions use incompatible lookup logic.

## Fix

### 1. Update `get_project_for_member` RPC (database migration)
Align its logic with `get_member_projects` — check both `project_members.user_id` AND `project_invitations` (by email, status='accepted'):

```sql
CREATE OR REPLACE FUNCTION public.get_project_for_member(p_project_id uuid)
RETURNS TABLE(id uuid, name text, artist text, stage text, completed boolean, project_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.name, p.artist, p.stage, p.completed, p.project_type
  FROM public.projects p
  WHERE p.id = p_project_id
    AND (
      EXISTS (
        SELECT 1 FROM public.project_members m
        WHERE m.project_id = p_project_id AND m.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_invitations pi
        WHERE pi.project_id = p_project_id
          AND pi.status = 'accepted'
          AND lower(pi.professional_email) = lower((
            SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1
          ))
      )
    );
$$;
```

### 2. No frontend changes needed
The `ProjectDetail.tsx` code already calls this RPC correctly. Once the function is fixed, guest projects will load.

## Root Cause Summary
`addProfessional` (owner-side) stores `user_id = owner.id` in `project_members`. The invite acceptance edge function stores the correct collaborator `user_id`, but only when the collaborator already has an account. The two data paths are inconsistent. The RPC fix above covers both paths.
