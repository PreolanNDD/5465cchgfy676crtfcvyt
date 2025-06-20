'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { getCommunityFindingById, getUserVotes } from '@/lib/community';
import { castVoteAction, reportFindingAction } from '@/lib/actions/community-actions';
import { CommunityFinding, FindingVote } from '@/lib/community';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ChevronUp, ChevronDown, Flag, User, Calendar, ArrowLeft, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  loading: boolean;
}

function ReportDialog({ isOpen, onClose, onSubmit, loading }: ReportDialogProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reason);
    setReason('');
  };

  const handleClose = () => {
    if (loading) return;
    setReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-primary-text">
            Report Finding
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-primary-text">
              Reason for reporting (optional)
            </Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please describe why you're reporting this finding..."
              className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
              disabled={loading}
            />
          </div>
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              className="flex-1"
            >
              Submit Report
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface FindingDetailClientProps {
  initialFinding: CommunityFinding;
}

export function FindingDetailClient({ initialFinding }: FindingDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reportingFindingId, setReportingFindingId] = useState<string | null>(null);

  // Use the initial finding data and set up TanStack Query for future updates
  const { data: findingData = initialFinding } = useQuery<CommunityFinding | null>({
    queryKey: ['communityFinding', initialFinding.id],
    queryFn: () => getCommunityFindingById(initialFinding.id),
    initialData: initialFinding,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle case where finding might be null (e.g., deleted after initial load)
  if (!findingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-2xl text-primary-text mb-4">Finding Not Found</h1>
          <p className="text-secondary-text mb-6">This finding may have been removed or is no longer available.</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const finding = findingData;

  // Fetch user votes for this finding
  const { data: userVotes = [] } = useQuery<FindingVote[]>({
    queryKey: ['userVotes', user?.id, finding.id],
    queryFn: () => getUserVotes(user!.id, [finding.id]),
    enabled: !!user?.id,
  });

  // Get user's vote for this finding
  const userVote = userVotes.find(vote => vote.finding_id === finding.id)?.vote_type;

  // Vote mutation using Server Action
  const voteMutation = useMutation({
    mutationFn: ({ voteType }: { voteType: 'upvote' | 'downvote' }) =>
      castVoteAction(user!.id, finding.id, voteType),
    onSuccess: (result) => {
      if (result?.error) {
        alert(`Failed to cast vote: ${result.error}`);
      } else {
        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ['communityFinding', finding.id] });
        queryClient.invalidateQueries({ queryKey: ['communityFindings'] });
        queryClient.invalidateQueries({ queryKey: ['userVotes', user?.id] });
      }
    },
    onError: (error: any) => {
      alert(`Failed to cast vote: ${error.message}`);
    },
  });

  // Report mutation using Server Action
  const reportMutation = useMutation({
    mutationFn: ({ reason }: { reason: string }) =>
      reportFindingAction(user!.id, finding.id, reason),
    onSuccess: (result) => {
      if (result?.error) {
        alert(`Failed to report finding: ${result.error}`);
      } else {
        setReportingFindingId(null);
        alert('Finding reported successfully. Thank you for helping keep our community safe.');
      }
    },
    onError: (error: any) => {
      alert(`Failed to report finding: ${error.message}`);
    },
  });

  const handleVote = (voteType: 'upvote' | 'downvote') => {
    if (!user || voteMutation.isPending) return;
    voteMutation.mutate({ voteType });
  };

  const handleReport = () => {
    setReportingFindingId(finding.id);
  };

  const handleSubmitReport = (reason: string) => {
    if (!finding.id || !user) return;
    reportMutation.mutate({ reason });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getAuthorName = (finding: CommunityFinding) => {
    if (!finding.author) return 'Anonymous';
    const { first_name, last_name } = finding.author;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    } else if (first_name) {
      return first_name;
    } else if (last_name) {
      return last_name;
    }
    return 'Anonymous';
  };

  const score = finding.upvotes - finding.downvotes;

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-6">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="font-heading text-3xl text-primary-text mb-2">
                {finding.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-secondary-text">
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>{getAuthorName(finding)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(finding.created_at)}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  Score: {score > 0 ? '+' : ''}{score}
                </Badge>
                {finding.share_data && (
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    Data Shared
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Main Content */}
            <Card>
              <CardContent className="p-8">
                <div className="prose prose-lg max-w-none">
                  <div className="whitespace-pre-wrap text-primary-text leading-relaxed">
                    {finding.content}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Visualization Placeholder */}
            {finding.share_data && (
              <Card>
                <CardContent className="p-8">
                  <h3 className="font-heading text-xl text-primary-text mb-4">
                    Shared Data Visualization
                  </h3>
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <p className="text-secondary-text">
                      Data visualization will be displayed here when implemented
                    </p>
                    {finding.chart_config && (
                      <div className="mt-4 text-xs text-secondary-text">
                        Chart Config: {JSON.stringify(finding.chart_config, null, 2)}
                      </div>
                    )}
                    {finding.experiment_id && (
                      <div className="mt-4 text-xs text-secondary-text">
                        Experiment ID: {finding.experiment_id}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {/* Voting */}
                  <div className="flex items-center space-x-2">
                    {/* Upvote */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleVote('upvote')}
                      disabled={!user || voteMutation.isPending}
                      className={`flex items-center space-x-1 ${
                        userVote === 'upvote' 
                          ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                          : 'text-secondary-text hover:text-green-600 hover:bg-green-50'
                      }`}
                    >
                      <ChevronUp className="w-5 h-5" />
                      <span>{finding.upvotes}</span>
                    </Button>

                    {/* Score */}
                    <div className="px-3 py-2 text-sm font-medium text-primary-text">
                      {score > 0 ? '+' : ''}{score}
                    </div>

                    {/* Downvote */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleVote('downvote')}
                      disabled={!user || voteMutation.isPending}
                      className={`flex items-center space-x-1 ${
                        userVote === 'downvote' 
                          ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                          : 'text-secondary-text hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <ChevronDown className="w-5 h-5" />
                      <span>{finding.downvotes}</span>
                    </Button>
                  </div>

                  {/* Report Button - only show for other users' posts */}
                  {user && user.id !== finding.author_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleReport}
                      disabled={reportMutation.isPending}
                      className="text-secondary-text hover:text-red-600 hover:bg-red-50"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Report
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Report Dialog */}
      <ReportDialog
        isOpen={!!reportingFindingId}
        onClose={() => setReportingFindingId(null)}
        onSubmit={handleSubmitReport}
        loading={reportMutation.isPending}
      />
    </>
  );
}