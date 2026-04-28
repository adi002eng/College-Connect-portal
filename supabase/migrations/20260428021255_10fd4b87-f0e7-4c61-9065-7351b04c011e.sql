-- Add notifications when admin approves/rejects staff verification
CREATE OR REPLACE FUNCTION public.approve_staff(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role IN ('pending_staff','student');
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'staff') ON CONFLICT DO NOTHING;
  UPDATE public.staff_verifications SET status = 'approved', reviewer_id = auth.uid(), reviewed_at = now()
    WHERE user_id = _user_id AND status = 'pending';

  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (_user_id, 'staff_approved', 'Staff verification approved 🎉',
    'You are now a verified staff member. You can post events and more.', '/app/profile');
END; $function$;

CREATE OR REPLACE FUNCTION public.reject_staff(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'pending_staff';
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'student') ON CONFLICT DO NOTHING;
  UPDATE public.staff_verifications SET status = 'rejected', reviewer_id = auth.uid(), reviewed_at = now()
    WHERE user_id = _user_id AND status = 'pending';

  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (_user_id, 'staff_rejected', 'Staff verification update',
    'Your staff verification was not approved. You can re-apply from your profile.', '/app/profile');
END; $function$;

-- Allow notifications insert via SECURITY DEFINER functions (already works since functions bypass RLS)
-- But also allow authenticated inserts via triggers/functions that already exist; no policy change needed.