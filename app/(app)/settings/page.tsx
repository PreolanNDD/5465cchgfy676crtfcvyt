'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Settings, User, LogOut, Mail } from 'lucide-react';

export default function SettingsPage() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [firstName, setFirstName] = useState(userProfile?.first_name || '');
  const [lastName, setLastName] = useState(userProfile?.last_name || '');
  const [message, setMessage] = useState('');

  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          first_name: firstName,
          last_name: lastName 
        })
        .eq('id', user.id);

      if (error) {
        setMessage('Error updating profile');
        return;
      }

      await refreshUserProfile();
      setMessage('Profile updated successfully');
    } catch (error) {
      setMessage('Error updating profile');
    } finally {
      setUpdating(false);
    }
  };

  const hasChanges = firstName !== userProfile?.first_name || lastName !== userProfile?.last_name;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-screen-sm mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-3xl text-primary-text">
                Settings
              </h1>
              <p className="text-secondary-text">
                Manage your account and preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-screen-sm mx-auto space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-primary" />
                <h2 className="font-heading text-xl text-primary-text">
                  Profile Information
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {message && (
                  <div className={`p-3 rounded-lg ${
                    message.includes('successfully') 
                      ? 'bg-green-50 border border-green-200 text-green-600' 
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}>
                    <p className="text-sm">{message}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                  />

                  <Input
                    label="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>

                <Button
                  type="submit"
                  loading={updating}
                  disabled={!firstName || !lastName || !hasChanges}
                  className="w-full"
                >
                  Update Profile
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-primary" />
                <h2 className="font-heading text-xl text-primary-text">
                  Account Information
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-primary-text mb-1">
                    Email Address
                  </label>
                  <p className="text-secondary-text bg-gray-50 px-3 py-2 rounded-lg">
                    {user?.email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-text mb-1">
                    Member Since
                  </label>
                  <p className="text-secondary-text bg-gray-50 px-3 py-2 rounded-lg">
                    {userProfile?.created_at 
                      ? new Date(userProfile.created_at).toLocaleDateString()
                      : 'Unknown'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logout Section */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleLogout}
                loading={loading}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <span className="flex items-center">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}