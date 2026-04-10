
-- Function: only project owner can generate download URLs
CREATE OR REPLACE FUNCTION public.get_file_download_url(p_file_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_storage_path text;
  v_project_id uuid;
  v_owner_id uuid;
BEGIN
  -- Get file info
  SELECT pf.storage_path, pf.project_id
    INTO v_storage_path, v_project_id
    FROM public.project_files pf
   WHERE pf.id = p_file_id;

  IF v_storage_path IS NULL THEN
    RAISE EXCEPTION 'Arquivo não encontrado';
  END IF;

  -- Check ownership
  SELECT p.user_id INTO v_owner_id
    FROM public.projects p
   WHERE p.id = v_project_id;

  IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'Apenas o dono do projeto pode baixar arquivos';
  END IF;

  -- Generate signed URL via storage API (1 hour)
  RETURN (
    SELECT storage.foldername(v_storage_path)::text
  );
END;
$$;
