'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // The core logic: if the initial auth check is done and there is still no user,
    // redirect them to the login page.
    if (!loading && !user) {
      router.push('/login');
    }
    // This effect runs whenever the loading or user state changes.
    // Because our AuthProvider is now stable, this will behave predictably.
  }, [user, loading, router]);

  // If the initial session is still loading, show a full-screen spinner.
  // OR if the user is not present (and we are about to redirect),
  // also show the spinner. This prevents any flash of content.
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-secondary-text">Loading...</p>
        </div>
      </div>
    );
  }

  // If loading is finished and a user exists, render the actual content.
  return <>{children}</>;
}