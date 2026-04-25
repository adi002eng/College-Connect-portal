
-- 1. Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'student', 'pending_staff', 'banned');

-- 2. user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_verified_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('staff','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_banned(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'banned');
$$;

-- 4. user_roles policies
CREATE POLICY "Roles viewable by authenticated"
ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage roles insert"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles delete"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles update"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

-- 6. Staff verifications
CREATE TABLE public.staff_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proof_url TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewer_id UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verification"
ON public.staff_verifications FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own verification"
ON public.staff_verifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

CREATE POLICY "Admins update verification"
ON public.staff_verifications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete verification"
ON public.staff_verifications FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Storage bucket for proofs (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('staff-proofs', 'staff-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own proof"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'staff-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users view own proof"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'staff-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Admins delete proof"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'staff-proofs' AND public.has_role(auth.uid(), 'admin'));

-- 8. Update events RLS: only verified staff can insert/update/delete
DROP POLICY IF EXISTS "Users insert own events" ON public.events;
DROP POLICY IF EXISTS "Users update own events" ON public.events;
DROP POLICY IF EXISTS "Users delete own events" ON public.events;

CREATE POLICY "Verified staff insert events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_verified_staff(auth.uid())
  AND NOT public.is_banned(auth.uid())
);

CREATE POLICY "Verified staff update own events"
ON public.events FOR UPDATE TO authenticated
USING (
  (auth.uid() = user_id AND public.is_verified_staff(auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Owner or admin delete events"
ON public.events FOR DELETE TO authenticated
USING (
  (auth.uid() = user_id AND public.is_verified_staff(auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
);

-- 9. Admin extra controls on profiles & misc tables
CREATE POLICY "Admins delete profiles"
ON public.profiles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete any team post / notes / questions / answers / messages indirectly through profile cascade or directly
CREATE POLICY "Admins delete team posts"
ON public.team_posts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete notes"
ON public.notes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete anon questions"
ON public.anon_questions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete anon answers"
ON public.anon_answers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 10. Update handle_new_user to also save college/role/skills + create role row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
  v_college TEXT;
  v_skills TEXT;
  v_email TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  v_college := NEW.raw_user_meta_data->>'college';
  v_skills := NEW.raw_user_meta_data->>'skills';
  v_email := NEW.email;

  INSERT INTO public.profiles (id, full_name, avatar_url, college, role, skills)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url',
    v_college,
    v_role,
    v_skills
  );

  -- Default role assignment
  IF v_email = 'maneeshrawat143@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSIF v_role = 'staff' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'pending_staff')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Backfill: every existing user without role gets 'student'
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'student'::public.app_role FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT DO NOTHING;

-- Promote existing admin if already signed up
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'maneeshrawat143@gmail.com'
ON CONFLICT DO NOTHING;

-- Approve-staff helper (called from admin UI via RPC)
CREATE OR REPLACE FUNCTION public.approve_staff(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role IN ('pending_staff','student');
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'staff') ON CONFLICT DO NOTHING;
  UPDATE public.staff_verifications SET status = 'approved', reviewer_id = auth.uid(), reviewed_at = now()
    WHERE user_id = _user_id AND status = 'pending';
END; $$;

CREATE OR REPLACE FUNCTION public.reject_staff(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'pending_staff';
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'student') ON CONFLICT DO NOTHING;
  UPDATE public.staff_verifications SET status = 'rejected', reviewer_id = auth.uid(), reviewed_at = now()
    WHERE user_id = _user_id AND status = 'pending';
END; $$;

CREATE OR REPLACE FUNCTION public.ban_user(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'banned') ON CONFLICT DO NOTHING;
  UPDATE public.profiles SET is_banned = true WHERE id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.unban_user(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'banned';
  UPDATE public.profiles SET is_banned = false WHERE id = _user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_user_profile(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.profiles WHERE id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
END; $$;
