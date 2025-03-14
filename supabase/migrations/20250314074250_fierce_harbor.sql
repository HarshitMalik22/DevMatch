/*
  # Initial Schema Setup for Developer Matchmaking App

  1. Tables
    - profiles
      - User profiles with personal information and preferences
    - matches
      - Connections between users
    - messages
      - Chat messages between matched users

  2. Security
    - Enable RLS on all tables
    - Set up policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  bio text,
  skills text[] DEFAULT '{}',
  experience_level text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  github_url text,
  portfolio_url text,
  looking_for text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Matches policies
CREATE POLICY "Users can read their matches"
  ON matches FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user1_id OR
    auth.uid() = user2_id
  );

CREATE POLICY "Users can create matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "Users can update their matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user1_id OR
    auth.uid() = user2_id
  );

-- Messages policies
CREATE POLICY "Users can read messages in their matches"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE id = messages.match_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their matches"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE id = match_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
    AND sender_id = auth.uid()
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON profiles USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches (user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages (match_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);