'use client';

import React, { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { shareFindingAction, ShareFindingData } from '@/lib/actions/community-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Share2, MessageSquare } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface ShareContext {
  type: 'chart' | 'experiment';
  // For chart context
  primaryMetricId?: string;
  comparisonMetricId?: string | null;
  dateRange?: number;
  // For experiment context
  experimentId?: string;
}

interface ShareFindingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  context: ShareContext | null;
}

export function ShareFindingDialog({ isOpen, onClose, context }: ShareFindingDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    shareData: false
  });
  const [error, setError] = useState('');

  // Create finding mutation using the new Server Action
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user || !context) throw new Error("Missing user or context");
      
      // Prepare the data for the server action
      const shareData: ShareFindingData = {
        type: context.type,
        title: data.title.trim(),
        content: data.content.trim(),
        share_data: data.shareData
      };

      // Add context-specific data
      if (context.type === 'chart') {
        shareData.primaryMetricId = context.primaryMetricId;
        shareData.comparisonMetricId = context.comparisonMetricId;
        shareData.dateRange = context.dateRange;
      } else if (context.type === 'experiment') {
        shareData.experimentId = context.experimentId;
      }

      // Call the Server Action
      return shareFindingAction(shareData);
    },
    onSuccess: (result) => {
      setFormData({ title: '', content: '', shareData: false });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['communityFindings'] });
      onClose();
      
      // Show success message
      alert('Thank you! Your finding has been shared successfully.');
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to share finding');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !context || !formData.title || !formData.content) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    createMutation.mutate(formData);
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    setFormData({ title: '', content: '', shareData: false });
    setError('');
    onClose();
  };

  const getContextDescription = () => {
    if (!context) return '';
    
    if (context.type === 'chart') {
      return `This finding is based on your data analysis${context.dateRange ? ` over the last ${context.dateRange} days` : ''}.`;
    } else if (context.type === 'experiment') {
      return 'This finding is based on your experiment results.';
    }
    
    return '';
  };

  const isLoading = createMutation.isPending;

  return (
    <Dialog open={isOpen && !!context} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="font-heading text-xl text-primary-text">
              Share Your Finding
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Context Info */}
          {context && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">
                    Sharing Context
                  </h4>
                  <p className="text-blue-800 text-sm">
                    {getContextDescription()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Title */}
            <Input
              label="Finding Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Morning meditation significantly improves my focus"
              required
              disabled={isLoading}
            />

            {/* Content */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-primary-text">
                Your Insights & Analysis *
              </Label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Share your insights, patterns you discovered, and what this means for your optimization journey. What did you learn? What surprised you? How might this help others?"
                className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={6}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-secondary-text">
                Tip: Include specific details about your discovery and actionable insights for the community.
              </p>
            </div>

            {/* Share Data Checkbox */}
            <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              <Checkbox
                id="shareData"
                checked={formData.shareData}
                onCheckedChange={(checked) => setFormData({ ...formData, shareData: !!checked })}
                disabled={isLoading}
              />
              <div className="flex-1">
                <Label 
                  htmlFor="shareData" 
                  className="text-sm font-medium text-primary-text cursor-pointer"
                >
                  Attach and share the anonymized data from this {context?.type === 'chart' ? 'chart' : 'experiment'}
                </Label>
                <p className="text-xs text-secondary-text mt-1">
                  This will allow others to see the data patterns that led to your insights. 
                  All personal information is removed.
                </p>
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
                disabled={!formData.title || !formData.content || isLoading}
                className="flex-1"
              >
                Share Finding
              </Button>
            </div>
          </form>

          {/* Success Message Info */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>After sharing:</strong> Your finding will be visible to the community immediately. 
              Others can vote and engage with your insights to help surface the most valuable discoveries.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}