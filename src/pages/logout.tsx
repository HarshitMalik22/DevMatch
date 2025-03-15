import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const signOutUser = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        navigate('/auth');
      }
    };

    signOutUser();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <p className="text-gray-600 dark:text-gray-400">Signing you out...</p>
    </div>
  );
};

export default Logout;
