'use client';

import React from 'react';
import { ExperimentResults } from '@/lib/experiments';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, Calendar, Target, FlaskConical } from 'lucide-react';

interface ExperimentResultsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  results: ExperimentResults | null;
}

export function ExperimentResultsDialog({ 
  isOpen, 
  onClose, 
  results 
}: ExperimentResultsDialogProps) {
  if (!results) return null;

  const { experiment, positiveConditionAverage, negativeConditionAverage, 
          positiveConditionCount, negativeConditionCount, totalDays, daysWithData } = results;

  // Calculate the difference and determine impact
  const difference = positiveConditionAverage !== null && negativeConditionAverage !== null 
    ? positiveConditionAverage - negativeConditionAverage 
    : null;

  const getImpactStrength = (diff: number | null): string => {
    if (diff === null) return 'Insufficient Data';
    const absDiff = Math.abs(diff);
    if (absDiff >= 2) return 'Strong';
    if (absDiff >= 1) return 'Moderate';
    if (absDiff >= 0.5) return 'Weak';
    return 'Minimal';
  };

  const getImpactDirection = (diff: number | null): string => {
    if (diff === null) return '';
    if (diff > 0) return 'Positive';
    if (diff < 0) return 'Negative';
    return 'No';
  };

  const getConditionLabel = (isPositive: boolean): string => {
    if (!experiment.independent_variable) return isPositive ? 'High' : 'Low';
    
    if (experiment.independent_variable.type === 'BOOLEAN') {
      return isPositive ? 'Yes' : 'No';
    } else if (experiment.independent_variable.type === 'SCALE_1_10') {
      return isPositive ? 'High (6-10)' : 'Low (1-5)';
    } else {
      return isPositive ? 'High' : 'Low';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const dataCompleteness = totalDays > 0 ? (daysWithData / totalDays) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-accent-2 rounded-lg flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="font-heading text-xl text-primary-text">
                Experiment Results
              </DialogTitle>
              <p className="text-sm text-secondary-text">{experiment.title}</p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Experiment Overview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-primary-text">Period:</span>
                <span className="ml-2 text-secondary-text">
                  {formatDate(experiment.start_date)} - {formatDate(experiment.end_date)}
                </span>
              </div>
              <div>
                <span className="font-medium text-primary-text">Duration:</span>
                <span className="ml-2 text-secondary-text">{totalDays} days</span>
              </div>
              <div>
                <span className="font-medium text-primary-text">Independent Variable:</span>
                <span className="ml-2 text-secondary-text">{experiment.independent_variable?.name}</span>
              </div>
              <div>
                <span className="font-medium text-primary-text">Dependent Variable:</span>
                <span className="ml-2 text-secondary-text">{experiment.dependent_variable?.name}</span>
              </div>
            </div>
          </div>

          {/* Data Completeness */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-primary-text">Data Completeness</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-secondary-text">Days with data:</span>
                <span className="font-medium text-primary-text">{daysWithData} of {totalDays} days</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${dataCompleteness}%` }}
                ></div>
              </div>
              <p className="text-xs text-secondary-text">
                {dataCompleteness.toFixed(1)}% data completeness
              </p>
            </div>
          </div>

          {/* Results Analysis */}
          {daysWithData > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-primary-text">Results Analysis</h3>
              </div>

              {/* Condition Comparison */}
              <div className="grid grid-cols-2 gap-4">
                {/* Positive Condition */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-center">
                    <h4 className="font-medium text-green-900 mb-2">
                      {getConditionLabel(true)} {experiment.independent_variable?.name}
                    </h4>
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {positiveConditionAverage !== null ? positiveConditionAverage.toFixed(1) : 'N/A'}
                    </div>
                    <p className="text-sm text-green-700">
                      Average {experiment.dependent_variable?.name}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {positiveConditionCount} day{positiveConditionCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Negative Condition */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-center">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {getConditionLabel(false)} {experiment.independent_variable?.name}
                    </h4>
                    <div className="text-2xl font-bold text-gray-600 mb-1">
                      {negativeConditionAverage !== null ? negativeConditionAverage.toFixed(1) : 'N/A'}
                    </div>
                    <p className="text-sm text-gray-700">
                      Average {experiment.dependent_variable?.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {negativeConditionCount} day{negativeConditionCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Impact Summary */}
              {difference !== null && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    {difference > 0 ? (
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    ) : difference < 0 ? (
                      <TrendingDown className="w-5 h-5 text-blue-600" />
                    ) : (
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    )}
                    <h4 className="font-medium text-blue-900">
                      {getImpactStrength(difference)} {getImpactDirection(difference)} Impact
                    </h4>
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      {Math.abs(difference).toFixed(1)} point difference
                    </Badge>
                  </div>
                  <p className="text-sm text-blue-800">
                    During your experiment, on days when you had {getConditionLabel(true).toLowerCase()} {experiment.independent_variable?.name?.toLowerCase()}, 
                    your average {experiment.dependent_variable?.name} was <strong>{positiveConditionAverage?.toFixed(1)}</strong>. 
                    On days when you had {getConditionLabel(false).toLowerCase()} {experiment.independent_variable?.name?.toLowerCase()}, 
                    your average {experiment.dependent_variable?.name} was <strong>{negativeConditionAverage?.toFixed(1)}</strong>.
                  </p>
                </div>
              )}

              {/* Hypothesis Check */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Your Hypothesis</h4>
                <p className="text-sm text-purple-800 italic mb-3">
                  "{experiment.hypothesis}"
                </p>
                {difference !== null && (
                  <p className="text-sm text-purple-700">
                    <strong>Result:</strong> {difference > 0 
                      ? 'Your hypothesis appears to be supported by the data.' 
                      : difference < 0 
                        ? 'Your hypothesis appears to be contradicted by the data.'
                        : 'The data shows no clear relationship between the variables.'
                    }
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-medium text-primary-text mb-2">Insufficient Data</h3>
              <p className="text-secondary-text">
                No data was logged for both variables during the experiment period. 
                Make sure to log your metrics consistently to see meaningful results.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}