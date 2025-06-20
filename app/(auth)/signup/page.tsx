'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Settings2 } from 'lucide-react';

export default function SignUp() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setSuccess('');

  try {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
      },
    });

    if (signUpError) {
      // This will catch password strength errors, invalid emails, etc.
      setError(signUpError.message);
      return; 
    }
    
    // --- The Final, Correct Logic ---

    // Case 1: User already exists.
    // Supabase indicates this by returning a user object with an empty identities array.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('This email is already registered. Please log in instead.');
      return;
    }

    // Case 2: Successful sign-up with immediate login (email confirmation is OFF)
    if (data.user && data.session) {
      router.push('/dashboard');
      return;
    }
    
    // Case 3: Successful sign-up, but email confirmation is required
    // This is the default case if a user object exists.
    if (data.user) {
      setSuccess('Account created! Please check your email to confirm your account.');
    }

  } catch (err: any) {
    // This will catch any other unexpected errors, like network issues.
    console.error('A critical error occurred during signup:', err);
    setError('An unexpected error occurred. Please try again.');
  } finally {
    setLoading(false);
  }
};

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Card>
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <Settings2 className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="font-heading text-2xl text-primary-text">
          Create your PIDMe Account
        </h1>
        <p className="text-secondary-text">
          Start optimizing your life with precision
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="First name"
              required
            />

            <Input
              label="Last Name"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Last name"
              required
            />
          </div>

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email address"
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Choose a secure password (min 6 characters)"
            required
            minLength={6}
          />

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.password}
          >
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-secondary-text">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="text-primary hover:underline font-medium"
            >
              Log in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}