import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Message, User } from '../types';

interface ChatMessage extends Message {
  sender: User;
}

export default function Chat() {
  const { matchId } = useParams<{ matchId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadMatchDetails();
    loadMessages();
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
  }, [matchId]);

  const loadMatchDetails = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        navigate('/auth');
        return;
      }

      const { data: match } = await supabase
        .from('matches')
        .select(`
          *,
          user1:profiles!matches_user1_id_fkey(*),
          user2:profiles!matches_user2_id_fkey(*)
        `)
        .eq('id', matchId)
        .single();

      if (!match) {
        toast.error('Match not found');
        navigate('/matches');
        return;
      }

      // Set the matched user based on which user is viewing
      const otherUser = match.user1.id === session.session.user.id ? match.user2 : match.user1;
      setMatchedUser(otherUser);
    } catch (error) {
      console.error('Error loading match details:', error);
      toast.error('Failed to load match details');
      navigate('/matches');
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(*)
        `)
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
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(*)
      `)
      .eq('id', messageId)
      .single();

    if (error) {
      console.error('Error loading message:', error);
      return;
    }
    setMessages((prev) => [...prev, data as ChatMessage]);
    scrollToBottom();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !matchId) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        navigate('/auth');
        return;
      }

      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: session.session.user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {matchedUser && (
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
          <div className="max-w-3xl mx-auto flex items-center space-x-4">
            <img
              src={matchedUser.avatar_url || `https://source.unsplash.com/100x100/?developer&${matchedUser.id}`}
              alt={matchedUser.full_name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {matchedUser.full_name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {matchedUser.experience_level}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender.id === (supabase.auth.getSession() as any).data?.session?.user?.id
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <div
                className={`max-w-sm rounded-lg p-4 ${
                  message.sender.id === (supabase.auth.getSession() as any).data?.session?.user?.id
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
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="btn btn-primary px-6"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}