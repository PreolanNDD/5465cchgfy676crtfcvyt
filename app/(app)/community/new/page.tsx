'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { createFindingAction } from '@/lib/actions/community-actions';
import { getTrackableItems } from '@/lib/trackable-items';
import { getDualMetricChartData } from '@/lib/chart-data';
import { getExperiments, analyzeExperimentResults } from '@/lib/experiments';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Edit3, Eye, ArrowLeft, Send, Calendar, User, BarChart3, FlaskConical } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useFormState, useFormStatus } from 'react-dom';

interface ShareContext {
  type: 'chart' | 'experiment';
  primaryMetricId?: string;
  comparisonMetricId?: string | null;
  dateRange?: number;
  experimentId?: string;
}

// SubmitButton component that uses useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      loading={pending}
      disabled={pending}
      className="w-full"
      size="lg"
    >
      <Send className="w-4 h-4 mr-2" />
      {pending ? 'Publishing...' : 'Publish Finding'}
    </Button>
  );
}

export default function CreateFindingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Use useFormState for form handling
  const [state, formAction] = useFormState(createFindingAction, { message: '' });

  // Parse context from URL parameters
  const context = useMemo((): ShareContext | null => {
    const type = searchParams.get('type') as 'chart' | 'experiment' | null;
    if (!type) return null;

    if (type === 'chart') {
      return {
        type: 'chart',
        primaryMetricId: searchParams.get('primaryMetricId') || undefined,
        comparisonMetricId: searchParams.get('comparisonMetricId') || null,
        dateRange: searchParams.get('dateRange') ? parseInt(searchParams.get('dateRange')!) : undefined
      };
    } else if (type === 'experiment') {
      return {
        type: 'experiment',
        experimentId: searchParams.get('experimentId') || undefined
      };
    }

    return null;
  }, [searchParams]);

  // Fetch trackable items for chart context
  const { data: trackableItems = [] } = useQuery({
    queryKey: ['trackableItems', user?.id],
    queryFn: () => getTrackableItems(user!.id),
    enabled: !!user?.id && context?.type === 'chart',
  });

  // Fetch chart data for preview
  const { data: chartData = [] } = useQuery({
    queryKey: ['chartData', context],
    queryFn: () => {
      if (!context || context.type !== 'chart' || !context.primaryMetricId) return [];
      return getDualMetricChartData(
        user!.id,
        context.primaryMetricId,
        context.comparisonMetricId ?? null,
        context.dateRange || 30
      );
    },
    enabled: !!user?.id && context?.type === 'chart' && !!context.primaryMetricId,
  });

  // Fetch experiment data for preview
  const { data: experiments = [] } = useQuery({
    queryKey: ['experiments', user?.id],
    queryFn: () => getExperiments(user!.id),
    enabled: !!user?.id && context?.type === 'experiment',
  });

  const experiment = experiments.find(exp => exp.id === context?.experimentId);

  const getContextDescription = () => {
    if (!context) return '';
    
    if (context.type === 'chart') {
      const primaryMetric = trackableItems.find(item => item.id === context.primaryMetricId);
      const comparisonMetric = trackableItems.find(item => item.id === context.comparisonMetricId);
      
      return `Chart analysis: ${primaryMetric?.name || 'Unknown metric'}${
        comparisonMetric ? ` vs ${comparisonMetric.name}` : ''
      } over ${context.dateRange || 30} days`;
    } else if (context.type === 'experiment') {
      return `Experiment results: ${experiment?.title || 'Unknown experiment'}`;
    }
    
    return '';
  };

  const primaryMetric = trackableItems.find(item => item.id === context?.primaryMetricId);
  const comparisonMetric = trackableItems.find(item => item.id === context?.comparisonMetricId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-3xl text-primary-text">Create Finding</h1>
              <p className="text-secondary-text">Share your insights with the community</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Editor */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Edit3 className="w-5 h-5 text-primary" />
                    <h2 className="font-heading text-xl text-primary-text">Write Your Finding</h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <form action={formAction} className="space-y-6">
                    {/* Display form errors from the server */}
                    {state?.message && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{state.message}</p>
                      </div>
                    )}

                    {/* Context Info */}
                    {context && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          {context.type === 'chart' ? (
                            <BarChart3 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <FlaskConical className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div>
                            <h4 className="font-medium text-blue-900 mb-1">
                              Data Context
                            </h4>
                            <p className="text-blue-800 text-sm">
                              {getContextDescription()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hidden fields for context data */}
                    {context && (
                      <>
                        {context.type === 'chart' && (
                          <input
                            type="hidden"
                            name="chartConfig"
                            value={JSON.stringify({
                              primaryMetricId: context.primaryMetricId,
                              comparisonMetricId: context.comparisonMetricId,
                              dateRange: context.dateRange
                            })}
                          />
                        )}
                        {context.type === 'experiment' && (
                          <input
                            type="hidden"
                            name="experimentId"
                            value={context.experimentId || ''}
                          />
                        )}
                      </>
                    )}

                    {/* Title */}
                    <Input
                      label="Finding Title"
                      name="title"
                      placeholder="e.g., Morning meditation significantly improves my focus"
                      required
                    />

                    {/* Content */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-primary-text">
                        Your Insights & Analysis *
                      </Label>
                      <textarea
                        name="content"
                        placeholder="Share your insights, patterns you discovered, and what this means for your optimization journey. What did you learn? What surprised you? How might this help others?"
                        className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        rows={12}
                        required
                      />
                    </div>

                    {/* Share Data Checkbox */}
                    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                      <Checkbox
                        id="shareData"
                        name="shareData"
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor="shareData" 
                          className="text-sm font-medium text-primary-text cursor-pointer"
                        >
                          Share anonymized data with this finding
                        </Label>
                        <p className="text-xs text-secondary-text mt-1">
                          This will allow others to see the data patterns that led to your insights. 
                          All personal information is removed.
                        </p>
                      </div>
                    </div>

                    <SubmitButton />
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Live Preview */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Eye className="w-5 h-5 text-primary" />
                    <h2 className="font-heading text-xl text-primary-text">Live Preview</h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Preview Header */}
                    <div className="space-y-4">
                      <h1 className="font-heading text-2xl text-primary-text">
                        Your finding title will appear here...
                      </h1>
                      
                      <div className="flex items-center space-x-4 text-sm text-secondary-text">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{user?.email?.split('@')[0] || 'You'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Just now</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-800 border-green-300">Published</Badge>
                      </div>
                    </div>

                    {/* Preview Content */}
                    <div className="prose prose-sm max-w-none">
                      <div className="text-primary-text leading-relaxed whitespace-pre-wrap">
                        Your insights and analysis will appear here as you type...
                      </div>
                    </div>

                    {/* Preview Data Visualization */}
                    {context && (
                      <div className="space-y-4">
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="font-medium text-primary-text mb-3">Shared Data</h3>
                          
                          {context.type === 'chart' && chartData.length > 0 && (
                            <div className="space-y-3">
                              <div className="text-sm text-secondary-text">
                                Chart: {primaryMetric?.name}
                                {comparisonMetric && ` vs ${comparisonMetric.name}`}
                                {context.dateRange && ` (${context.dateRange} days)`}
                              </div>
                              <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis 
                                      dataKey="formattedDate" 
                                      stroke="#708090"
                                      fontSize={12}
                                    />
                                    <YAxis stroke="#708090" fontSize={12} />
                                    <Tooltip />
                                    <Line 
                                      type="monotone" 
                                      dataKey="primaryValue"
                                      stroke="#7ed984"
                                      strokeWidth={2}
                                      name={primaryMetric?.name}
                                    />
                                    {comparisonMetric && (
                                      <Line 
                                        type="monotone" 
                                        dataKey="comparisonValue"
                                        stroke="#FFA500"
                                        strokeWidth={2}
                                        name={comparisonMetric.name}
                                      />
                                    )}
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}

                          {context.type === 'experiment' && experiment && (
                            <div className="space-y-3">
                              <div className="text-sm text-secondary-text">
                                Experiment: {experiment.title}
                              </div>
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-primary-text">
                                  <strong>Hypothesis:</strong> {experiment.hypothesis}
                                </p>
                                <div className="mt-2 text-xs text-secondary-text">
                                  {experiment.start_date} to {experiment.end_date}
                                </div>
                              </div>
                            </div>
                          )}

                          {context.type === 'chart' && chartData.length === 0 && (
                            <div className="p-3 bg-gray-50 rounded-lg text-sm text-secondary-text">
                              Chart data will be displayed here when available
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Preview Actions */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="text-sm text-secondary-text">0 votes</div>
                        </div>
                        <div className="text-xs text-secondary-text">
                          Preview mode
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}