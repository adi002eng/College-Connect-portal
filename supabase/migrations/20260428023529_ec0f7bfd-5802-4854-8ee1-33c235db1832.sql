DO $$
DECLARE uid UUID;
BEGIN
  FOR uid IN SELECT id FROM auth.users WHERE email_confirmed_at IS NULL LOOP
    DELETE FROM public.messages WHERE sender_id = uid;
    DELETE FROM public.conversations WHERE user1_id = uid OR user2_id = uid;
    DELETE FROM public.notifications WHERE user_id = uid;
    DELETE FROM public.anon_answers WHERE user_id = uid;
    DELETE FROM public.anon_questions WHERE user_id = uid;
    DELETE FROM public.team_applications WHERE applicant_id = uid;
    DELETE FROM public.team_posts WHERE user_id = uid;
    DELETE FROM public.events WHERE user_id = uid;
    DELETE FROM public.notes WHERE user_id = uid;
    DELETE FROM public.staff_verifications WHERE user_id = uid;
    DELETE FROM public.user_roles WHERE user_id = uid;
    DELETE FROM public.profiles WHERE id = uid;
    DELETE FROM auth.users WHERE id = uid;
  END LOOP;
END $$;