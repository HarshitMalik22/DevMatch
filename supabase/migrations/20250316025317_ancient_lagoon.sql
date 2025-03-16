/*
  # Add swipes table and triggers

  1. New Tables
    - `swipes`
      - Records all swipe actions (left/right) by users
      - Helps prevent showing already swiped profiles
      - Used for match creation

  2. Security
    - Enable RLS on swipes table
    - Add policies for authenticated users
*/

-- Create swipes table
CREATE TABLE IF NOT EXISTS swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  target_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  direction text CHECK (direction IN ('left', 'right')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own swipes"
  ON swipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = swiper_id);

CREATE POLICY "Users can read their own swipes"
  ON swipes FOR SELECT
  TO authenticated
  USING (auth.uid() = swiper_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes (swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_target ON swipes (target_id);
CREATE INDEX IF NOT EXISTS idx_swipes_direction ON swipes (direction);