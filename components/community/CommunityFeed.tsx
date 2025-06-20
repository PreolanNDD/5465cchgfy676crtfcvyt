'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getCommunityFindings, getUserFindings, getUserVotes } from '@/lib/community';
import { castVoteAction, reportFindingAction } from '@/lib/actions/community-actions';
import { CommunityFinding, FindingVote } from '@/lib/community';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ChevronUp, ChevronDown, Flag, User, Calendar, MessageSquare, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

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

interface CommunityFeedProps {
  activeTab: 'community' | 'my-findings';
}

export function CommunityFeed({ activeTab }: CommunityFeedProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reportingFindingId, setReportingFindingId] = useState<string | null>(null);

  // Fetch community findings (visible only)
  const { data: communityFindings = [], isLoading: loadingCommunity } = useQuery<CommunityFinding[]>({
    queryKey: ['communityFindings'],
    queryFn: getCommunityFindings,
    enabled: activeTab === 'community',
  });

  // Fetch user's personal findings (all statuses)
  const { data: userFindings = [], isLoading: loadingUser } = useQuery<CommunityFinding[]>({
    queryKey: ['userFindings', user?.id],
    queryFn: () => getUserFindings(user!.id),
    enabled: activeTab === 'my-findings' && !!user?.id,
  });

  // Determine which findings to display
  const findings = activeTab === 'community' ? communityFindings : userFindings;
  const isLoading = activeTab === 'community' ? loadingCommunity : loadingUser;

  // Fetch user votes for all findings
  const findingIds = useMemo(() => findings.map(f => f.id), [findings]);
  const { data: userVotes = [] } = useQuery<FindingVote[]>({
    queryKey: ['userVotes', user?.id, findingIds],
    queryFn: () => getUserVotes(user!.id, findingIds),
    enabled: !!user?.id && findingIds.length > 0 && activeTab === 'community',
  });

  // Create a map of finding ID to user's vote
  const userVoteMap = useMemo(() => {
    const map = new Map<string, 'upvote' | 'downvote'>();
    userVotes.forEach(vote => {
      map.set(vote.finding_id, vote.vote_type);
    });
    console.log('🗺️ [CommunityFeed] User vote map created:', map);
    return map;
  }, [userVotes]);

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: ({ findingId, voteType }: { findingId: string; voteType: 'upvote' | 'downvote' }) => {
      console.log('🗳️ [CommunityFeed] Vote mutation triggered:', { findingId, voteType });
      return castVoteAction(user!.id, findingId, voteType);
    },
    onSuccess: (_, variables) => {
      console.log('✅ [CommunityFeed] Vote mutation successful, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['communityFindings'] });
      queryClient.invalidateQueries({ queryKey: ['userVotes', user?.id] });
      console.log('🔄 [CommunityFeed] Queries invalidated for finding:', variables.findingId);
    },
    onError: (error: any, variables) => {
      console.error('❌ [CommunityFeed] Vote mutation failed:', error, 'for finding:', variables.findingId);
      alert(`Failed to cast vote: ${error.message}`);
    },
  });

  // Report mutation
  const reportMutation = useMutation({
    mutationFn: ({ findingId, reason }: { findingId: string; reason: string }) =>
      reportFindingAction(user!.id, findingId, reason),
    onSuccess: () => {
      setReportingFindingId(null);
      alert('Finding reported successfully. Thank you for helping keep our community safe.');
    },
    onError: (error: any) => {
      alert(`Failed to report finding: ${error.message}`);
    },
  });

  const handleVote = (findingId: string, voteType: 'upvote' | 'downvote') => {
    console.log('🎯 [CommunityFeed] Vote button clicked:', { findingId, voteType, userId: user?.id });
    
    if (!user || voteMutation.isPending || activeTab !== 'community') {
      console.log('⚠️ [CommunityFeed] Vote blocked:', { 
        hasUser: !!user, 
        isPending: voteMutation.isPending, 
        activeTab 
      });
      return;
    }
    
    console.log('🚀 [CommunityFeed] Executing vote mutation...');
    voteMutation.mutate({ findingId, voteType });
  };

  const handleReport = (findingId: string) => {
    setReportingFindingId(findingId);
  };

  const handleSubmitReport = (reason: string) => {
    if (!reportingFindingId || !user) return;
    reportMutation.mutate({ findingId: reportingFindingId, reason });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
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

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'visible':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Published</Badge>;
      case 'hidden_by_community':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Hidden by Community</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="flex space-x-4">
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-heading text-xl text-primary-text mb-2">
            {activeTab === 'community' ? 'No Community Findings Yet' : 'No Findings Yet'}
          </h3>
          <p className="text-secondary-text">
            {activeTab === 'community' 
              ? 'Be the first to share your insights with the community!'
              : 'You haven\'t submitted any findings yet. Share your insights from the Data or Lab pages!'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  console.log('🎨 [CommunityFeed] Rendering findings:', findings.length, 'userVoteMap size:', userVoteMap.size);

  return (
    <>
      <div className="space-y-6">
        {findings.map((finding) => {
          const userVote = userVoteMap.get(finding.id);
          const score = finding.upvotes - finding.downvotes;

          console.log('🎯 [CommunityFeed] Rendering finding:', {
            id: finding.id,
            title: finding.title,
            upvotes: finding.upvotes,
            downvotes: finding.downvotes,
            score,
            userVote
          });

          return (
            <Card key={finding.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <Link href={`/community/${finding.id}`} className="block">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-heading text-xl text-primary-text hover:text-primary transition-colors">
                            {finding.title}
                          </h3>
                          {/* Status badge - only show in My Findings view */}
                          {activeTab === 'my-findings' && getStatusBadge(finding.status)}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-secondary-text">
                          {/* Only show author info in community view */}
                          {activeTab === 'community' && (
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{getAuthorName(finding)}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(finding.created_at)}</span>
                          </div>
                          {finding.share_data && (
                            <Badge variant="outline" className="text-blue-700 border-blue-300">
                              Data Shared
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-secondary-text group-hover:text-primary transition-colors flex-shrink-0 ml-4" />
                    </div>

                    {/* Content Preview */}
                    <div className="prose prose-sm max-w-none">
                      <p className="text-primary-text leading-relaxed">
                        {truncateContent(finding.content)}
                      </p>
                    </div>
                  </div>
                </Link>

                {/* Actions - Outside the link to prevent nested interactive elements */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
                  {/* Voting - only show in community view */}
                  {activeTab === 'community' && (
                    <div className="flex items-center space-x-2">
                      {/* Upvote */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('⬆️ [CommunityFeed] Upvote button clicked for finding:', finding.id);
                          handleVote(finding.id, 'upvote');
                        }}
                        disabled={!user || voteMutation.isPending}
                        className={`flex items-center space-x-1 ${
                          userVote === 'upvote' 
                            ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                            : 'text-secondary-text hover:text-green-600 hover:bg-green-50'
                        }`}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>

                      {/* Score */}
                      <div className="px-2 py-1 text-sm font-medium text-primary-text">
                        {score > 0 ? '+' : ''}{score}
                      </div>

                      {/* Downvote */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('⬇️ [CommunityFeed] Downvote button clicked for finding:', finding.id);
                          handleVote(finding.id, 'downvote');
                        }}
                        disabled={!user || voteMutation.isPending}
                        className={`flex items-center space-x-1 ${
                          userVote === 'downvote' 
                            ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                            : 'text-secondary-text hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* My Findings view - show score without voting */}
                  {activeTab === 'my-findings' && (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 text-sm text-secondary-text">
                        <ChevronUp className="w-4 h-4 text-green-600" />
                        <span>{finding.upvotes}</span>
                      </div>
                      <div className="px-2 py-1 text-sm font-medium text-primary-text">
                        {score > 0 ? '+' : ''}{score}
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-secondary-text">
                        <ChevronDown className="w-4 h-4 text-red-600" />
                        <span>{finding.downvotes}</span>
                      </div>
                    </div>
                  )}

                  {/* Report Button - only show in community view for other users' posts */}
                  {activeTab === 'community' && user && user.id !== finding.author_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleReport(finding.id);
                      }}
                      disabled={reportMutation.isPending}
                      className="text-secondary-text hover:text-red-600 hover:bg-red-50"
                    >
                      <Flag className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
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