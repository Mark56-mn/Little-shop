-- Fix admin access for tradebetter98@gmail.com
-- Run this in your Supabase SQL Editor

-- Step 1: Find your user ID and create admin role
WITH user_info AS (
  SELECT id, email 
  FROM auth.users 
  WHERE email = 'tradebetter98@gmail.com'
  LIMIT 1
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM user_info
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the role was created
SELECT 
  au.id as user_id,
  au.email,
  ur.role,
  ur.created_at
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id
WHERE au.email = 'tradebetter98@gmail.com';
