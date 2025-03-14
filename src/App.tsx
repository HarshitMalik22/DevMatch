import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from './store/themeStore';
import Navbar from './components/Navbar';
import Home from './pages/Home.tsx';
import Auth from './pages/Auth.tsx';
import Profile from './pages/Profile.tsx';
import Matches from './pages/Matches.tsx';
import Chat from './pages/Chat.tsx';

function App() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <Router>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/chat/:matchId" element={<Chat />} />
          </Routes>
        </main>
      </Router>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;