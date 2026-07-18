-- 1. Extend the roles enum (safe: no new literals used in this migration)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'delivery_support';

-- 2. Invitations table
CREATE TABLE public.admin_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role public.app_role NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (email, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_invites TO authenticated;
GRANT ALL ON public.admin_invites TO service_role;

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invites"
  ON public.admin_invites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert invites"
  ON public.admin_invites FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update invites"
  ON public.admin_invites FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invites"
  ON public.admin_invites FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_admin_invites_updated_at
  BEFORE UPDATE ON public.admin_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Let a signed-in user claim any role invitations sent to their email
CREATE OR REPLACE FUNCTION public.claim_my_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_email text;
  granted integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  SELECT lower(email) INTO my_email FROM auth.users WHERE id = auth.uid();
  IF my_email IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  SELECT auth.uid(), ai.role
  FROM public.admin_invites ai
  WHERE lower(ai.email) = my_email AND ai.status = 'pending'
  ON CONFLICT (user_id, role) DO NOTHING;

  GET DIAGNOSTICS granted = ROW_COUNT;

  UPDATE public.admin_invites
  SET status = 'accepted', updated_at = now()
  WHERE lower(email) = my_email AND status = 'pending';

  RETURN granted;
END;
$$;