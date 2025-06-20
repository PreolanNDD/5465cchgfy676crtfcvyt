'use client';

import React from 'react';
import { TrackableItem } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface LogEntryFieldProps {
  item: TrackableItem;
  value: any;
  onChange: (itemId: string, value: any) => void;
}

export function LogEntryField({ item, value, onChange }: LogEntryFieldProps) {
  const handleSliderChange = React.useCallback((values: number[]) => {
    onChange(item.id, values[0]);
  }, [item.id, onChange]);

  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value ? parseFloat(e.target.value) : null;
    onChange(item.id, newValue);
  }, [item.id, onChange]);

  const handleSwitchChange = React.useCallback((checked: boolean) => {
    onChange(item.id, checked);
  }, [item.id, onChange]);

  const handleTextChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(item.id, e.target.value);
  }, [item.id, onChange]);

  const renderField = () => {
    switch (item.type) {
      case 'SCALE_1_10':
        const sliderValue = value !== null && value !== undefined ? value : 5;
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-primary-text">
                {item.name}
              </Label>
              <span className="text-sm font-medium text-primary">
                {sliderValue}
              </span>
            </div>
            <div className="isolate">
              <Slider
                value={[sliderValue]}
                onValueChange={handleSliderChange}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-secondary-text">
              <span>1</span>
              <span>10</span>
            </div>
          </div>
        );

      case 'NUMERIC':
        const numericValue = value === null || value === undefined ? '' : value;
        return (
          <Input
            label={item.name}
            type="number"
            value={numericValue}
            onChange={handleInputChange}
            placeholder="Enter a number"
          />
        );

      case 'BOOLEAN':
        const booleanValue = value === null || value === undefined ? false : value;
        return (
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <Label className="text-sm font-medium text-primary-text">
              {item.name}
            </Label>
            <Switch
              checked={booleanValue}
              onCheckedChange={handleSwitchChange}
            />
          </div>
        );

      case 'TEXT':
        const textValue = value === null || value === undefined ? '' : value;
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-primary-text">
              {item.name}
            </Label>
            <textarea
              value={textValue}
              onChange={handleTextChange}
              placeholder="Enter your notes..."
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {renderField()}
    </div>
  );
}