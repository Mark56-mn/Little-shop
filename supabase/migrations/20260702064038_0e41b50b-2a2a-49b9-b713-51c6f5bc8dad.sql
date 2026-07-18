
CREATE POLICY "Admins manage product images" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read product images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');
