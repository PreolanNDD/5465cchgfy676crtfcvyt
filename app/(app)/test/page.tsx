'use client';

import { MetricsManagement } from '@/components/log/MetricsManagement';
import { TestTube } from 'lucide-react';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-screen-sm mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <TestTube className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-3xl text-primary-text">
                Test Page
              </h1>
              <p className="text-secondary-text">
                Testing MetricsManagement component in isolation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-screen-sm mx-auto">
          <MetricsManagement />
        </div>
      </div>
    </div>
  );
}