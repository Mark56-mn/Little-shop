-- Add referral system and signup bonus to profiles
-- This enables referral codes and tracking referrals

-- Add referred_by and referral_code to profiles if they don't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS can_request_payout BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payout_account_number TEXT,
ADD COLUMN IF NOT EXISTS payout_account_name TEXT,
ADD COLUMN IF NOT EXISTS payout_bank_name TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- Update existing users to have 5000 bonus if they don't have points yet
UPDATE public.customer_points 
SET points_balance = CASE 
  WHEN points_balance = 0 THEN 5000 
  ELSE points_balance 
END,
points_earned = CASE 
  WHEN points_earned = 0 THEN 5000 
  ELSE points_earned 
END
WHERE points_balance = 0;

-- Update profiles to have 5000 default points for existing users
UPDATE public.profiles 
SET points_balance = 5000 
WHERE points_balance IS NULL OR points_balance = 0;

-- Drop existing referrals table if it exists with old structure
DROP TABLE IF EXISTS public.referral_commissions;
DROP TABLE IF EXISTS public.referrals;

-- Create new referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL UNIQUE,
  commission_percentage NUMERIC(5, 2) DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);

-- Create referral commissions table
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  commission_amount NUMERIC(12, 2) NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_referral_commissions_referral ON public.referral_commissions(referral_id);

-- Add max_bonus_per_unit to products for limiting bonus use
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS max_bonus_per_unit NUMERIC(10, 2);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT SELECT, INSERT ON public.referral_commissions TO authenticated;

-- Add RLS policies for referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see referrals" ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see their commissions" ON public.referral_commissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.referrals r 
      WHERE r.id = referral_id AND r.referrer_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );
