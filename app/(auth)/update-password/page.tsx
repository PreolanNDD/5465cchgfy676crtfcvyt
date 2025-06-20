'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Settings2, CheckCircle, Lock } from 'lucide-react';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      if (!success) {
        setLoading(false);
      }
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="text-center space-y-6 py-8">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-accent-2 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="font-heading text-2xl text-primary-text">
              Password Updated Successfully
            </h1>
            <p className="text-secondary-text">
              Your password has been updated. You will be redirected to your dashboard shortly.
            </p>
          </div>

          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="font-heading text-2xl text-primary-text">
          Update Your Password
        </h1>
        <p className="text-secondary-text">
          Enter your new password below
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Input
            label="New Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your new password"
            required
          />

          <Input
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            required
          />

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={!password || !confirmPassword}
          >
            <span className="flex items-center">
              <Lock className="w-4 h-4 mr-2" />
              Update Password
            </span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}