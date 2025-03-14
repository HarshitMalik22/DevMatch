export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  skills: string[];
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  github_url?: string;
  portfolio_url?: string;
  bio: string;
  looking_for: string[];
  created_at: string;
}

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}