-- Admin Setup Script for PlugMart Express
-- This script grants admin role to a user by their email address
-- 
-- INSTRUCTIONS:
-- 1. Replace 'your-email@example.com' with your actual email address
-- 2. Run this script in the Supabase SQL Editor: https://app.supabase.com/project/[YOUR_PROJECT]/sql
-- 3. Make sure you've already signed up with that email in the application

-- Step 1: Get your user ID from the email you signed up with
-- (Replace 'your-email@example.com' with your actual email)
DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Find the user by email
  SELECT id INTO user_id FROM auth.users WHERE email = 'your-email@example.com' LIMIT 1;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email "your-email@example.com" not found. Make sure you have signed up with this email first.';
  END IF;
  
  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Admin role granted to user: %', user_id;
END $$;

-- Verify the role was granted
SELECT 
  au.id,
  au.email,
  ARRAY_AGG(ur.role) as roles
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id
WHERE au.email = 'your-email@example.com'
GROUP BY au.id, au.email;
