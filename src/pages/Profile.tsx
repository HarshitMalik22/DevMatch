import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { User } from '../types';

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'];
const SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js',
  'Python', 'Java', 'C++', 'Go', 'Rust', 'AWS', 'Docker', 'Kubernetes',
  'Machine Learning', 'Data Science', 'UI/UX Design', 'Mobile Development'
];

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Partial<User>>({
    full_name: '',
    bio: '',
    skills: [],
    experience_level: 'beginner',
    github_url: '',
    portfolio_url: '',
    looking_for: [],
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.session.user.id)
        .single();

      if (profile) {
        setProfile(profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        navigate('/auth');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.session.user.id,
          ...profile,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Profile saved successfully');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${session.session.user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success('Profile picture updated');
    } catch (error: any) {
      toast.error('Error uploading image');
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
    <div className="container max-w-2xl mx-auto p-4">
      <div className="card">
        <div className="relative w-32 h-32 mx-auto mb-6">
          <img
            src={profile.avatar_url || `https://source.unsplash.com/300x300/?developer&${Date.now()}`}
            alt="Profile"
            className="w-full h-full rounded-full object-cover"
          />
          <label className="absolute bottom-0 right-0 p-2 bg-primary-600 rounded-full cursor-pointer hover:bg-primary-700 transition-colors">
            <Camera className="w-5 h-5 text-white" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="input min-h-[100px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Experience Level
            </label>
            <select
              value={profile.experience_level}
              onChange={(e) => setProfile({ ...profile, experience_level: e.target.value as User['experience_level'] })}
              className="input"
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((skill) => (
                <button
                  key={skill}
                  onClick={() => {
                    const skills = profile.skills || [];
                    const newSkills = skills.includes(skill)
                      ? skills.filter((s) => s !== skill)
                      : [...skills, skill];
                    setProfile({ ...profile, skills: newSkills });
                  }}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    profile.skills?.includes(skill)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              GitHub URL
            </label>
            <input
              type="url"
              value={profile.github_url}
              onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Portfolio URL
            </label>
            <input
              type="url"
              value={profile.portfolio_url}
              onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
              className="input"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}