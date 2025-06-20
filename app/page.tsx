'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Settings2, TrendingUp, Target } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Logo and Branding */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                <Settings2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="font-heading text-4xl text-primary-text">
              PIDMe
            </h1>
            <p className="text-lg text-secondary-text">
              Tune your life with precision engineering
            </p>
          </div>

          {/* Value Proposition */}
          <Card className="text-left">
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Target className="w-5 h-5 text-accent-1 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-primary-text">Proportional Control</h3>
                  <p className="text-sm text-secondary-text">Set targets and track your inputs</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 text-accent-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-primary-text">Integral Analysis</h3>
                  <p className="text-sm text-secondary-text">Learn from accumulated trends</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Settings2 className="w-5 h-5 text-soft-accent mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-primary-text">Derivative Response</h3>
                  <p className="text-sm text-secondary-text">React quickly to changes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Link href="/signup" className="block w-full">
              <Button className="w-full">
                Sign up
              </Button>
            </Link>
            <Link href="/login" className="block w-full">
              <Button variant="outline" className="w-full">
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-gray-200">
        <p className="text-center text-sm text-secondary-text">
          © 2024 PIDMe. Engineering your personal optimization.
        </p>
      </footer>
    </div>
  );
}