-- Complete Database Setup Script for PlugMart Express
-- This script sets up all tables, RLS policies, and functions needed for the application
-- Run this after creating a new Supabase project

-- =====================================================
-- ENUMS & TYPES
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'support_manager', 'delivery_support');

-- =====================================================
-- PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  points_balance INTEGER DEFAULT 5000,
  referral_commission_balance NUMERIC(12, 2) DEFAULT 0,
  referred_by UUID REFERENCES public.profiles(id),
  referral_code TEXT UNIQUE,
  can_request_payout BOOLEAN DEFAULT FALSE,
  payout_account_number TEXT,
  payout_account_name TEXT,
  payout_bank_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_referred_by ON public.profiles(referred_by);

-- =====================================================
-- USER ROLES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- =====================================================
-- STORE SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT DEFAULT 'PlugMart',
  logo_url TEXT,
  banner_url TEXT,
  whatsapp_number TEXT,
  profit_multiplier NUMERIC(5, 2) DEFAULT 1.8,
  default_shipping_fee NUMERIC(10, 2) DEFAULT 0,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_sort_code TEXT,
  bank_transfer_instructions TEXT,
  points_per_naira NUMERIC(5, 2) DEFAULT 1,
  referral_commission_percentage NUMERIC(5, 2) DEFAULT 10,
  points_discount_rate NUMERIC(5, 2) DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COLLECTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_collections_slug ON public.collections(slug);

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  images JSONB,
  published BOOLEAN DEFAULT FALSE,
  collection_id UUID REFERENCES public.collections(id),
  shipping_origin TEXT,
  shipping_delivery_min_days INTEGER,
  shipping_delivery_max_days INTEGER,
  shipping_cost_min NUMERIC(10, 2),
  shipping_cost_max NUMERIC(10, 2),
  max_bonus_per_unit NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_collection ON public.products(collection_id);
CREATE INDEX idx_products_published ON public.products(published);

-- =====================================================
-- PRODUCT COLOR TAGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.product_color_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  color_name TEXT NOT NULL,
  color_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_product_color_tags_product ON public.product_color_tags(product_id);

-- =====================================================
-- ORDERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_title TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC(12, 2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  paystack_reference TEXT UNIQUE,
  user_id UUID REFERENCES public.profiles(id),
  points_redeemed INTEGER DEFAULT 0,
  points_awarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX idx_orders_paystack_reference ON public.orders(paystack_reference);

-- =====================================================
-- ORDER ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_title TEXT NOT NULL,
  selected_size TEXT,
  selected_color TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

-- =====================================================
-- POINTS TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.customer_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_balance INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  points_redeemed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.points_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  points_amount INTEGER NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_points_activities_user ON public.points_activities(user_id);
CREATE INDEX idx_points_activities_order ON public.points_activities(order_id);

-- =====================================================
-- REFERRAL TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL UNIQUE,
  commission_percentage NUMERIC(5, 2) DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);

CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  commission_amount NUMERIC(12, 2) NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_referral_commissions_referral ON public.referral_commissions(referral_id);

-- =====================================================
-- PAYOUT REQUEST TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  payout_method TEXT NOT NULL,
  account_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payout_requests_user ON public.payout_requests(user_id);

-- =====================================================
-- BANK TRANSFER WEBHOOK TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bank_transfer_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE REFERENCES public.orders(id),
  webhook_data JSONB,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bank_webhooks_order ON public.bank_transfer_webhooks(order_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own profile, admins can read all
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Store settings: Everyone can read, only admins can update
CREATE POLICY "Everyone can read settings" ON public.store_settings FOR SELECT
  TO authenticated USING (TRUE);
CREATE POLICY "Only admins can update settings" ON public.store_settings FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Collections: Everyone can read, only admins can write
CREATE POLICY "Everyone can read collections" ON public.collections FOR SELECT
  TO authenticated USING (TRUE);
CREATE POLICY "Only admins can manage collections" ON public.collections FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Products: Everyone can read published, admins can manage all
CREATE POLICY "Users can read published products" ON public.products FOR SELECT
  USING (published = TRUE OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can manage products" ON public.products FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Orders: Users see own, admins see all
CREATE POLICY "Users can read own orders" ON public.orders FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert orders" ON public.orders FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Points & Referrals: Users see own, admins see all
CREATE POLICY "Users can read own points" ON public.customer_points FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own activities" ON public.points_activities FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- DEFAULT COLLECTIONS
-- =====================================================

INSERT INTO public.collections (name, slug, description, sort_order) VALUES
  ('Beauty', 'beauty', 'Beauty and cosmetics products', 1),
  ('Men''s Wear', 'mens-wear', 'Clothing and accessories for men', 2),
  ('Women''s Wear', 'womens-wear', 'Clothing and accessories for women', 3),
  ('Unisex', 'unisex', 'Universal clothing and accessories', 4),
  ('Shoes', 'shoes', 'Footwear for all occasions', 5)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- DEFAULT STORE SETTINGS
-- =====================================================

INSERT INTO public.store_settings (store_name) 
SELECT 'PlugMart Express' 
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings LIMIT 1);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- GRANTS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT ALL ON public.store_settings TO authenticated;

GRANT SELECT ON public.collections TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.customer_points TO authenticated;
GRANT SELECT, INSERT ON public.points_activities TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT SELECT, INSERT ON public.referral_commissions TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.payout_requests TO authenticated;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================

-- To make your email an admin, run:
-- UPDATE public.user_roles SET role = 'admin' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
-- INSERT INTO public.user_roles (user_id, role) VALUES ((SELECT id FROM auth.users WHERE email = 'your-email@example.com'), 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
