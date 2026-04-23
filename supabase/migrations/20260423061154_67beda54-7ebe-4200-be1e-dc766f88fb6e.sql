
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  college TEXT,
  branch TEXT,
  year TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by all authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notes
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  college TEXT,
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notes viewable by authenticated" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notes" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  college TEXT,
  location TEXT,
  event_date TIMESTAMPTZ,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events viewable by authenticated" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Team posts
CREATE TABLE public.team_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  project_type TEXT,
  skills_needed TEXT,
  team_size INT,
  college TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.team_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team posts viewable by authenticated" ON public.team_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own team posts" ON public.team_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own team posts" ON public.team_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own team posts" ON public.team_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Team applications
CREATE TABLE public.team_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_post_id UUID NOT NULL REFERENCES public.team_posts(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_post_id, applicant_id)
);
ALTER TABLE public.team_applications ENABLE ROW LEVEL SECURITY;
-- applicant or team-post owner can view
CREATE POLICY "App view own or owner" ON public.team_applications FOR SELECT TO authenticated
USING (
  auth.uid() = applicant_id
  OR EXISTS (SELECT 1 FROM public.team_posts tp WHERE tp.id = team_post_id AND tp.user_id = auth.uid())
);
CREATE POLICY "Applicant insert" ON public.team_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Owner updates status" ON public.team_applications FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.team_posts tp WHERE tp.id = team_post_id AND tp.user_id = auth.uid()));
CREATE POLICY "Applicant deletes own" ON public.team_applications FOR DELETE TO authenticated USING (auth.uid() = applicant_id);

-- Anonymous questions
CREATE TABLE public.anon_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.anon_questions ENABLE ROW LEVEL SECURITY;
-- Everyone authenticated can view content but NOT user_id (we use a view to hide it)
CREATE POLICY "Anon questions viewable by authenticated" ON public.anon_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own questions" ON public.anon_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own questions" ON public.anon_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Anonymous answers
CREATE TABLE public.anon_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.anon_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.anon_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon answers viewable by authenticated" ON public.anon_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own answers" ON public.anon_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own answers" ON public.anon_answers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for notes
INSERT INTO storage.buckets (id, name, public) VALUES ('notes', 'notes', true);
CREATE POLICY "Notes files public read" ON storage.objects FOR SELECT USING (bucket_id = 'notes');
CREATE POLICY "Authenticated upload notes" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner delete notes files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]);
