
-- =========================================================
-- 1. CONVERSATIONS + MESSAGES
-- =========================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  team_post_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conv_distinct CHECK (user1_id <> user2_id),
  CONSTRAINT conv_unique UNIQUE (user1_id, user2_id, team_post_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view conversation"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Participants insert conversation"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX idx_conv_users ON public.conversations(user1_id, user2_id);

CREATE POLICY "Participants view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
  ));

CREATE POLICY "Participants send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
  ));

CREATE POLICY "Participants update read status"
  ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
  ));

-- =========================================================
-- 2. NOTIFICATIONS
-- =========================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- System inserts via SECURITY DEFINER triggers — no direct insert policy needed.

-- =========================================================
-- 3. TRIGGERS — notifications + auto conversation
-- =========================================================

-- New team application -> notify post owner
CREATE OR REPLACE FUNCTION public.notify_team_application()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; post_title TEXT;
BEGIN
  SELECT user_id, title INTO owner_id, post_title FROM public.team_posts WHERE id = NEW.team_post_id;
  IF owner_id IS NOT NULL AND owner_id <> NEW.applicant_id THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (owner_id, 'team_application', 'New team application', 'Someone applied to "' || post_title || '"', '/app/profile');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_team_application
AFTER INSERT ON public.team_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_team_application();

-- Application status change -> notify applicant + auto-create conversation on accept
CREATE OR REPLACE FUNCTION public.notify_application_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id UUID; post_title TEXT; u1 UUID; u2 UUID;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT user_id, title INTO owner_id, post_title FROM public.team_posts WHERE id = NEW.team_post_id;

  IF NEW.status = 'accepted' THEN
    u1 := LEAST(owner_id, NEW.applicant_id);
    u2 := GREATEST(owner_id, NEW.applicant_id);
    INSERT INTO public.conversations(user1_id, user2_id, team_post_id)
    VALUES (u1, u2, NEW.team_post_id)
    ON CONFLICT (user1_id, user2_id, team_post_id) DO NOTHING;

    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.applicant_id, 'application_accepted',
      'Application accepted 🎉',
      'You can now chat about "' || post_title || '"', '/app/messages');
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.applicant_id, 'application_rejected',
      'Application update',
      'Your application to "' || post_title || '" was not selected', '/app/teams');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_application_status
AFTER UPDATE ON public.team_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_application_status();

-- New anonymous answer -> notify question owner
CREATE OR REPLACE FUNCTION public.notify_anon_answer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q_owner UUID;
BEGIN
  SELECT user_id INTO q_owner FROM public.anon_questions WHERE id = NEW.question_id;
  IF q_owner IS NOT NULL AND q_owner <> NEW.user_id THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (q_owner, 'anon_answer', 'New reply on your question', 'Someone replied anonymously', '/app/anonymous');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_anon_answer
AFTER INSERT ON public.anon_answers
FOR EACH ROW EXECUTE FUNCTION public.notify_anon_answer();

-- New message -> notify the other participant + bump conversation updated_at
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE other UUID; u1 UUID; u2 UUID;
BEGIN
  SELECT user1_id, user2_id INTO u1, u2 FROM public.conversations WHERE id = NEW.conversation_id;
  other := CASE WHEN NEW.sender_id = u1 THEN u2 ELSE u1 END;
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (other, 'new_message', 'New message',
    LEFT(NEW.content, 80), '/app/messages');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- =========================================================
-- 4. REALTIME
-- =========================================================
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- =========================================================
-- 5. AUTO-DELETE PAST EVENTS (cron every 15 min)
-- =========================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_past_events()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.events
  WHERE event_date IS NOT NULL AND event_date < now();
END; $$;

SELECT cron.schedule(
  'cleanup-past-events',
  '*/15 * * * *',
  $$ SELECT public.cleanup_past_events(); $$
);
