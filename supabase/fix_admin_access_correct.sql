-- Fix admin access for tradebetter98@gmail.com
-- This script creates a profile entry first, then assigns admin role

BEGIN;

-- Step 1: Get the user ID from auth.users
WITH user_data AS (
  SELECT id, email FROM auth.users WHERE email = 'tradebetter98@gmail.com'
),

-- Step 2: Create profile if it doesn't exist
profile_created AS (
  INSERT INTO public.profiles (id, email, full_name)
  SELECT id, email, SPLIT_PART(email, '@', 1)
  FROM user_data
  WHERE id NOT IN (SELECT id FROM public.profiles WHERE id = (SELECT id FROM user_data))
  RETURNING id, email
)

-- Step 3: Insert or update user role to admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM user_data
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the setup
SELECT 
  u.id as user_id,
  u.email,
  p.full_name,
  ur.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'tradebetter98@gmail.com';

COMMIT;
