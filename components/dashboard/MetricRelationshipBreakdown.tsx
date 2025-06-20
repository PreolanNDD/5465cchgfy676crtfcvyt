'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Zap, BarChart2, CalendarCheck2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { TrackableItem } from '@/lib/types';

interface DualMetricChartData {
  date: string;
  formattedDate: string;
  primaryValue: number | null;
  comparisonValue: number | null;
}

interface ConditionalAveragesData {
  type: 'boolean' | 'numeric';
  group1: {
    label: string;
    average: number;
    count: number;
  };
  group2: {
    label: string;
    average: number;
    count: number;
  };
  difference: number;
}

interface ConsistencyAnalysisData {
  inStreakAverage: number;
  outOfStreakAverage: number;
  inStreakCount: number;
  outOfStreakCount: number;
  totalStreaks: number;
  longestStreak: number;
  difference: number;
}

interface MetricRelationshipBreakdownProps {
  chartData: DualMetricChartData[];
  primaryMetric: TrackableItem;
  comparisonMetric: TrackableItem;
}

export function MetricRelationshipBreakdown({ 
  chartData, 
  primaryMetric, 
  comparisonMetric 
}: MetricRelationshipBreakdownProps) {
  // Calculate conditional averages
  const conditionalAverages = useMemo((): ConditionalAveragesData | null => {
    if (!chartData.length) {
      return null;
    }

    // Get valid data points where both metrics have values
    const validDataPoints = chartData.filter(dataPoint => 
      dataPoint.primaryValue !== null && dataPoint.primaryValue !== undefined &&
      dataPoint.comparisonValue !== null && dataPoint.comparisonValue !== undefined
    );

    if (validDataPoints.length < 2) {
      return null;
    }

    if (comparisonMetric.type === 'BOOLEAN') {
      // Scenario A: Boolean comparison metric
      const yesGroup = validDataPoints.filter(d => d.comparisonValue === 1);
      const noGroup = validDataPoints.filter(d => d.comparisonValue === 0);

      if (yesGroup.length === 0 || noGroup.length === 0) {
        return null;
      }

      const yesAverage = yesGroup.reduce((sum, d) => sum + d.primaryValue!, 0) / yesGroup.length;
      const noAverage = noGroup.reduce((sum, d) => sum + d.primaryValue!, 0) / noGroup.length;

      return {
        type: 'boolean' as const,
        group1: {
          label: `On days ${comparisonMetric.name} was Yes`,
          average: yesAverage,
          count: yesGroup.length
        },
        group2: {
          label: `On days ${comparisonMetric.name} was No`,
          average: noAverage,
          count: noGroup.length
        },
        difference: yesAverage - noAverage
      };
    } else {
      // Scenario B: Numeric or Scale comparison metric
      const comparisonValues = validDataPoints.map(d => d.comparisonValue!);
      const sortedValues = [...comparisonValues].sort((a, b) => a - b);
      const medianIndex = Math.floor(sortedValues.length / 2);
      const median = sortedValues.length % 2 === 0 
        ? (sortedValues[medianIndex - 1] + sortedValues[medianIndex]) / 2
        : sortedValues[medianIndex];

      const highGroup = validDataPoints.filter(d => d.comparisonValue! > median);
      const lowGroup = validDataPoints.filter(d => d.comparisonValue! <= median);

      if (highGroup.length === 0 || lowGroup.length === 0) {
        return null;
      }

      const highAverage = highGroup.reduce((sum, d) => sum + d.primaryValue!, 0) / highGroup.length;
      const lowAverage = lowGroup.reduce((sum, d) => sum + d.primaryValue!, 0) / lowGroup.length;

      return {
        type: 'numeric' as const,
        group1: {
          label: `On High ${comparisonMetric.name} days`,
          average: highAverage,
          count: highGroup.length
        },
        group2: {
          label: `On Low ${comparisonMetric.name} days`,
          average: lowAverage,
          count: lowGroup.length
        },
        difference: highAverage - lowAverage
      };
    }
  }, [chartData, comparisonMetric]);

  // Calculate consistency analysis
  const consistencyAnalysis = useMemo((): ConsistencyAnalysisData | null => {
    if (!chartData.length) {
      return null;
    }

    // Get valid data points where both metrics have values
    const validDataPoints = chartData.filter(dataPoint => 
      dataPoint.primaryValue !== null && dataPoint.primaryValue !== undefined &&
      dataPoint.comparisonValue !== null && dataPoint.comparisonValue !== undefined
    );

    if (validDataPoints.length < 3) {
      return null;
    }

    // Sort by date to ensure chronological order
    const sortedDataPoints = [...validDataPoints].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Determine streak condition based on comparison metric type
    let streakCondition: (value: number) => boolean;
    
    if (comparisonMetric.type === 'BOOLEAN') {
      // For boolean: streak day is when value is true (1)
      streakCondition = (value: number) => value === 1;
    } else {
      // For numeric/scale: calculate median and use above median as streak condition
      const comparisonValues = sortedDataPoints.map(d => d.comparisonValue!);
      const sortedValues = [...comparisonValues].sort((a, b) => a - b);
      const medianIndex = Math.floor(sortedValues.length / 2);
      const median = sortedValues.length % 2 === 0 
        ? (sortedValues[medianIndex - 1] + sortedValues[medianIndex]) / 2
        : sortedValues[medianIndex];
      
      streakCondition = (value: number) => value > median;
    }

    // Detect streaks of 3+ consecutive days
    const streaks: number[][] = [];
    let currentStreak: number[] = [];
    
    sortedDataPoints.forEach((dataPoint, index) => {
      if (streakCondition(dataPoint.comparisonValue!)) {
        currentStreak.push(index);
      } else {
        if (currentStreak.length >= 3) {
          streaks.push([...currentStreak]);
        }
        currentStreak = [];
      }
    });
    
    // Don't forget the last streak if it's still ongoing
    if (currentStreak.length >= 3) {
      streaks.push([...currentStreak]);
    }

    if (streaks.length === 0) {
      return null;
    }

    // Collect all in-streak and out-of-streak days
    const inStreakIndices = new Set(streaks.flat());
    const inStreakDays: number[] = [];
    const outOfStreakDays: number[] = [];

    sortedDataPoints.forEach((dataPoint, index) => {
      if (inStreakIndices.has(index)) {
        inStreakDays.push(dataPoint.primaryValue!);
      } else {
        outOfStreakDays.push(dataPoint.primaryValue!);
      }
    });

    if (inStreakDays.length === 0 || outOfStreakDays.length === 0) {
      return null;
    }

    // Calculate averages
    const inStreakAverage = inStreakDays.reduce((sum, val) => sum + val, 0) / inStreakDays.length;
    const outOfStreakAverage = outOfStreakDays.reduce((sum, val) => sum + val, 0) / outOfStreakDays.length;

    // Calculate streak statistics
    const longestStreak = Math.max(...streaks.map(streak => streak.length));

    return {
      inStreakAverage,
      outOfStreakAverage,
      inStreakCount: inStreakDays.length,
      outOfStreakCount: outOfStreakDays.length,
      totalStreaks: streaks.length,
      longestStreak,
      difference: inStreakAverage - outOfStreakAverage
    };
  }, [chartData, comparisonMetric]);

  // Render Conditional Averages Section
  const renderConditionalAverages = () => {
    if (!conditionalAverages) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-secondary-text">
            Not enough data for conditional analysis. Log more entries to see patterns.
          </p>
        </div>
      );
    }

    const { group1, group2, difference } = conditionalAverages;
    const higherGroup = group1.average > group2.average ? group1 : group2;
    const lowerGroup = group1.average > group2.average ? group2 : group1;

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          <h4 className="font-medium text-primary-text">Conditional Averages</h4>
        </div>

        {/* Group Comparisons */}
        <div className="space-y-3">
          {/* Group 1 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-primary-text">
                {group1.label}
              </p>
              <p className="text-xs text-secondary-text">
                {group1.count} day{group1.count !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">
                {group1.average.toFixed(1)}
              </p>
              <p className="text-xs text-secondary-text">
                avg {primaryMetric.name}
              </p>
            </div>
          </div>

          {/* Group 2 */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-primary-text">
                {group2.label}
              </p>
              <p className="text-xs text-secondary-text">
                {group2.count} day{group2.count !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">
                {group2.average.toFixed(1)}
              </p>
              <p className="text-xs text-secondary-text">
                avg {primaryMetric.name}
              </p>
            </div>
          </div>
        </div>

        {/* Difference Analysis */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            {difference > 0 ? (
              <TrendingUp className="w-4 h-4 text-blue-600" />
            ) : difference < 0 ? (
              <TrendingDown className="w-4 h-4 text-blue-600" />
            ) : (
              <BarChart2 className="w-4 h-4 text-blue-600" />
            )}
            <h5 className="font-medium text-blue-900">
              Difference: {Math.abs(difference).toFixed(1)} points
            </h5>
          </div>
          <p className="text-sm text-blue-800">
            {higherGroup.label} shows {Math.abs(difference).toFixed(1)} points higher average {primaryMetric.name} than {lowerGroup.label}.
          </p>
        </div>
      </div>
    );
  };

  // Render Consistency Analysis Section
  const renderConsistencyAnalysis = () => {
    if (!consistencyAnalysis) {
      return (
        <div className="text-center py-4 space-y-3">
          <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
          <div className="space-y-2">
            <h5 className="font-medium text-primary-text">
              Unlock Your Consistency Insight
            </h5>
            <p className="text-sm text-secondary-text">
              This analysis reveals how building a streak of positive inputs impacts your outcomes.
            </p>
            <p className="text-sm text-secondary-text">
              Your first insight is just a 3-day streak away. Start one today by logging a positive value (like a 'Yes' for a workout or a high rating for your sleep quality) for 3 days in a row!
            </p>
          </div>
        </div>
      );
    }

    const { 
      inStreakAverage, 
      outOfStreakAverage, 
      inStreakCount, 
      outOfStreakCount, 
      totalStreaks, 
      longestStreak, 
      difference 
    } = consistencyAnalysis;

    const getImpactStrength = (diff: number): string => {
      const absDiff = Math.abs(diff);
      if (absDiff >= 2) return 'Strong';
      if (absDiff >= 1) return 'Moderate';
      return 'Minimal';
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <CalendarCheck2 className="w-4 h-4 text-primary" />
          <h4 className="font-medium text-primary-text">Consistency Impact</h4>
        </div>

        {/* Streak Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xl font-bold text-blue-600">{totalStreaks}</p>
            <p className="text-xs text-blue-800">Total Streaks</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-xl font-bold text-purple-600">{longestStreak}</p>
            <p className="text-xs text-purple-800">Longest Streak</p>
          </div>
        </div>

        {/* Consistency Comparison */}
        <div className="space-y-3">
          {/* In-Streak Performance */}
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                During consistent {comparisonMetric.name} periods
              </p>
              <p className="text-xs text-green-700">
                {inStreakCount} day{inStreakCount !== 1 ? 's' : ''} (streaks of 3+ days)
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">
                {inStreakAverage.toFixed(1)}
              </p>
              <p className="text-xs text-green-700">
                avg {primaryMetric.name}
              </p>
            </div>
          </div>

          {/* Out-of-Streak Performance */}
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                On all other days
              </p>
              <p className="text-xs text-gray-700">
                {outOfStreakCount} day{outOfStreakCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-600">
                {outOfStreakAverage.toFixed(1)}
              </p>
              <p className="text-xs text-gray-700">
                avg {primaryMetric.name}
              </p>
            </div>
          </div>
        </div>

        {/* Impact Analysis */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            {difference > 0 ? (
              <TrendingUp className="w-4 h-4 text-blue-600" />
            ) : difference < 0 ? (
              <TrendingDown className="w-4 h-4 text-blue-600" />
            ) : (
              <CalendarCheck2 className="w-4 h-4 text-blue-600" />
            )}
            <h5 className="font-medium text-blue-900">
              {getImpactStrength(difference)} Impact: {Math.abs(difference).toFixed(1)} points
            </h5>
          </div>
          <p className="text-sm text-blue-800">
            {difference > 0 
              ? `Consistency boosts your ${primaryMetric.name} by ${difference.toFixed(1)} points on average.`
              : difference < 0
              ? `Consistency appears to lower your ${primaryMetric.name} by ${Math.abs(difference).toFixed(1)} points on average.`
              : `Consistency shows no clear impact on your ${primaryMetric.name}.`
            }
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-heading text-lg text-primary-text">Metric Relationship Breakdown</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Conditional Averages Section */}
        {renderConditionalAverages()}
        
        {/* Divider */}
        <div className="border-t border-gray-200"></div>
        
        {/* Consistency Analysis Section */}
        {renderConsistencyAnalysis()}
      </CardContent>
    </Card>
  );
}