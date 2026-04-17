DELETE FROM public.ai_invocations
WHERE user_id = '636dd9c8-bb3b-4ad3-84f1-0d08fadbfb2d'
  AND function_name = 'generate-creative'
  AND created_at > now() - interval '24 hours';