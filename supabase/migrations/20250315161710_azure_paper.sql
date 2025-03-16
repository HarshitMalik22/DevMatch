/*
  # Fix Matches Table RLS Policies

  1. Changes
    - Drop existing matches policies
    - Add new comprehensive RLS policies for matches table
    - Fix match creation and querying permissions

  2. Security
    - Enable proper access control for match creation
    - Allow users to view their own matches
    - Ensure users can only create matches where they are user1
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their matches" ON matches;
DROP POLICY IF EXISTS "Users can create matches" ON matches;
DROP POLICY IF EXISTS "Users can update their matches" ON matches;

-- Create new policies
CREATE POLICY "Enable read access for users involved in the match"
  ON matches FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );

CREATE POLICY "Enable insert for authenticated users as user1"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user1_id
  );

CREATE POLICY "Enable update for users involved in the match"
  ON matches FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  )
  WITH CHECK (
    auth.uid() = user1_id OR 
    auth.uid() = user2_id
  );