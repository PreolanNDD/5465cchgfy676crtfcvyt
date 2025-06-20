'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { createTrackableItem, findExistingMetricByName, reactivateTrackableItem } from '@/lib/trackable-items';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReactivateMetricDialog } from './ReactivateMetricDialog';
import { X, Plus } from 'lucide-react';
import { DataType, Category, TrackableItem } from '@/lib/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AddTrackableItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingItems?: TrackableItem[];
}

const DATA_TYPE_LABELS: Record<DataType, string> = {
  'SCALE_1_10': 'Scale (1-10)',
  'NUMERIC': 'Number',
  'BOOLEAN': 'Yes/No',
  'TEXT': 'Text'
};

const CATEGORY_LABELS: Record<Category, string> = {
  'INPUT': 'Input',
  'OUTPUT': 'Output'
};

export function AddTrackableItemDialog({ isOpen, onClose, onSuccess, existingItems = [] }: AddTrackableItemDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: '' as Category | '',
    type: '' as DataType | ''
  });

  // Reactivation dialog state
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [metricToReactivate, setMetricToReactivate] = useState<TrackableItem | null>(null);
  const operationRef = useRef<string>('');

  const checkForDuplicateName = (name: string): boolean => {
    if (!name.trim()) return false;
    
    const trimmedName = name.trim().toLowerCase();
    return existingItems.some(item => 
      item.name.toLowerCase() === trimmedName
    );
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; category: Category; type: DataType }) => {
      if (!user) throw new Error("User not found");
      
      console.log('Creating new trackable item:', data);
      
      const result = await createTrackableItem({
        user_id: user.id,
        name: data.name.trim(),
        category: data.category,
        type: data.type,
        is_active: true
      });
      
      console.log('Trackable item created successfully:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Create mutation succeeded');
      setFormData({ name: '', category: '', type: '' });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['trackableItems', user?.id] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      console.error('Create mutation failed:', error);
      if (error.message && (error.message.includes('duplicate') || error.message.includes('unique'))) {
        setError('You already have a metric with this name.');
      } else {
        setError(error.message || 'Failed to create metric');
      }
    },
  });

  // Reactivate mutation
  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Reactivating metric:', id);
      const result = await reactivateTrackableItem(id);
      console.log('Metric reactivated successfully:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Reactivate mutation succeeded');
      setShowReactivateDialog(false);
      setMetricToReactivate(null);
      setFormData({ name: '', category: '', type: '' });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['trackableItems', user?.id] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      console.error('Reactivate mutation failed:', error);
      setError(error.message || 'Failed to reactivate metric');
      setShowReactivateDialog(false);
      setMetricToReactivate(null);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name || !formData.category || !formData.type) return;

    // Prevent multiple simultaneous operations
    if (createMutation.isPending || reactivateMutation.isPending) {
      console.log('Operation already in progress, ignoring submit');
      return;
    }

    operationRef.current = 'checking';
    setError('');

    try {
      console.log('1. Checking for existing metrics with name:', formData.name);
      
      // First, search for any existing metric with this name (active or inactive)
      const existingMetric = await findExistingMetricByName(user.id, formData.name);
      
      if (existingMetric) {
        console.log('2. Found existing metric:', existingMetric);
        
        if (existingMetric.is_active) {
          // Scenario B: Active metric with same name exists
          console.log('3. Scenario B: Active metric exists');
          setError('You already have a metric with this name.');
          return;
        } else {
          // Found an inactive metric - now check if category and type match
          const categoryMatches = existingMetric.category === formData.category;
          const typeMatches = existingMetric.type === formData.type;
          
          console.log('3. Found inactive metric - checking compatibility:');
          console.log('   - Category match:', categoryMatches, `(existing: ${existingMetric.category}, new: ${formData.category})`);
          console.log('   - Type match:', typeMatches, `(existing: ${existingMetric.type}, new: ${formData.type})`);
          
          if (categoryMatches && typeMatches) {
            // Scenario A: Names match AND category/type are the same - offer reactivation
            console.log('4. Scenario A: Identical metric found - showing reactivation dialog');
            setMetricToReactivate(existingMetric);
            setShowReactivateDialog(true);
            return;
          } else {
            // Scenario B: Names match BUT category or type is different - show error
            console.log('4. Scenario B: Different metric type/category - showing error');
            setError('A metric with this name already exists in your archive with a different type. Please choose a new name.');
            return;
          }
        }
      }

      // Scenario C: No existing metric found - create new one
      console.log('3. Scenario C: No existing metric found - creating new one');
      
      // Additional client-side check against active items (backup validation)
      if (checkForDuplicateName(formData.name)) {
        setError('You already have a metric with this name.');
        return;
      }

      operationRef.current = 'creating';
      createMutation.mutate({
        name: formData.name,
        category: formData.category as Category,
        type: formData.type as DataType,
      });

    } catch (err: any) {
      console.error('X. Error in handleSubmit:', err);
      
      // Handle database constraint errors as well
      if (err.message && (err.message.includes('duplicate') || err.message.includes('unique'))) {
        setError('You already have a metric with this name.');
      } else {
        setError(err.message || 'Failed to create metric');
      }
    } finally {
      operationRef.current = '';
    }
  };

  const handleReactivateConfirm = () => {
    if (!metricToReactivate || reactivateMutation.isPending) {
      console.log('Cannot reactivate: no metric or operation in progress');
      return;
    }

    operationRef.current = 'reactivating';
    reactivateMutation.mutate(metricToReactivate.id);
  };

  const handleReactivateClose = () => {
    if (reactivateMutation.isPending) {
      console.log('Cannot close reactivate dialog: operation in progress');
      return;
    }
    setShowReactivateDialog(false);
    setMetricToReactivate(null);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData({ ...formData, name: newName });
    
    // Clear error if user is typing and no longer has a duplicate
    if (error && !checkForDuplicateName(newName)) {
      setError('');
    }
  };

  const handleClose = () => {
    if (createMutation.isPending || reactivateMutation.isPending) {
      console.log('Cannot close dialog: operation in progress');
      return;
    }
    setFormData({ name: '', category: '', type: '' });
    setError('');
    onClose();
  };

  const isLoading = createMutation.isPending || reactivateMutation.isPending;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-heading text-xl text-primary-text">
                Add New Metric
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
                disabled={isLoading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Input
                label="Metric Name"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g., Sleep Quality, Caffeine Intake"
                required
                disabled={isLoading}
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-primary-text">
                  Category
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value: Category) => setFormData({ ...formData, category: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-primary-text">
                  Data Type
                </label>
                <Select
                  value={formData.type}
                  onValueChange={(value: DataType) => setFormData({ ...formData, type: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DATA_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  disabled={!formData.name || !formData.category || !formData.type || isLoading}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Metric
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reactivate Metric Dialog */}
      <ReactivateMetricDialog
        isOpen={showReactivateDialog}
        onClose={handleReactivateClose}
        onConfirm={handleReactivateConfirm}
        metric={metricToReactivate}
        loading={reactivateMutation.isPending}
      />
    </>
  );
}