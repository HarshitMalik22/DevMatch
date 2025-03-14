/*
  # Fix profiles security and storage

  1. Security Changes
    - Add RLS policies for profiles table to allow:
      - Users to insert their own profile
      - Users to read all profiles
      - Users to update their own profile
    - Add storage bucket for avatars

  2. Changes
    - Fix profiles table constraints
    - Add proper RLS policies
*/

-- Create avatars storage bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name)
  VALUES ('avatars', 'avatars')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Update storage bucket policy
CREATE POLICY "Allow public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated users to upload avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Fix profiles table RLS policies
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Enable read access for authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);