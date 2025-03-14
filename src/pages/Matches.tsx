import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User, Match } from '../types';

interface MatchWithProfile extends Match {
  matched_user: User;
}

export default function Matches() {
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const { data: matchesData, error } = await supabase
        .from('matches')
        .select(`
          *,
          matched_user:profiles!matches_user2_id_fkey(*)
        `)
        .or(`user1_id.eq.${session.session.user.id},user2_id.eq.${session.session.user.id}`)
        .eq('status', 'accepted');

      if (error) throw error;
      setMatches(matchesData as MatchWithProfile[]);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">No matches yet</h2>
        <p className="text-gray-600 dark:text-gray-400">Keep swiping to find your perfect hackathon partner!</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your Matches</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => (
          <div key={match.id} className="card">
            <img
              src={match.matched_user.avatar_url || `https://source.unsplash.com/300x300/?developer&${match.matched_user.id}`}
              alt={match.matched_user.full_name}
              className="w-full h-48 object-cover rounded-t-xl"
            />
            <div className="p-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {match.matched_user.full_name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                {match.matched_user.bio}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {match.matched_user.skills.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100 rounded-full text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <Link
                to={`/chat/${match.id}`}
                className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Chat
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}