'use client';

// Make sure useCallback is imported from 'react'
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getTrackableItems } from '@/lib/trackable-items';
import { TrackableItem } from '@/lib/types';
import { MetricsManagement } from '@/components/log/MetricsManagement';
import { DailyLogger } from '@/components/log/DailyLogger';
import { BookOpen } from 'lucide-react';

export default function LogPage() {
  const { user } = useAuth();
  const [trackableItems, setTrackableItems] = useState<TrackableItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // --- THE DEFINITIVE FIX IS HERE ---
  // We wrap the data fetching function in useCallback and depend ONLY
  // on the user's ID, which is a stable string.
  const loadTrackableItems = useCallback(async () => {
    if (!user?.id) {
      // If there's no user ID, we can't fetch anything.
      setTrackableItems([]);
      setLoadingItems(false);
      return;
    };
    
    setLoadingItems(true);
    
    try {
      const items = await getTrackableItems(user.id);
      setTrackableItems(items);
    } catch (error) {
      console.error('Failed to load trackable items:', error);
      setTrackableItems([]); // Set to empty array on error
    } finally {
      setLoadingItems(false);
    }
  }, [user?.id]); // The dependency array is now stable.

  // This useEffect now calls the stable function. It will only run ONCE
  // when the component mounts and the user exists, because loadTrackableItems
  // is now stable. This breaks the loop at its source.
  useEffect(() => {
    loadTrackableItems();
  }, [loadTrackableItems]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header (No changes needed) */}
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-3xl text-primary-text">Daily Log</h1>
              <p className="text-secondary-text">Manage your metrics and track your daily data</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content (The props passed down are now stable) */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <MetricsManagement
                  // We now pass the stable function as the onRefresh prop
                  onRefresh={loadTrackableItems}
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <DailyLogger
                // This component also needs the list of items
                // This will be stable because loadTrackableItems only runs once
                trackableItems={trackableItems}
                loading={loadingItems}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}