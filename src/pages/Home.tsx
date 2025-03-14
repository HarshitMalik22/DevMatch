import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpring, animated } from '@react-spring/web';
import { Code2, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

export default function Home() {
  const [currentProfile, setCurrentProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [{ x, rotate }, api] = useSpring(() => ({
    x: 0,
    rotate: 0,
  }));

  useEffect(() => {
    loadNextProfile();
  }, []);

  const loadNextProfile = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        navigate('/auth');
        return;
      }

      // Get all matches for the current user
      const { data: matches } = await supabase
        .from('matches')
        .select('user2_id')
        .eq('user1_id', session.session.user.id);

      const matchedUserIds = matches?.map(m => m.user2_id) || [];

      // Get next profile excluding matched users and current user
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', session.session.user.id)
        .not('id', 'in', `(${matchedUserIds.map(id => `'${id}'`).join(',') || 'null'})`)
        .limit(1)
        .single();

      setCurrentProfile(profiles);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!currentProfile) return;

    api.start({
      x: direction === 'left' ? -400 : 400,
      rotate: direction === 'left' ? -20 : 20,
      onRest: loadNextProfile,
    });

    if (direction === 'right') {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      await supabase.from('matches').insert({
        user1_id: session.session.user.id,
        user2_id: currentProfile.id,
        status: 'pending',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] space-y-4">
        <Code2 className="w-16 h-16 text-primary-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">No more profiles</h2>
        <p className="text-gray-600 dark:text-gray-400">Check back later for more potential matches!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <animated.div
        style={{ x, rotate }}
        className="card w-full max-w-md relative"
      >
        <img
          src={currentProfile.avatar_url || `https://source.unsplash.com/800x600/?developer,programming&${currentProfile.id}`}
          alt={currentProfile.full_name}
          className="w-full h-64 object-cover rounded-t-xl"
        />
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentProfile.full_name}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {currentProfile.bio}
          </p>
          <div className="mt-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Skills</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {currentProfile.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </animated.div>

      <div className="flex justify-center space-x-4 mt-8">
        <button
          onClick={() => handleSwipe('left')}
          className="p-4 bg-red-100 dark:bg-red-900 rounded-full text-red-600 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
        >
          <X className="w-8 h-8" />
        </button>
        <button
          onClick={() => handleSwipe('right')}
          className="p-4 bg-green-100 dark:bg-green-900 rounded-full text-green-600 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
        >
          <Check className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}