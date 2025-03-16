import { useEffect, useState } from 'react';
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

  const [{ x, rotate }] = useSpring(() => ({
    x: 0,
    rotate: 0,
    config: { tension: 200, friction: 20 }
  }));

  useEffect(() => {
    loadNextProfile();
    const subscription = subscribeToNewConnections();
    return () => {
      subscription.unsubscribe();
    };
  }, [requiredSkills]);

  const subscribeToNewConnections = () => {
    return supabase
      .channel('matches')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
      }, async (payload) => {
        const match = payload.new;
        const { data: { user } } = await supabase.auth.getUser();
        
        // Only notify if the current user is the receiver of the match
        if (user?.id && match.user2_id === user.id) {
          const otherUserId = match.user1_id;
          const { data: connectedUser } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherUserId)
            .single();

          if (connectedUser) {
            toast.success(`${connectedUser.full_name} connected with you!`, {
              duration: 5000
            });

            navigate(`/chat/${match.id}`);
          }
        }
      })
      .subscribe();
  };

  const loadNextProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get IDs of profiles the user has already swiped on
      const { data: swipes } = await supabase
        .from('swipes')
        .select('target_id')
        .eq('swiper_id', user.id);

      // Get IDs of users who have already created matches with the current user
      const { data: matches } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const excludedIds = new Set<string>([user.id]);
      
      matches?.forEach(match => {
        // If user is user1, exclude user2 and vice versa
        if (match.user1_id === user.id) {
          excludedIds.add(match.user2_id);
        } else {
          excludedIds.add(match.user1_id);
        }
      });

      swipes?.forEach(swipe => excludedIds.add(swipe.target_id));

      const query = supabase
        .from('profiles')
        .select('*');
      
      // Only add the "not in" clause if we have IDs to exclude
      if (excludedIds.size > 0) {
        const excludedIdsArray = Array.from(excludedIds);
        query.not('id', 'in', `(${excludedIdsArray.join(',')})`);
      }

      query.order('created_at', { ascending: false });

      if (requiredSkills.length > 0) {
        query.contains('skills', requiredSkills);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error) throw error;
      setCurrentProfile(data);
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
  
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      // Record swipe
      await supabase.from('swipes').insert({
        swiper_id: user.id,
        target_id: currentProfile.id,
        direction
      });
  
      // For right swipes, create a match immediately and navigate to chat
      if (direction === 'right') {
        // Create a match with 'initiated' status
        const { data: newMatch, error: matchError } = await supabase
          .from('matches')
          .insert({
            user1_id: user.id,
            user2_id: currentProfile.id,
            status: 'initiated'
          })
          .select()
          .single();
  
        if (matchError) throw matchError;
  
        // Navigate to chat with the new match
        if (newMatch) {
          toast.success(`You connected with ${currentProfile.full_name}!`);
          navigate(`/chat/${newMatch.id}`);
          return;
        }
      }
  
      // Only load next profile if we didn't navigate away
      loadNextProfile();
    } catch (error) {
      console.error('Error handling swipe:', error);
      toast.error('Failed to process swipe');
      loadNextProfile();
    } finally {
      setSwiping(false);
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
              : "Check back later for more potential hackathon partners!"}
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