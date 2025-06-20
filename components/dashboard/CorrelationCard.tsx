'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CorrelationCardProps {
  correlationScore: number;
  primaryMetricName: string;
  comparisonMetricName: string;
}

export function CorrelationCard({ 
  correlationScore, 
  primaryMetricName, 
  comparisonMetricName 
}: CorrelationCardProps) {
  // Determine strength
  const getStrength = (score: number): string => {
    const absScore = Math.abs(score);
    if (absScore > 0.6) return 'Strong';
    if (absScore >= 0.3) return 'Moderate';
    return 'Weak';
  };

  // Determine direction
  const getDirection = (score: number): string => {
    if (score > 0) return 'Positive';
    if (score < 0) return 'Negative';
    return 'No';
  };

  // Get color based on strength and direction
  const getColor = (score: number): string => {
    const strength = getStrength(score);
    const direction = getDirection(score);
    
    if (strength === 'Strong') {
      return direction === 'Positive' ? 'text-green-600' : 'text-red-600';
    } else if (strength === 'Moderate') {
      return direction === 'Positive' ? 'text-green-500' : 'text-red-500';
    } else {
      return 'text-gray-500';
    }
  };

  // Get icon based on direction
  const getIcon = (score: number) => {
    if (score > 0) return <TrendingUp className="w-4 h-4" />;
    if (score < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  // Generate explanation text
  const getExplanation = (score: number): string => {
    const direction = getDirection(score);
    
    if (direction === 'Positive') {
      return `When ${primaryMetricName} goes up, ${comparisonMetricName} tends to go up.`;
    } else if (direction === 'Negative') {
      return `When ${primaryMetricName} goes up, ${comparisonMetricName} tends to go down.`;
    } else {
      return `There is no clear relationship between ${primaryMetricName} and ${comparisonMetricName}.`;
    }
  };

  const strength = getStrength(correlationScore);
  const direction = getDirection(correlationScore);
  const color = getColor(correlationScore);
  const icon = getIcon(correlationScore);
  const explanation = getExplanation(correlationScore);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <h3 className="font-heading text-lg text-primary-text">At a Glance</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Correlation Title */}
        <div className="text-center">
          <h4 className={`font-medium text-lg ${color}`}>
            {strength} {direction} Correlation
          </h4>
          <p className="text-sm text-secondary-text mt-1">
            Score: {correlationScore.toFixed(3)}
          </p>
        </div>

        {/* Explanation */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-secondary-text">
            {explanation}
          </p>
        </div>

        {/* Correlation Scale Visual */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-secondary-text">
            <span>-1.0</span>
            <span>0.0</span>
            <span>+1.0</span>
          </div>
          <div className="relative h-2 bg-gray-200 rounded-full">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-400 via-gray-300 to-green-400 rounded-full"></div>
            
            {/* Score indicator */}
            <div 
              className="absolute top-0 w-3 h-3 bg-white border-2 border-gray-600 rounded-full transform -translate-y-0.5 -translate-x-1.5"
              style={{ 
                left: `${((correlationScore + 1) / 2) * 100}%` 
              }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-secondary-text">
            <span>Strong Negative</span>
            <span>No Correlation</span>
            <span>Strong Positive</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}