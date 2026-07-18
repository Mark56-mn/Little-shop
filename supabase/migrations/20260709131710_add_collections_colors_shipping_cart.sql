-- Add collections table
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.collections TO anon, authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view collections" ON public.collections
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage collections" ON public.collections
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Product color tags (for tagging specific images with colors)
CREATE TABLE public.product_color_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_index integer NOT NULL,
  color_name text NOT NULL,
  color_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_color_tags TO anon, authenticated;
GRANT ALL ON public.product_color_tags TO service_role;
ALTER TABLE public.product_color_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view color tags" ON public.product_color_tags
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage color tags" ON public.product_color_tags
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_product_color_tags ON public.product_color_tags(product_id, image_index);

-- Extend products table with collection_id and shipping details
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_origin text;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_min_days integer;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_max_days integer;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_cost_min numeric NOT NULL DEFAULT 0;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_cost_max numeric NOT NULL DEFAULT 0;

-- Modify orders table to support multiple items (create order_items table)
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_title text NOT NULL,
  selected_size text,
  selected_color text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO anon;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_order_items ON public.order_items(order_id);

-- Extend store_settings with bank transfer details
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS bank_account_name text;
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS bank_sort_code text;
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS bank_transfer_instructions text;

-- Add bank transfer webhooks table for payment confirmation
CREATE TABLE public.bank_transfer_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  webhook_source text NOT NULL,
  webhook_data jsonb NOT NULL,
  payment_confirmed boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bank_transfer_webhooks TO authenticated;
GRANT SELECT, INSERT ON public.bank_transfer_webhooks TO anon;
GRANT ALL ON public.bank_transfer_webhooks TO service_role;
ALTER TABLE public.bank_transfer_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bank transfer webhooks" ON public.bank_transfer_webhooks
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_bank_webhooks_order ON public.bank_transfer_webhooks(order_id);

-- Seed default collections
INSERT INTO public.collections (name, slug, description, sort_order) VALUES
  ('Beauty', 'beauty', 'Beauty and cosmetics products', 1),
  ('Men\'s Wear', 'mens-wear', 'Clothing and accessories for men', 2),
  ('Women\'s Wear', 'womens-wear', 'Clothing and accessories for women', 3),
  ('Unisex', 'unisex', 'Universal clothing and accessories', 4),
  ('Shoes', 'shoes', 'Footwear for all occasions', 5)
ON CONFLICT (slug) DO NOTHING;
