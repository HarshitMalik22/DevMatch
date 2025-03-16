import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User, Match } from '../types';

interface MatchWithProfile extends Match {
  matched_user: User;
}

export default function Matches() {
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user) {
          navigate('/auth');
          return;
        }

        const userId = session.session.user.id;

        // Get matches where the user has initiated (swiped right)
        // Status is now 'initiated' rather than 'accepted' since we don't need mutual matching
        const { data: initiatedMatches, error: error1 } = await supabase
          .from('matches')
          .select(`
            *,
            matched_user:profiles!matches_user2_id_fkey(*)
          `)
          .eq('user1_id', userId)
          .eq('status', 'initiated');

        // Get matches where someone else initiated with the current user
        const { data: receivedMatches, error: error2 } = await supabase
          .from('matches')
          .select(`
            *,
            matched_user:profiles!matches_user1_id_fkey(*)
          `)
          .eq('user2_id', userId)
          .eq('status', 'initiated');

        if (error1 || error2) throw error1 || error2;

        // Combine and transform matches
        const allMatches = [
          ...(initiatedMatches || []).map((match) => ({
            ...match,
            matched_user: match.matched_user,
            match_type: 'initiated' // Add a flag to show matches the user initiated
          })),
          ...(receivedMatches || []).map((match) => ({
            ...match,
            matched_user: match.matched_user,
            match_type: 'received' // Add a flag to show matches the user received
          })),
        ];

        setMatches(allMatches);
      } catch (error) {
        console.error('Error loading matches:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMatches();

    const subscription = supabase
      .channel('matches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          loadMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [navigate]);

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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          No connections yet
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Swipe right on profiles to connect and start chatting with potential hackathon partners!
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Your Connections
      </h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => (
          <div key={match.id} className="card">
            <div className="relative">
              <img
                src={
                  match.matched_user?.avatar_url ||
                  `https://source.unsplash.com/300x300/?developer&${match.matched_user?.id}`
                }
                alt={match.matched_user?.full_name || 'User Avatar'}
                className="w-full h-48 object-cover rounded-t-xl"
              />
              {match.match_type === 'received' && (
                <div className="absolute top-2 right-2 bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                  New Connection
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {match.matched_user?.full_name || 'Anonymous'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                {match.matched_user?.bio || 'No bio available.'}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {match.matched_user?.skills?.slice(0, 3).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100 rounded-full text-xs"
                  >
                    {skill}
                  </span>
                )) || 'No skills listed.'}
              </div>
              <Link
                to={`/chat/${match.id}`}
                className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                Chat Now
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}