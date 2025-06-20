'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { updateTrackableItem } from '@/lib/trackable-items';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save } from 'lucide-react';
import { DataType, Category, TrackableItem } from '@/lib/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface EditTrackableItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingItem: TrackableItem | null;
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

export function EditTrackableItemDialog({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingItem, 
  existingItems = [] 
}: EditTrackableItemDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: '' as Category | '',
    type: '' as DataType | ''
  });
  const operationRef = useRef<string>('');

  // Initialize form data when editingItem changes
  useEffect(() => {
    if (editingItem) {
      console.log('Initializing edit form with item:', editingItem);
      setFormData({
        name: editingItem.name,
        category: editingItem.category,
        type: editingItem.type
      });
      setError(''); // Clear any previous errors
    }
  }, [editingItem]);

  const checkForDuplicateName = (name: string): boolean => {
    if (!name.trim() || !editingItem) return false;
    
    const trimmedName = name.trim().toLowerCase();
    const originalName = editingItem.name.toLowerCase();
    
    // Don't flag as duplicate if it's the same as the original name
    if (trimmedName === originalName) return false;
    
    return existingItems.some(item => 
      item.id !== editingItem.id && // Exclude the item being edited
      item.name.toLowerCase() === trimmedName
    );
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; category: Category; type: DataType }) => {
      if (!editingItem) throw new Error("No item to edit");
      
      console.log('Updating metric:', editingItem.id, 'with data:', data);
      
      const result = await updateTrackableItem(editingItem.id, {
        name: data.name.trim(),
        category: data.category,
        type: data.type,
      });
      
      console.log('Metric updated successfully:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Update mutation succeeded');
      setFormData({ name: '', category: '', type: '' });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['trackableItems', user?.id] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      console.error('Update mutation failed:', error);
      
      // Handle database constraint errors as well
      if (error.message && (error.message.includes('duplicate') || error.message.includes('unique'))) {
        setError('You already have a metric with this name.');
      } else {
        setError(error.message || 'Failed to update metric');
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingItem || !formData.name || !formData.category || !formData.type) return;

    // Prevent multiple simultaneous operations
    if (updateMutation.isPending) {
      console.log('Update already in progress, ignoring submit');
      return;
    }

    operationRef.current = 'updating';
    setError('');

    try {
      // Check for duplicate names before attempting to save
      if (checkForDuplicateName(formData.name)) {
        setError('You already have a metric with this name.');
        return;
      }

      updateMutation.mutate({
        name: formData.name,
        category: formData.category as Category,
        type: formData.type as DataType,
      });

    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'Failed to update metric');
    } finally {
      operationRef.current = '';
    }
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
    if (updateMutation.isPending) {
      console.log('Cannot close dialog: operation in progress');
      return;
    }
    setFormData({ name: '', category: '', type: '' });
    setError('');
    onClose();
  };

  const isLoading = updateMutation.isPending;

  return (
    <Dialog open={isOpen && !!editingItem} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-heading text-xl text-primary-text">
              Edit Metric
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
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}