ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS allow_global_listing boolean NOT NULL DEFAULT false;

-- Drop the existing restrictive policy and replace with one that also shows globally listed professionals
DROP POLICY IF EXISTS "Users can view own professionals" ON public.professionals;

CREATE POLICY "Users can view own professionals or globally listed"
ON public.professionals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR allow_global_listing = true);