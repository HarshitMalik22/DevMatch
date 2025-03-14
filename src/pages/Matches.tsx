import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User, Match } from '../types';

interface MatchWithUsers extends Match {
  user1_profile: User;
  user2_profile: User;
}

export default function Matches() {
  const [matches, setMatches] = useState<MatchWithUsers[]>([]);
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
          user1_profile:profiles!user1_id(*),
          user2_profile:profiles!user2_id(*)
        `)
        .or(`user1_id.eq.${session.session.user.id},user2_id.eq.${session.session.user.id})`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedMatches = matchesData.map(match => ({
        ...match,
        // Determine which user is the match partner
        matched_user: match.user1_id === session.session?.user.id 
          ? match.user2_profile 
          : match.user1_profile
      }));

      setMatches(processedMatches as MatchWithUsers[]);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add match expiration status
  const isMatchActive = (match: Match) => {
    return new Date(match.expires_at) > new Date();
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
          <div key={match.id} className="card relative">
            {!isMatchActive(match) && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-xl">
                <span className="text-white font-bold">Expired</span>
              </div>
            )}
            <img
              src={match.matched_user.avatar_url || `https://source.unsplash.com/300x300/?developer&${match.matched_user.id}`}
              alt={match.matched_user.full_name}
              className="w-full h-48 object-cover rounded-t-xl"
            />
            <div className="p-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {match.matched_user.full_name}
                {match.initiator_id === match.matched_user.id && (
                  <span className="ml-2 text-sm text-primary-600">★</span>
                )}
              </h3>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                <span>Match expires: </span>
                <span className="ml-1">
                  {new Date(match.expires_at).toLocaleDateString()}
                </span>
              </div>
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
                {isMatchActive(match) ? 'Chat' : 'View History'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}