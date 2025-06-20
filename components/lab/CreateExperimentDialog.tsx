'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { createExperiment } from '@/lib/experiments';
import { TrackableItem } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, FlaskConical } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateExperimentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inputMetrics: TrackableItem[];
  outputMetrics: TrackableItem[];
}

export function CreateExperimentDialog({ 
  isOpen, 
  onClose, 
  inputMetrics, 
  outputMetrics 
}: CreateExperimentDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    hypothesis: '',
    independent_variable_id: '',
    dependent_variable_id: '',
    start_date: '',
    end_date: ''
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error("User not found");
      
      // Determine status based on dates
      const today = new Date().toISOString().split('T')[0];
      const status = data.end_date < today ? 'COMPLETED' : 'ACTIVE';
      
      return createExperiment({
        user_id: user.id,
        title: data.title.trim(),
        hypothesis: data.hypothesis.trim(),
        independent_variable_id: data.independent_variable_id,
        dependent_variable_id: data.dependent_variable_id,
        start_date: data.start_date,
        end_date: data.end_date,
        status
      });
    },
    onSuccess: () => {
      setFormData({
        title: '',
        hypothesis: '',
        independent_variable_id: '',
        dependent_variable_id: '',
        start_date: '',
        end_date: ''
      });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['experiments', user?.id] });
      onClose();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create experiment');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title || !formData.hypothesis || !formData.independent_variable_id || 
        !formData.dependent_variable_id || !formData.start_date || !formData.end_date) {
      setError('Please fill in all fields');
      return;
    }

    // Validate date range
    if (formData.end_date < formData.start_date) {
      setError('End date must be after start date');
      return;
    }

    // Validate that variables are different
    if (formData.independent_variable_id === formData.dependent_variable_id) {
      setError('Independent and dependent variables must be different');
      return;
    }

    setError('');
    createMutation.mutate(formData);
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    setFormData({
      title: '',
      hypothesis: '',
      independent_variable_id: '',
      dependent_variable_id: '',
      start_date: '',
      end_date: ''
    });
    setError('');
    onClose();
  };

  const isLoading = createMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="font-heading text-xl text-primary-text">
              Start New Experiment
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Title */}
            <Input
              label="Experiment Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Does meditation improve my focus?"
              required
              disabled={isLoading}
            />

            {/* Hypothesis */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-primary-text">
                Hypothesis
              </Label>
              <textarea
                value={formData.hypothesis}
                onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
                placeholder="What do you expect to happen? e.g., I believe that meditating daily will increase my focus scores by at least 2 points."
                className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                required
                disabled={isLoading}
              />
            </div>

            {/* Independent Variable (Cause) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-primary-text">
                Independent Variable (The Cause)
              </Label>
              <Select
                value={formData.independent_variable_id}
                onValueChange={(value) => setFormData({ ...formData, independent_variable_id: value })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an input metric" />
                </SelectTrigger>
                <SelectContent>
                  {inputMetrics.map((metric) => (
                    <SelectItem key={metric.id} value={metric.id}>
                      {metric.name} ({metric.type === 'BOOLEAN' ? 'Yes/No' : 
                                   metric.type === 'SCALE_1_10' ? 'Scale 1-10' : 'Numeric'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {inputMetrics.length === 0 && (
                <p className="text-sm text-secondary-text">
                  You need to create some input metrics first.
                </p>
              )}
            </div>

            {/* Dependent Variable (Effect) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-primary-text">
                Dependent Variable (The Effect)
              </Label>
              <Select
                value={formData.dependent_variable_id}
                onValueChange={(value) => setFormData({ ...formData, dependent_variable_id: value })}
                disabled={isLoading}
              >
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
              {outputMetrics.length === 0 && (
                <p className="text-sm text-secondary-text">
                  You need to create some output metrics first.
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-primary-text">
                  Start Date
                </Label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-primary-text">
                  End Date
                </Label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isLoading}
                disabled={!formData.title || !formData.hypothesis || !formData.independent_variable_id || 
                         !formData.dependent_variable_id || !formData.start_date || !formData.end_date || 
                         inputMetrics.length === 0 || outputMetrics.length === 0 || isLoading}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Experiment
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}