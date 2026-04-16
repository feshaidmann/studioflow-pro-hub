DELETE FROM public.ai_invocations
WHERE user_id = '636dd9c8-bb3b-4ad3-84f1-0d08fadbfb2d'
  AND function_name IN ('generate-creative', 'generate-creative-text')
  AND created_at >= now() - interval '7 days';