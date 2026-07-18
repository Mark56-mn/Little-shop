-- Points System Table
CREATE TABLE public.customer_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.customer_points TO authenticated;
GRANT ALL ON public.customer_points TO service_role;
ALTER TABLE public.customer_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points" ON public.customer_points
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all points" ON public.customer_points
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX idx_user_points ON public.customer_points(user_id);

-- Points Activities Log
CREATE TABLE public.points_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  points_amount integer NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.points_activities TO authenticated;
GRANT ALL ON public.points_activities TO service_role;
ALTER TABLE public.points_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activities" ON public.points_activities
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_points_activities_user ON public.points_activities(user_id);

-- Referral System Table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE,
  referred_at timestamptz,
  commission_percentage numeric NOT NULL DEFAULT 0,
  commission_earned numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their referrals" ON public.referrals
  FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);
CREATE POLICY "Admins can view all referrals" ON public.referrals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_referral_code ON public.referrals(referral_code);
CREATE INDEX idx_referrer ON public.referrals(referrer_id);

-- Referral Commissions Log
CREATE TABLE public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  commission_amount numeric NOT NULL,
  percentage numeric NOT NULL,
  status text NOT NULL DEFAULT 'earned',
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_commissions TO authenticated;
GRANT ALL ON public.referral_commissions TO service_role;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their commissions" ON public.referral_commissions
  FOR SELECT TO authenticated
  USING (
    referral_id IN (
      SELECT id FROM public.referrals WHERE referrer_id = auth.uid()
    )
  );

CREATE INDEX idx_referral_commissions ON public.referral_commissions(referral_id);

-- Extend profiles with payout details
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_commission_balance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_request_payout boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_method text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_account_number text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_account_name text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_bank_name text;

-- Payout Requests Table
CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payout_method text NOT NULL,
  account_details jsonb NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  notes text
);

GRANT SELECT, INSERT ON public.payout_requests TO authenticated;
GRANT ALL ON public.payout_requests TO service_role;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their payout requests" ON public.payout_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all payout requests" ON public.payout_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_payout_requests_user ON public.payout_requests(user_id);

-- Extend store_settings with points and referral configuration
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS points_per_naira numeric NOT NULL DEFAULT 1;
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS referral_commission_percentage numeric NOT NULL DEFAULT 10;
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS points_discount_rate numeric NOT NULL DEFAULT 1;

-- Link referral code to user profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by_code text REFERENCES public.referrals(referral_code) ON DELETE SET NULL;
