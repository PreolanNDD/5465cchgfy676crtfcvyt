'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { getTrackableItems } from '@/lib/trackable-items';
import { getDashboardStats, getTodaysEntries } from '@/lib/dashboard-stats';
import { TodaysLogWidget } from '@/components/dashboard/TodaysLogWidget';
import { StreaksStatsWidget } from '@/components/dashboard/StreaksStatsWidget';
import { AnalyzeDataWidget } from '@/components/dashboard/AnalyzeDataWidget';
import { Settings2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function Dashboard() {
  const { userProfile } = useAuth();
  const { user } = useAuth();

  const firstName = userProfile?.first_name || 'there';

  // Fetch trackable items
  const { data: trackableItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['trackableItems', user?.id],
    queryFn: () => getTrackableItems(user!.id),
    enabled: !!user?.id,
  });

  // Fetch today's entries
  const { data: todaysEntries = {}, isLoading: loadingEntries } = useQuery({
    queryKey: ['todaysEntries', user?.id],
    queryFn: () => getTodaysEntries(user!.id),
    enabled: !!user?.id,
  });

  // Fetch dashboard stats
  const { data: dashboardStats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboardStats', user?.id],
    queryFn: () => getDashboardStats(user!.id),
    enabled: !!user?.id,
  });

  const isLoading = loadingItems || loadingEntries || loadingStats;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-3xl text-primary-text">
                Hello, {firstName}!
              </h1>
              <p className="text-secondary-text">
                Ready to optimize your day?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Today's Log Widget */}
            <div className="lg:col-span-2">
              <TodaysLogWidget
                trackableItems={trackableItems}
                todaysEntries={todaysEntries}
                loading={isLoading}
              />
            </div>

            {/* Right Column - Supporting Widgets */}
            <div className="lg:col-span-1 space-y-6">
              {/* Streaks & Stats Widget */}
              <StreaksStatsWidget
                currentStreak={dashboardStats?.currentStreak || 0}
                totalMetrics={dashboardStats?.totalMetrics || 0}
                totalEntries={dashboardStats?.totalEntries || 0}
                loading={loadingStats}
              />

              {/* Analyze Data Widget */}
              <AnalyzeDataWidget />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}