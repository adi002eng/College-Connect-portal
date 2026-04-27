-- Delete all data and users except the admin
DO $$
DECLARE
  admin_id UUID := '1bf76512-cd12-446c-a141-4f254516a0b0';
BEGIN
  -- Messages & conversations (chats)
  DELETE FROM public.messages
    WHERE conversation_id IN (
      SELECT id FROM public.conversations
      WHERE user1_id <> admin_id OR user2_id <> admin_id
    );
  DELETE FROM public.conversations
    WHERE user1_id <> admin_id OR user2_id <> admin_id;

  -- Team applications & posts
  DELETE FROM public.team_applications WHERE applicant_id <> admin_id;
  DELETE FROM public.team_applications
    WHERE team_post_id IN (SELECT id FROM public.team_posts WHERE user_id <> admin_id);
  DELETE FROM public.team_posts WHERE user_id <> admin_id;

  -- Anonymous Q&A
  DELETE FROM public.anon_answers WHERE user_id <> admin_id;
  DELETE FROM public.anon_answers
    WHERE question_id IN (SELECT id FROM public.anon_questions WHERE user_id <> admin_id);
  DELETE FROM public.anon_questions WHERE user_id <> admin_id;

  -- Events & notes
  DELETE FROM public.events WHERE user_id <> admin_id;
  DELETE FROM public.notes WHERE user_id <> admin_id;

  -- Notifications
  DELETE FROM public.notifications WHERE user_id <> admin_id;

  -- Staff verifications
  DELETE FROM public.staff_verifications WHERE user_id <> admin_id;

  -- Roles & profiles
  DELETE FROM public.user_roles WHERE user_id <> admin_id;
  DELETE FROM public.profiles WHERE id <> admin_id;

  -- Finally remove auth users
  DELETE FROM auth.users WHERE id <> admin_id;
END $$;