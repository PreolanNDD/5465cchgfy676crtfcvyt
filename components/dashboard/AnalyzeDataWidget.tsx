'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, ArrowRight, BarChart3 } from 'lucide-react';

export function AnalyzeDataWidget() {
  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-heading text-xl text-primary-text">Discover Your Correlations</h3>
                <p className="text-secondary-text text-sm">Analyze patterns in your data</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm text-secondary-text">
                <BarChart3 className="w-4 h-4 text-accent-2" />
                <span>Advanced dual-axis visualization</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-secondary-text">
                <TrendingUp className="w-4 h-4 text-accent-1" />
                <span>Correlation analysis & insights</span>
              </div>
            </div>

            <Button 
              onClick={() => window.location.href = '/data'}
              className="w-full"
            >
              <span>View Your Trends</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}