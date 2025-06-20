'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Settings2, ArrowLeft, CheckCircle, Mail, Loader2 } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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
              Check Your Email
            </h1>
            <p className="text-secondary-text">
              We've sent password reset instructions to{' '}
              <span className="font-medium text-primary-text">{email}</span>
            </p>
          </div>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/login">
                <span>Back to Log In</span>
              </Link>
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={() => setSent(false)}
              className="w-full"
            >
              <span>Try a different email</span>
            </Button>
          </div>
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
          Reset Your Password
        </h1>
        <p className="text-secondary-text">
          Enter your email address and we'll send you instructions to reset your password
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
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
          />

          <Button
            type="submit"
            className="w-full"
            disabled={!email || loading}
            loading={loading} // Just pass the loading state
          >
            {/* The button will show this content when loading is false */}
            <span className="flex items-center justify-center">
              <Mail className="w-4 h-4 mr-2" />
              Send Reset Instructions
            </span>
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link 
            href="/login" 
            className="text-sm text-primary hover:underline inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Log In
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}