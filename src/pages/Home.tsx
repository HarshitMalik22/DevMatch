import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpring, animated } from '@react-spring/web';
import { Code2, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { User } from '../types';
import SkillRequirements from '../components/SkillRequirements';

export default function Home() {
  const [currentProfile, setCurrentProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const navigate = useNavigate();

  const [{ x, rotate }, api] = useSpring(() => ({
    x: 0,
    rotate: 0,
    config: { tension: 200, friction: 20 }
  }));

  useEffect(() => {
    loadNextProfile();
    subscribeToMatches();
  }, [requiredSkills]);

  const subscribeToMatches = () => {
    const subscription = supabase
      .channel('matches')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
      }, async (payload) => {
        const match = payload.new as any;
        const { data: session } = await supabase.auth.getSession();
        
        if (session?.session?.user && match.user2_id === session.session.user.id) {
          const { data: matchedUser } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', match.user1_id)
            .single();

          if (matchedUser) {
            toast.success(`New match with ${matchedUser.full_name}!`, {
              duration: 5000,
              onClick: () => navigate(`/chat/${match.id}`)
            });
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const loadNextProfile = async () => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        navigate('/auth');
        return;
      }

      // Get all matches and swipes for the current user
      const [{ data: matches }, { data: swipes }] = await Promise.all([
        supabase
          .from('matches')
          .select('user1_id, user2_id')
          .or(`user1_id.eq.${session.session.user.id},user2_id.eq.${session.session.user.id}`),
        supabase
          .from('swipes')
          .select('target_id')
          .eq('swiper_id', session.session.user.id)
      ]);

      // Combine matched and swiped user IDs
      const excludedUserIds = new Set<string>();
      
      // Add matched users
      (matches || []).forEach(match => {
        if (match.user1_id === session.session.user.id) {
          excludedUserIds.add(match.user2_id);
        } else {
          excludedUserIds.add(match.user1_id);
        }
      });

      // Add swiped users
      (swipes || []).forEach(swipe => {
        excludedUserIds.add(swipe.target_id);
      });

      // Add current user
      excludedUserIds.add(session.session.user.id);

      // Convert Set to Array
      const excludedIds = Array.from(excludedUserIds);

      // Build the query
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Add the not-in filter only if there are excluded users
      if (excludedIds.length > 0) {
        query = query.not('id', 'in', `(${excludedIds.join(',')})`);
      }

      // Add skills filter if required skills are set
      if (requiredSkills.length > 0) {
        // Use containment operator @> to check if skills array contains all required skills
        query = query.contains('skills', requiredSkills);
      }

      // Get a single profile
      const { data: profile, error } = await query.limit(1).single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No more profiles to show
          setCurrentProfile(null);
        } else {
          throw error;
        }
      } else {
        setCurrentProfile(profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load next profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!currentProfile || swiping) return;

    setSwiping(true);
    api.start({
      x: direction === 'left' ? -400 : 400,
      rotate: direction === 'left' ? -20 : 20,
      onRest: () => {
        setSwiping(false);
        loadNextProfile();
        api.start({ x: 0, rotate: 0, immediate: true });
      },
    });

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      // Record the swipe
      await supabase
        .from('swipes')
        .insert({
          swiper_id: session.session.user.id,
          target_id: currentProfile.id,
          direction
        });

      if (direction === 'right') {
        // Check if there's already a match from the other user
        const { data: matches } = await supabase
          .from('matches')
          .select('id, status')
          .eq('user1_id', currentProfile.id)
          .eq('user2_id', session.session.user.id)
          .eq('status', 'pending');

        const existingMatch = matches?.[0];

        if (existingMatch) {
          // Update both matches to 'accepted'
          await Promise.all([
            supabase
              .from('matches')
              .update({ status: 'accepted' })
              .eq('id', existingMatch.id),
            supabase
              .from('matches')
              .insert({
                user1_id: session.session.user.id,
                user2_id: currentProfile.id,
                status: 'accepted'
              })
          ]);

          toast.success(`It's a match with ${currentProfile.full_name}!`, {
            duration: 5000,
            onClick: () => navigate(`/chat/${existingMatch.id}`)
          });
        } else {
          // Create a new pending match
          await supabase
            .from('matches')
            .insert({
              user1_id: session.session.user.id,
              user2_id: currentProfile.id,
              status: 'pending'
            });
        }
      }
    } catch (error) {
      console.error('Error handling swipe:', error);
      toast.error('Failed to process swipe');
    }
  };

  const handleRequirementsChange = (skills: string[]) => {
    setRequiredSkills(skills);
  };

  const handleClearRequirements = () => {
    setRequiredSkills([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <SkillRequirements
        onRequirementsChange={handleRequirementsChange}
        onClearRequirements={handleClearRequirements}
      />

      {!currentProfile ? (
        <div className="flex flex-col items-center justify-center space-y-4">
          <Code2 className="w-16 h-16 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">No more profiles</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {requiredSkills.length > 0
              ? "No profiles match your skill requirements. Try adjusting your criteria!"
              : "Check back later for more potential matches!"}
          </p>
        </div>
      ) : (
        <>
          <animated.div
            style={{ x, rotate }}
            className="card w-full max-w-md relative cursor-grab active:cursor-grabbing touch-none"
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
                      className={`px-3 py-1 rounded-full text-sm ${
                        requiredSkills.includes(skill)
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'
                          : 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100'
                      }`}
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
              disabled={swiping}
              className="p-4 bg-red-100 dark:bg-red-900 rounded-full text-red-600 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-800 transition-colors disabled:opacity-50"
            >
              <X className="w-8 h-8" />
            </button>
            <button
              onClick={() => handleSwipe('right')}
              disabled={swiping}
              className="p-4 bg-green-100 dark:bg-green-900 rounded-full text-green-600 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              <Check className="w-8 h-8" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}