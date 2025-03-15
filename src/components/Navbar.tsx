import React from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Users, MessageSquare, User, LogOut } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import useAuthListener from '../hooks/useAuthListener';

export default function Navbar() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { user, setUser } = useAuthStore();

  useAuthListener();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      setUser(null);
    }
  };

  return (
    <nav className={`${
      isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
    } shadow-lg`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold">DevMatch</Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/matches" className="hover:text-purple-500">
                  <Users className="w-6 h-6" />
                </Link>
                <Link to="/chat" className="hover:text-purple-500">
                  <MessageSquare className="w-6 h-6" />
                </Link>
                <Link to="/profile" className="hover:text-purple-500">
                  <User className="w-6 h-6" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <LogOut className="w-6 h-6" />
                </button>
              </>
            ) : (
              <Link to="/auth" className="hover:text-purple-500">
                Login
              </Link>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {isDarkMode ? (
                <Sun className="w-6 h-6" />
              ) : (
                <Moon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
