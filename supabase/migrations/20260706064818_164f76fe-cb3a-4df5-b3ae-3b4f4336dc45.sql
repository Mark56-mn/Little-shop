
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  points_balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- POINT TRANSACTIONS (ledger)
CREATE TABLE public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.point_transactions TO authenticated;
GRANT ALL ON public.point_transactions TO service_role;

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own point transactions"
  ON public.point_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_point_tx_user ON public.point_transactions(user_id);

-- Link orders to a customer (optional; guests still allowed)
ALTER TABLE public.orders ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN points_redeemed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN points_awarded BOOLEAN NOT NULL DEFAULT false;

-- Referral code generator
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 7));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, referral_code)
  VALUES (NEW.id, NEW.email, public.generate_referral_code())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Apply a referral code (called by the referred user after signing up)
CREATE OR REPLACE FUNCTION public.apply_referral(_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id UUID;
  my_id UUID;
  already_referred UUID;
BEGIN
  my_id := auth.uid();
  IF my_id IS NULL THEN RETURN 'not_authenticated'; END IF;

  SELECT referred_by INTO already_referred FROM public.profiles WHERE id = my_id;
  IF already_referred IS NOT NULL THEN RETURN 'already_referred'; END IF;

  SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = upper(_code);
  IF referrer_id IS NULL THEN RETURN 'invalid_code'; END IF;
  IF referrer_id = my_id THEN RETURN 'self_referral'; END IF;

  UPDATE public.profiles SET referred_by = referrer_id WHERE id = my_id;

  -- Reward the referrer for the signup
  UPDATE public.profiles SET points_balance = points_balance + 100 WHERE id = referrer_id;
  INSERT INTO public.point_transactions (user_id, points, reason)
  VALUES (referrer_id, 100, 'Referral signup bonus');

  RETURN 'ok';
END;
$$;

-- Backfill profiles for any existing users
INSERT INTO public.profiles (id, email, referral_code)
SELECT u.id, u.email, public.generate_referral_code()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
