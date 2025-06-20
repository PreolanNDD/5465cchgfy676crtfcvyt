'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Flame, Target, BarChart3, Settings, ArrowRight } from 'lucide-react';

interface StreaksStatsWidgetProps {
  currentStreak: number;
  totalMetrics: number;
  totalEntries: number;
  loading: boolean;
}

export function StreaksStatsWidget({ 
  currentStreak, 
  totalMetrics, 
  totalEntries, 
  loading 
}: StreaksStatsWidgetProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-heading text-lg text-primary-text">Streaks & Stats</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="h-8 bg-gray-100 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-heading text-lg text-primary-text">Streaks & Stats</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Current Streak */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">{currentStreak}</p>
            <p className="text-xs text-secondary-text">Day Streak</p>
          </div>

          {/* Total Metrics */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-accent-1">{totalMetrics}</p>
            <p className="text-xs text-secondary-text">Active Metrics</p>
          </div>

          {/* Total Entries */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-accent-2">{totalEntries}</p>
            <p className="text-xs text-secondary-text">Total Logs</p>
          </div>
        </div>

        {/* Manage Logs Button - Now matches "View Your Trends" style */}
        <Button 
          onClick={() => window.location.href = '/log'}
          className="w-full"
        >
          <span>Manage Logs</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}