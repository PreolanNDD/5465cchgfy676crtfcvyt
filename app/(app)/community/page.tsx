'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { CommunityFeed } from '@/components/community/CommunityFeed';
import { Users, MessageSquare, User } from 'lucide-react';

export default function CommunityPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'community' | 'my-findings'>('community');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-3xl text-primary-text">Community Findings</h1>
              <p className="text-secondary-text">
                Discover insights and patterns shared by the PIDMe community
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {/* Introduction */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <MessageSquare className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h2 className="font-medium text-blue-900 mb-2">
                    Welcome to Community Findings
                  </h2>
                  <p className="text-blue-800 text-sm leading-relaxed">
                    This is where our community shares valuable insights, patterns, and discoveries 
                    from their personal optimization journeys. Vote on findings that resonate with you 
                    and help surface the most valuable insights for everyone.
                  </p>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('community')}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === 'community'
                    ? 'bg-white text-primary-text shadow-sm'
                    : 'text-secondary-text hover:text-primary-text'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Community Feed</span>
              </button>
              {user && (
                <button
                  onClick={() => setActiveTab('my-findings')}
                  className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center space-x-2 ${
                    activeTab === 'my-findings'
                      ? 'bg-white text-primary-text shadow-sm'
                      : 'text-secondary-text hover:text-primary-text'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>My Findings</span>
                </button>
              )}
            </div>

            {/* Community Feed */}
            <CommunityFeed activeTab={activeTab} />
          </div>
        </div>
      </div>
    </div>
  );
}