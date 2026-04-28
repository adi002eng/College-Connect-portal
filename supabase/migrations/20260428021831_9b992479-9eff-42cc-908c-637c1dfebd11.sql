DO $$
DECLARE uid UUID := '0a6d2ff7-1c87-4fe1-80bc-bd541c2374e6';
BEGIN
  DELETE FROM public.messages WHERE sender_id = uid;
  DELETE FROM public.conversations WHERE user1_id = uid OR user2_id = uid;
  DELETE FROM public.team_applications WHERE applicant_id = uid;
  DELETE FROM public.team_posts WHERE user_id = uid;
  DELETE FROM public.anon_answers WHERE user_id = uid;
  DELETE FROM public.anon_questions WHERE user_id = uid;
  DELETE FROM public.events WHERE user_id = uid;
  DELETE FROM public.notes WHERE user_id = uid;
  DELETE FROM public.notifications WHERE user_id = uid;
  DELETE FROM public.staff_verifications WHERE user_id = uid;
  DELETE FROM public.user_roles WHERE user_id = uid;
  DELETE FROM public.profiles WHERE id = uid;
  DELETE FROM auth.users WHERE id = uid;
END $$;