'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Share2 } from 'lucide-react';

interface ShareContext {
  type: 'chart' | 'experiment';
  primaryMetricId?: string;
  comparisonMetricId?: string | null;
  dateRange?: number;
  experimentId?: string;
}

interface PageActionsProps {
  shareDisabled?: boolean;
  shareContext?: ShareContext;
}

export function PageActions({ 
  shareDisabled = false, 
  shareContext 
}: PageActionsProps) {
  const router = useRouter();

  const handleShareFindings = () => {
    if (!shareContext || shareDisabled) return;
    
    // Build the URL with context parameters
    const params = new URLSearchParams();
    params.set('type', shareContext.type);
    
    if (shareContext.type === 'chart') {
      if (shareContext.primaryMetricId) {
        params.set('primaryMetricId', shareContext.primaryMetricId);
      }
      if (shareContext.comparisonMetricId) {
        params.set('comparisonMetricId', shareContext.comparisonMetricId);
      }
      if (shareContext.dateRange) {
        params.set('dateRange', shareContext.dateRange.toString());
      }
    } else if (shareContext.type === 'experiment') {
      if (shareContext.experimentId) {
        params.set('experimentId', shareContext.experimentId);
      }
    }
    
    router.push(`/community/new?${params.toString()}`);
  };

  const getShareTooltip = () => {
    if (shareDisabled) {
      if (!shareContext) {
        return "Display a chart with data or complete an experiment to share your findings";
      }
      return "Display a chart with data to share your findings";
    }
    return "Share your insights with the community";
  };

  return (
    <div className="flex justify-end mb-6">
      <Button
        onClick={handleShareFindings}
        disabled={shareDisabled}
        className="flex items-center space-x-2"
        title={getShareTooltip()}
      >
        <Share2 className="w-4 h-4" />
        <span>Share Findings</span>
      </Button>
    </div>
  );
}