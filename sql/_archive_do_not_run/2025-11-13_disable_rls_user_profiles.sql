-- Temporary fix: Disable RLS on user_profiles to avoid infinite recursion
-- This allows all authenticated users to read their profile data

-- Drop all policies that cause recursion
DROP POLICY IF EXISTS "Owners can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Managers can view branch profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners and managers can view all profiles" ON user_profiles;

-- Keep only simple policies without recursion
-- These policies work because they don't query user_profiles table

-- Users can view own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update own profile  
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id);

-- Allow INSERT for authenticated users
DROP POLICY IF EXISTS "Only owners can insert profiles" ON user_profiles;
CREATE POLICY "Allow authenticated insert"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow UPDATE for authenticated users
DROP POLICY IF EXISTS "Only owners can update profiles" ON user_profiles;
CREATE POLICY "Allow authenticated update"
ON user_profiles FOR UPDATE
TO authenticated
USING (true);

-- Verify remaining policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
