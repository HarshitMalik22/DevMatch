import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Message, User } from '../types';
import { isValidUUID } from '../lib/utils';

interface ChatMessage extends Message {
  sender: User;
}

export default function Chat() {
  const { matchId } = useParams<{ matchId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [connectedUser, setConnectedUser] = useState<User | null>(null);
  const [validatingConnection, setValidatingConnection] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const validateConnection = async () => {
      if (!matchId || !isValidUUID(matchId)) {
        toast.error('Invalid chat ID');
        navigate('/matches');
        return;
      }
      setValidatingConnection(false);
    };

    validateConnection();
  }, [matchId, navigate]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get full profile info
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        setCurrentUser(profile || user);
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!matchId || validatingConnection) return;

    const loadData = async () => {
      try {
        await loadConnectionDetails();
        await loadMessages();
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    loadData();

    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const newMessage = payload.new as Message;
        loadMessage(newMessage.id);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [matchId, validatingConnection]);

  const loadConnectionDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: match, error } = await supabase
        .from('matches')
        .select(`
          *,
          user1:profiles!matches_user1_id_fkey(*),
          user2:profiles!matches_user2_id_fkey(*)
        `)
        .eq('id', matchId)
        .single();

      if (error || !match) {
        throw error || new Error('Connection not found');
      }

      // Verify user is part of the connection
      if (![match.user1_id, match.user2_id].includes(user.id)) {
        toast.error('Unauthorized access');
        navigate('/matches');
        return;
      }

      const otherUser = match.user1_id === user.id ? match.user2 : match.user1;
      setConnectedUser(otherUser);
    } catch (error) {
      console.error('Error loading connection details:', error);
      toast.error('Failed to load connection details');
      navigate('/matches');
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data as ChatMessage[]);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const loadMessage = async (messageId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('id', messageId)
        .single();

      if (error) throw error;
      setMessages(prev => [...prev, data as ChatMessage]);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !matchId || !currentUser) return;

    try {
      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: currentUser.id,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  if (validatingConnection || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {connectedUser && (
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
          <div className="max-w-3xl mx-auto flex items-center space-x-4">
            <img
              src={connectedUser.avatar_url || `https://source.unsplash.com/100x100/?developer&${connectedUser.id}`}
              alt={connectedUser.full_name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {connectedUser.full_name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {connectedUser.experience_level}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>You're now connected with {connectedUser?.full_name}!</p>
              <p className="mt-2">Send a message to start the conversation.</p>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender.id === currentUser?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-sm rounded-lg p-4 ${
                  message.sender.id === currentUser?.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <p className="text-sm font-semibold mb-1">{message.sender.full_name}</p>
                <p>{message.content}</p>
                <p className="text-xs opacity-75 mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form onSubmit={handleSend} className="p-4 border-t dark:border-gray-700">
        <div className="max-w-3xl mx-auto flex gap-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}