'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getTrackableItems } from '@/lib/trackable-items';
import { getDualMetricChartData } from '@/lib/chart-data';
import { calculatePearsonCorrelation } from '@/lib/correlation';
import { TrackableItem } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, Calendar, TrendingUp, Target, RefreshCw } from 'lucide-react';
import { CorrelationCard } from '@/components/dashboard/CorrelationCard';
import { MetricRelationshipBreakdown } from '@/components/dashboard/MetricRelationshipBreakdown';
import { PageActions } from '@/components/ui/PageActions';
import { useQuery } from '@tanstack/react-query';

const DATE_RANGES = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
];

interface DualMetricChartData {
  date: string;
  formattedDate: string;
  primaryValue: number | null;
  comparisonValue: number | null;
  normalizedComparisonValue?: number | null; // For boolean normalization
}

interface AxisConfig {
  leftDomain: [number, number];
  rightDomain: [number, number];
  rightTickFormatter?: (value: number) => string;
  rightTicks?: number[];
  normalizeComparison: boolean;
}

export default function DataPage() {
  const { user } = useAuth();
  const [primaryMetricId, setPrimaryMetricId] = useState<string>('');
  const [comparisonMetricId, setComparisonMetricId] = useState<string>('none');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('30');
  const [shouldFetchChart, setShouldFetchChart] = useState(false);

  const { data: allItems = [], isLoading: loadingItems } = useQuery<TrackableItem[]>({
    queryKey: ['trackableItems', user?.id],
    queryFn: () => getTrackableItems(user!.id),
    enabled: !!user?.id,
  });

  const outputMetrics = useMemo(() => allItems.filter(item => 
    item.category === 'OUTPUT' && (item.type === 'SCALE_1_10' || item.type === 'NUMERIC')
  ), [allItems]);

  const inputMetrics = useMemo(() => allItems.filter(item => 
    item.category === 'INPUT' && (item.type === 'SCALE_1_10' || item.type === 'NUMERIC' || item.type === 'BOOLEAN')
  ), [allItems]);

  const primaryMetric = allItems.find(item => item.id === primaryMetricId);
  const comparisonMetric = allItems.find(item => item.id === comparisonMetricId);

  const { data: rawChartData = [], isLoading: loadingChart, error } = useQuery<DualMetricChartData[]>({
    queryKey: ['dualMetricChartData', user?.id, primaryMetricId, comparisonMetricId, selectedDateRange],
    queryFn: () => getDualMetricChartData(
      user!.id, 
      primaryMetricId, 
      comparisonMetricId === 'none' ? null : comparisonMetricId, 
      parseInt(selectedDateRange)
    ),
    enabled: !!user?.id && !!primaryMetricId && shouldFetchChart,
  });

  // Advanced Axis Synchronization Processing
  const { chartData, axisConfig } = useMemo(() => {
    if (!primaryMetric || !rawChartData.length) {
      return { chartData: rawChartData, axisConfig: null };
    }

    // FIXED: Calculate maximum values including 0 values
    const primaryValues = rawChartData
      .map(d => d.primaryValue)
      .filter(v => v !== null && v !== undefined) as number[];
    const comparisonValues = rawChartData
      .map(d => d.comparisonValue)
      .filter(v => v !== null && v !== undefined) as number[];
    
    const primaryMax = primaryValues.length > 0 ? Math.max(...primaryValues) : 10;
    const comparisonMax = comparisonValues.length > 0 ? Math.max(...comparisonValues) : 10;

    let config: AxisConfig;
    let processedData = [...rawChartData];

    if (!comparisonMetric) {
      // Single metric - simple configuration
      config = {
        leftDomain: primaryMetric.type === 'SCALE_1_10' ? [1, 10] : [0, Math.max(primaryMax * 1.1, 1)],
        rightDomain: [0, 10],
        normalizeComparison: false
      };
    } else if (primaryMetric.type === 'NUMERIC' && comparisonMetric.type === 'SCALE_1_10') {
      // Scenario A: Primary NUMERIC, Comparison SCALE_1_10
      const scaledMax = Math.max(primaryMax * 1.1, 1);
      config = {
        leftDomain: [0, scaledMax],
        rightDomain: [0, scaledMax],
        rightTickFormatter: (value: number) => {
          // Convert scaled value back to 1-10 scale
          const scaleValue = Math.round((value / scaledMax) * 10);
          return scaleValue >= 1 && scaleValue <= 10 ? scaleValue.toString() : '';
        },
        rightTicks: Array.from({ length: 10 }, (_, i) => ((i + 1) / 10) * scaledMax),
        normalizeComparison: false
      };
    } else if (primaryMetric.type === 'SCALE_1_10' && comparisonMetric.type === 'NUMERIC') {
      // Scenario B: Primary SCALE_1_10, Comparison NUMERIC
      config = {
        leftDomain: [1, 10],
        rightDomain: [0, Math.max(comparisonMax * 1.1, 1)],
        normalizeComparison: false
      };
    } else if (primaryMetric.type === 'SCALE_1_10' && comparisonMetric.type === 'BOOLEAN') {
      // Scenario C: Primary SCALE_1_10, Comparison BOOLEAN
      // Normalize boolean values to align with 1-10 scale
      processedData = rawChartData.map(d => ({
        ...d,
        // FIXED: Properly handle false values (0) and true values (1)
        normalizedComparisonValue: d.comparisonValue === 1 ? 7.5 : 
                                   d.comparisonValue === 0 ? 2.5 : null
      }));

      config = {
        leftDomain: [1, 10],
        rightDomain: [1, 10],
        rightTickFormatter: (value: number) => {
          if (Math.abs(value - 7.5) < 0.5) return 'Yes';
          if (Math.abs(value - 2.5) < 0.5) return 'No';
          return '';
        },
        rightTicks: [2.5, 7.5],
        normalizeComparison: true
      };
    } else {
      // Default case - both same type or other combinations
      const leftMax = primaryMetric.type === 'SCALE_1_10' ? 10 : Math.max(primaryMax * 1.1, 1);
      const rightMax = comparisonMetric.type === 'SCALE_1_10' ? 10 : Math.max(comparisonMax * 1.1, 1);
      
      config = {
        leftDomain: primaryMetric.type === 'SCALE_1_10' ? [1, 10] : [0, leftMax],
        rightDomain: comparisonMetric.type === 'SCALE_1_10' ? [1, 10] : [0, rightMax],
        normalizeComparison: false
      };
    }

    return { chartData: processedData, axisConfig: config };
  }, [rawChartData, primaryMetric, comparisonMetric]);

  // Calculate correlation score
  const correlationScore = useMemo(() => {
    if (!primaryMetric || !comparisonMetric || comparisonMetricId === 'none' || !chartData.length) {
      return null;
    }

    // Prepare paired arrays for correlation calculation
    const primaryValues: number[] = [];
    const comparisonValues: number[] = [];

    chartData.forEach(dataPoint => {
      // Only include data points where both metrics have valid values
      if (dataPoint.primaryValue !== null && dataPoint.primaryValue !== undefined &&
          dataPoint.comparisonValue !== null && dataPoint.comparisonValue !== undefined) {
        
        primaryValues.push(dataPoint.primaryValue);
        
        // Use the original comparison value (not normalized) for correlation calculation
        // Boolean values are already converted to 0/1 in the data fetching
        comparisonValues.push(dataPoint.comparisonValue);
      }
    });

    // Calculate correlation if we have enough paired data points
    if (primaryValues.length >= 2) {
      return calculatePearsonCorrelation(primaryValues, comparisonValues);
    }

    return null;
  }, [chartData, primaryMetric, comparisonMetric, comparisonMetricId]);

  const handleUpdateChart = () => {
    if (primaryMetricId) {
      setShouldFetchChart(true);
    }
  };

  const getShareContext = () => {
    if (!shouldFetchChart || !primaryMetricId) return undefined;
    
    return {
      type: 'chart' as const,
      primaryMetricId,
      comparisonMetricId: comparisonMetricId === 'none' ? null : comparisonMetricId,
      dateRange: parseInt(selectedDateRange)
    };
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-primary-text">{label}</p>
          {/* FIXED: Show 0 values properly */}
          {(data.primaryValue !== null && data.primaryValue !== undefined) && (
            <p className="text-sm">
              <span className="font-medium">{primaryMetric?.name}:</span> {data.primaryValue}
            </p>
          )}
          {comparisonMetric && (data.comparisonValue !== null && data.comparisonValue !== undefined) && (
            <p className="text-sm">
              <span className="font-medium">{comparisonMetric.name}:</span>{' '}
              {comparisonMetric.type === 'BOOLEAN' 
                ? (data.comparisonValue === 1 ? 'Yes' : 'No')
                : data.comparisonValue
              }
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Legend Component with increased padding and black text
  const CustomLegend = (props: any) => {
    const { payload } = props;
    if (!payload || payload.length === 0) return null;

    return (
      <div className="flex justify-center items-center space-x-8 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-3 px-4 py-2">
            <div 
              className="w-4 h-0.5" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium text-black">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const getMetricStats = (values: (number | null)[]) => {
    // FIXED: Include 0 values in statistics
    const validValues = values.filter(v => v !== null && v !== undefined) as number[];
    if (validValues.length === 0) return { avg: 0, min: 0, max: 0, count: 0 };
    
    return {
      avg: Math.round((validValues.reduce((sum, val) => sum + val, 0) / validValues.length) * 10) / 10,
      min: Math.min(...validValues),
      max: Math.max(...validValues),
      count: validValues.length
    };
  };

  const primaryStats = getMetricStats(chartData.map(d => d.primaryValue));
  const comparisonStats = comparisonMetric?.type !== 'BOOLEAN' 
    ? getMetricStats(chartData.map(d => d.comparisonValue))
    : {
        // FIXED: Count false values (0) properly
        trueCount: chartData.filter(d => d.comparisonValue === 1).length,
        falseCount: chartData.filter(d => d.comparisonValue === 0).length,
        totalCount: chartData.filter(d => d.comparisonValue !== null && d.comparisonValue !== undefined).length
      };

  if (loadingItems) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-3xl text-primary-text">Data Analysis</h1>
              <p className="text-secondary-text">Advanced dual-axis visualization with synchronized scaling</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Actions */}
          <PageActions
            shareDisabled={!shouldFetchChart || !primaryMetricId || chartData.length === 0}
            shareContext={getShareContext()}
          />

          {outputMetrics.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="font-heading text-xl text-primary-text mb-2">No Output Metrics Available</h3>
                <p className="text-secondary-text mb-6">
                  You need to create some output metrics (like "Energy Level" or "Mood") before you can analyze your data.
                </p>
                <Button onClick={() => window.location.href = '/log'}>
                  Create Your First Metric
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Chart Controls */}
              <div className="lg:col-span-1">
                <div className="sticky top-8 space-y-6">
                  {/* Chart Controls */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="font-heading text-lg text-primary-text">Chart Controls</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Output Metric Selector */}
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 text-sm font-medium text-primary-text">
                          <div className="w-4 h-4 bg-accent-2 rounded flex items-center justify-center">
                            <TrendingUp className="w-3 h-3 text-white" />
                          </div>
                          <span>Output Metric</span>
                        </label>
                        <Select value={primaryMetricId} onValueChange={setPrimaryMetricId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an output metric" />
                          </SelectTrigger>
                          <SelectContent>
                            {outputMetrics.map((metric) => (
                              <SelectItem key={metric.id} value={metric.id}>
                                {metric.name} ({metric.type === 'SCALE_1_10' ? 'Scale 1-10' : 'Numeric'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Input Metric Selector */}
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 text-sm font-medium text-primary-text">
                          <div className="w-4 h-4 bg-accent-1 rounded flex items-center justify-center">
                            <Target className="w-3 h-3 text-white" />
                          </div>
                          <span>Input Metric</span>
                        </label>
                        <Select value={comparisonMetricId} onValueChange={setComparisonMetricId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an input metric" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {inputMetrics.map((metric) => (
                              <SelectItem key={metric.id} value={metric.id}>
                                {metric.name} ({
                                  metric.type === 'BOOLEAN' ? 'Yes/No' : 
                                  metric.type === 'SCALE_1_10' ? 'Scale 1-10' : 'Numeric'
                                })
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date Range Selector */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-primary-text">
                          Time Period
                        </label>
                        <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DATE_RANGES.map((range) => (
                              <SelectItem key={range.value} value={range.value}>
                                {range.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Update Chart Button */}
                      <Button 
                        onClick={handleUpdateChart}
                        disabled={!primaryMetricId || loadingChart}
                        className="w-full"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loadingChart ? 'animate-spin' : ''}`} />
                        {loadingChart ? 'Loading...' : 'Update Chart'}
                      </Button>

                      {/* Axis Synchronization Info */}
                      {axisConfig && comparisonMetric && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="text-sm font-medium text-blue-900 mb-2">Axis Synchronization</h4>
                          <div className="text-xs text-blue-700 space-y-1">
                            {primaryMetric?.type === 'NUMERIC' && comparisonMetric.type === 'SCALE_1_10' && (
                              <p>✓ Scales synchronized: Right axis shows 1-10 labels aligned to left axis range</p>
                            )}
                            {primaryMetric?.type === 'SCALE_1_10' && comparisonMetric.type === 'BOOLEAN' && (
                              <p>✓ Boolean normalized: Yes=7.5, No=2.5 on 1-10 scale</p>
                            )}
                            {primaryMetric?.type === 'SCALE_1_10' && comparisonMetric.type === 'NUMERIC' && (
                              <p>→ Independent scales: Different ranges maintained</p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Statistics */}
                  {shouldFetchChart && chartData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <h3 className="font-heading text-lg text-primary-text">Statistics</h3>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Primary Metric Stats */}
                        {primaryMetric && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-accent-2 rounded flex items-center justify-center">
                                <TrendingUp className="w-3 h-3 text-white" />
                              </div>
                              <h4 className="font-medium text-primary-text">{primaryMetric.name}</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-secondary-text">Average:</span>
                                <span className="ml-1 font-medium">{primaryStats.avg}</span>
                              </div>
                              <div>
                                <span className="text-secondary-text">Count:</span>
                                <span className="ml-1 font-medium">{primaryStats.count}</span>
                              </div>
                              <div>
                                <span className="text-secondary-text">Min:</span>
                                <span className="ml-1 font-medium">{primaryStats.min}</span>
                              </div>
                              <div>
                                <span className="text-secondary-text">Max:</span>
                                <span className="ml-1 font-medium">{primaryStats.max}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Comparison Metric Stats */}
                        {comparisonMetric && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-accent-1 rounded flex items-center justify-center">
                                <Target className="w-3 h-3 text-white" />
                              </div>
                              <h4 className="font-medium text-primary-text">{comparisonMetric.name}</h4>
                            </div>
                            {comparisonMetric.type === 'BOOLEAN' ? (
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-secondary-text">Yes:</span>
                                  <span className="ml-1 font-medium">{(comparisonStats as any).trueCount}</span>
                                </div>
                                <div>
                                  <span className="text-secondary-text">No:</span>
                                  <span className="ml-1 font-medium">{(comparisonStats as any).falseCount}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-secondary-text">Total:</span>
                                  <span className="ml-1 font-medium">{(comparisonStats as any).totalCount}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-secondary-text">Average:</span>
                                  <span className="ml-1 font-medium">{(comparisonStats as any).avg}</span>
                                </div>
                                <div>
                                  <span className="text-secondary-text">Count:</span>
                                  <span className="ml-1 font-medium">{(comparisonStats as any).count}</span>
                                </div>
                                <div>
                                  <span className="text-secondary-text">Min:</span>
                                  <span className="ml-1 font-medium">{(comparisonStats as any).min}</span>
                                </div>
                                <div>
                                  <span className="text-secondary-text">Max:</span>
                                  <span className="ml-1 font-medium">{(comparisonStats as any).max}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Right Column - Chart Display */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <h3 className="font-heading text-lg text-primary-text">
                        {primaryMetric ? `${primaryMetric.name} Analysis` : 'Metric Analysis'}
                      </h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!shouldFetchChart ? (
                      <div className="h-96 flex items-center justify-center">
                        <div className="text-center">
                          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-secondary-text">Select a metric and click "Update Chart" to begin</p>
                        </div>
                      </div>
                    ) : loadingChart ? (
                      <div className="h-96 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-secondary-text">Loading chart data...</p>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="h-96 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-red-600 mb-2">Error loading chart data</p>
                          <Button onClick={handleUpdateChart} variant="outline" size="sm">
                            Try Again
                          </Button>
                        </div>
                      </div>
                    ) : chartData.length === 0 ? (
                      <div className="h-96 flex items-center justify-center">
                        <div className="text-center">
                          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-secondary-text">No data available for the selected time period</p>
                          <p className="text-sm text-secondary-text mt-2">Try selecting a different date range or log some data first</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="formattedDate" 
                              stroke="#708090"
                              fontSize={12}
                              tickLine={false}
                            />
                            
                            {/* Left Y-Axis */}
                            <YAxis 
                              yAxisId="left"
                              stroke="#7ed984"
                              fontSize={12}
                              tickLine={false}
                              domain={axisConfig?.leftDomain || ['auto', 'auto']}
                            />
                            
                            {/* Right Y-Axis (only if comparison metric exists) */}
                            {comparisonMetric && axisConfig && (
                              <YAxis 
                                yAxisId="right"
                                orientation="right"
                                stroke="#FFA500"
                                fontSize={12}
                                tickLine={false}
                                domain={axisConfig.rightDomain}
                                tickFormatter={axisConfig.rightTickFormatter}
                                ticks={axisConfig.rightTicks}
                              />
                            )}
                            
                            <Tooltip content={<CustomTooltip />} />
                            <Legend content={<CustomLegend />} />
                            
                            {/* Primary metric line (always on left axis) - OUTPUT = accent-2 */}
                            <Line 
                              yAxisId="left"
                              type="monotone" 
                              dataKey="primaryValue"
                              stroke="#7ed984"
                              strokeWidth={2}
                              connectNulls={false}
                              name={primaryMetric?.name}
                              dot={{ fill: '#7ed984', strokeWidth: 2, r: 3 }}
                              activeDot={{ r: 5, stroke: '#7ed984', strokeWidth: 2 }}
                            />
                            
                            {/* Comparison metric line - INPUT = accent-1 */}
                            {comparisonMetric && comparisonMetricId !== 'none' && axisConfig && (
                              <Line 
                                yAxisId={axisConfig.normalizeComparison ? "left" : "right"}
                                type="monotone" 
                                dataKey={axisConfig.normalizeComparison ? "normalizedComparisonValue" : "comparisonValue"}
                                stroke="#FFA500"
                                strokeWidth={2}
                                strokeDasharray={comparisonMetric.type === 'BOOLEAN' ? "5 5" : "0"}
                                connectNulls={false}
                                name={comparisonMetric.name}
                                dot={{ fill: '#FFA500', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, stroke: '#FFA500', strokeWidth: 2 }}
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Correlation Analysis Card - At a Glance */}
                {shouldFetchChart && correlationScore !== null && primaryMetric && comparisonMetric && comparisonMetricId !== 'none' && (
                  <CorrelationCard
                    correlationScore={correlationScore}
                    primaryMetricName={primaryMetric.name}
                    comparisonMetricName={comparisonMetric.name}
                  />
                )}

                {/* Metric Relationship Breakdown - Moved to right column */}
                {shouldFetchChart && primaryMetric && comparisonMetric && comparisonMetricId !== 'none' && (
                  <MetricRelationshipBreakdown
                    chartData={chartData}
                    primaryMetric={primaryMetric}
                    comparisonMetric={comparisonMetric}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}