import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpring, animated } from '@react-spring/web';
import { Code2, X, Check, Loader2, Github, Link, Heart } from 'lucide-react';
import Confetti from 'react-confetti';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

export default function Home() {
  const [currentProfile, setCurrentProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const navigate = useNavigate();

  const [{ x, rotate }, api] = useSpring(() => ({
    x: 0,
    rotate: 0,
    config: { tension: 300, friction: 30 }
  }));

  // Reset card position when new profile loads
  useEffect(() => {
    if (currentProfile) {
      api.start({
        x: 0,
        rotate: 0,
        immediate: true
      });
    }
  }, [currentProfile]);

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

      const { data: swipes, error: swipesError } = await supabase
        .from('swipes')
        .select('target_id')
        .eq('swiper_id', session.session.user.id);

      if (swipesError) throw swipesError;

      const excludedIds = [
        session.session.user.id,
        ...(swipes?.map(s => s.target_id) || [])
      ];

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id, full_name, avatar_url, bio, skills, 
          github_url, portfolio_url, experience_level
        `)
        .not('id', 'in', `(${excludedIds.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profileError) throw profileError;
      
      setCurrentProfile(profile || null);
    } catch (error) {
      console.error('Error loading profile:', error);
      setCurrentProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!currentProfile) return;

    await api.start({
      x: direction === 'left' ? -400 : 400,
      rotate: direction === 'left' ? -20 : 20,
    });

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      // Record swipe
      const { error } = await supabase.from('swipes').insert({
        swiper_id: session.session.user.id,
        target_id: currentProfile.id,
        direction: direction,
      });

      if (error) throw error;

      // Check for mutual right swipe
      if (direction === 'right') {
        const { data: mutualSwipe } = await supabase
          .from('swipes')
          .select('*')
          .eq('swiper_id', currentProfile.id)
          .eq('target_id', session.session.user.id)
          .eq('direction', 'right')
          .single();

        if (mutualSwipe) {
          // Create match
          const { data: match } = await supabase
            .from('matches')
            .insert({
              user1_id: session.session.user.id,
              user2_id: currentProfile.id,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            })
            .select()
            .single();

          if (match) {
            setMatchedUser(currentProfile);
            setShowMatch(true);
            
            // Redirect after animation
            setTimeout(() => {
              setShowMatch(false);
              navigate(`/chat/${match.id}`);
            }, 3000);
          }
        }
      }

      loadNextProfile();
    } catch (error) {
      console.error('Error handling swipe:', error);
      api.start({ x: 0, rotate: 0 });
    }
  };

  const MatchAnimation = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Confetti recycle={false} numberOfPieces={400} />
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl text-center animate-pulse">
        <Heart className="w-16 h-16 text-red-500 mx-auto mb-4" fill="red" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          It's a match!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          You matched with {matchedUser?.full_name}!
        </p>
      </div>
    </div>
  );

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
      {showMatch && <MatchAnimation />}

      <animated.div
        style={{ x, rotate }}
        className="card w-full max-w-md relative bg-white dark:bg-gray-800 shadow-lg rounded-xl"
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

          <div className="mt-4 space-y-2">
            {currentProfile.github_url && (
              <a
                href={currentProfile.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Github className="w-5 h-5" />
                GitHub Profile
              </a>
            )}
            
            {currentProfile.portfolio_url && (
              <a
                href={currentProfile.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Link className="w-5 h-5" />
                Portfolio Website
              </a>
            )}
          </div>

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