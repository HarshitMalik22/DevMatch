/*
  # Final Database Schema v2.0
  Includes swipe system, match expiration, and security enhancements
*/

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  github_url TEXT,
  portfolio_url TEXT,
  looking_for TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Swipes Table
CREATE TABLE IF NOT EXISTS swipes (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  swiper_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('left', 'right')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches Table (Updated)
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  swipe_id UUID REFERENCES swipes(id),
  initiator_id UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_matches UNIQUE (user1_id, user2_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles visibility" ON profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  auth.uid() != id AND
  (auth.jwt() ->> 'exp')::BIGINT > EXTRACT(EPOCH FROM NOW())
);

CREATE POLICY "Users can manage own profile" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Swipes Policies
CREATE POLICY "Users can manage swipes" ON swipes
AS PERMISSIVE FOR ALL
TO authenticated
USING (swiper_id = auth.uid())
WITH CHECK (swiper_id = auth.uid());

-- Matches Policies
CREATE POLICY "Users can access matches" ON matches
FOR ALL
TO authenticated
USING (
  auth.uid() = user1_id OR
  auth.uid() = user2_id
)
WITH CHECK (
  (auth.uid() = user1_id AND initiator_id = user1_id) OR
  (auth.uid() = user2_id AND initiator_id = user1_id)
);

-- Messages Policies
CREATE POLICY "Users can access match messages" ON messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE id = messages.match_id
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
)
WITH CHECK (sender_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_skills ON profiles USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes (swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_target ON swipes (target_id);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches (user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_expires ON matches (expires_at);
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages (match_id);

-- Match Creation Trigger
CREATE OR REPLACE FUNCTION create_match_from_swipes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'right' AND EXISTS (
    SELECT 1 FROM swipes
    WHERE swiper_id = NEW.target_id
    AND target_id = NEW.swiper_id
    AND direction = 'right'
  ) THEN
    INSERT INTO matches (user1_id, user2_id, initiator_id, swipe_id)
    VALUES (
      LEAST(NEW.swiper_id, NEW.target_id),
      GREATEST(NEW.swiper_id, NEW.target_id),
      NEW.swiper_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER swipe_to_match_trigger
AFTER INSERT ON swipes
FOR EACH ROW EXECUTE FUNCTION create_match_from_swipes();