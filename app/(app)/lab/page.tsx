'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getTrackableItems } from '@/lib/trackable-items';
import { getExperiments, updateExperimentStatus, deleteExperiment, analyzeExperimentResults } from '@/lib/experiments';
import { Experiment, ExperimentResults } from '@/lib/experiments';
import { TrackableItem } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { CreateExperimentDialog } from '@/components/lab/CreateExperimentDialog';
import { EditExperimentDialog } from '@/components/lab/EditExperimentDialog';
import { ExperimentResultsDialog } from '@/components/lab/ExperimentResultsDialog';
import { PageActions } from '@/components/ui/PageActions';
import { FlaskConical, Plus, Calendar, Target, TrendingUp, BarChart3, Trash2, Play, Square, Eye, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function LabPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [selectedResults, setSelectedResults] = useState<ExperimentResults | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Fetch trackable items
  const { data: trackableItems = [], isLoading: loadingItems } = useQuery<TrackableItem[]>({
    queryKey: ['trackableItems', user?.id],
    queryFn: () => getTrackableItems(user!.id),
    enabled: !!user?.id,
  });

  // Fetch experiments
  const { data: experiments = [], isLoading: loadingExperiments } = useQuery<Experiment[]>({
    queryKey: ['experiments', user?.id],
    queryFn: () => getExperiments(user!.id),
    enabled: !!user?.id,
  });

  // Update experiment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'COMPLETED' }) => 
      updateExperimentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments', user?.id] });
    },
  });

  // Delete experiment mutation
  const deleteMutation = useMutation({
    mutationFn: deleteExperiment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments', user?.id] });
    },
  });

  // Separate metrics by category
  const inputMetrics = useMemo(() => 
    trackableItems.filter(item => item.category === 'INPUT'), 
    [trackableItems]
  );
  
  const outputMetrics = useMemo(() => 
    trackableItems.filter(item => item.category === 'OUTPUT' && (item.type === 'SCALE_1_10' || item.type === 'NUMERIC')), 
    [trackableItems]
  );

  // Separate experiments by status
  const activeExperiments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return experiments.filter(exp => {
      // Auto-update status if end date has passed
      if (exp.status === 'ACTIVE' && exp.end_date < today) {
        updateStatusMutation.mutate({ id: exp.id, status: 'COMPLETED' });
        return false; // Don't show in active until refetch
      }
      return exp.status === 'ACTIVE';
    });
  }, [experiments, updateStatusMutation]);

  const completedExperiments = useMemo(() => 
    experiments.filter(exp => exp.status === 'COMPLETED'), 
    [experiments]
  );

  const experimentsToDisplay = activeTab === 'active' ? activeExperiments : completedExperiments;

  const handleEditExperiment = (experiment: Experiment) => {
    setSelectedExperiment(experiment);
    setShowEditDialog(true);
  };

  const handleViewResults = async (experiment: Experiment) => {
    setAnalyzingId(experiment.id);
    try {
      const results = await analyzeExperimentResults(experiment);
      setSelectedResults(results);
      setShowResultsDialog(true);
    } catch (error) {
      console.error('Failed to analyze experiment:', error);
      alert('Failed to analyze experiment results');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleCompleteExperiment = (id: string) => {
    updateStatusMutation.mutate({ id, status: 'COMPLETED' });
  };

  const handleReactivateExperiment = (id: string) => {
    updateStatusMutation.mutate({ id, status: 'ACTIVE' });
  };

  const handleDeleteExperiment = (id: string) => {
    if (confirm('Are you sure you want to delete this experiment? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getExperimentDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  const getExperimentProgress = (startDate: string, endDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = today.getTime() - start.getTime();
    
    // If experiment hasn't started yet
    if (elapsed < 0) {
      return { percentage: 0, daysElapsed: 0, totalDays: Math.ceil(totalDuration / (1000 * 60 * 60 * 24)) + 1, status: 'upcoming' };
    }
    
    // If experiment has ended
    if (today.getTime() > end.getTime()) {
      const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24)) + 1;
      return { percentage: 100, daysElapsed: totalDays, totalDays, status: 'completed' };
    }
    
    // Experiment is in progress
    const percentage = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    const daysElapsed = Math.ceil(elapsed / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24)) + 1;
    
    return { percentage, daysElapsed: Math.max(1, daysElapsed), totalDays, status: 'active' };
  };

  const getShareContext = () => {
    // Only allow sharing for completed experiments
    const completedExperiment = experimentsToDisplay.find(exp => exp.status === 'COMPLETED');
    if (!completedExperiment) return undefined;
    
    return {
      type: 'experiment' as const,
      experimentId: completedExperiment.id
    };
  };

  const isLoading = loadingItems || loadingExperiments;

  if (isLoading) {
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
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-3xl text-primary-text">Experimentation Lab</h1>
              <p className="text-secondary-text">Design and track personal experiments to optimize your life</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Actions */}
          <PageActions
            shareDisabled={!getShareContext()}
            shareContext={getShareContext()}
          />

          {/* Check if user has required metrics */}
          {inputMetrics.length === 0 || outputMetrics.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FlaskConical className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="font-heading text-xl text-primary-text mb-2">Ready to Start Experimenting?</h3>
                <p className="text-secondary-text mb-6 max-w-md mx-auto">
                  To create experiments, you need both input metrics (things you control) and output metrics (things you measure).
                </p>
                <div className="space-y-2 text-sm text-secondary-text mb-6">
                  <p>✓ Input metrics: {inputMetrics.length} created</p>
                  <p>✓ Output metrics: {outputMetrics.length} created</p>
                </div>
                <Button onClick={() => window.location.href = '/log'}>
                  Create Your Metrics
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Create Experiment Button */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-heading text-2xl text-primary-text">Your Experiments</h2>
                  <p className="text-secondary-text">Track the impact of your inputs on your outputs</p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Start New Experiment
                </Button>
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'active'
                      ? 'bg-white text-primary-text shadow-sm'
                      : 'text-secondary-text hover:text-primary-text'
                  }`}
                >
                  Active ({activeExperiments.length})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'completed'
                      ? 'bg-white text-primary-text shadow-sm'
                      : 'text-secondary-text hover:text-primary-text'
                  }`}
                >
                  Completed ({completedExperiments.length})
                </button>
              </div>

              {/* Experiments List */}
              {experimentsToDisplay.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-secondary-text">
                      {activeTab === 'active' 
                        ? "No active experiments. Start your first experiment to begin optimizing!"
                        : "No completed experiments yet."
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {experimentsToDisplay.map((experiment) => {
                    const progress = getExperimentProgress(experiment.start_date, experiment.end_date);
                    
                    return (
                      <Card key={experiment.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-heading text-lg text-primary-text mb-2">
                                {experiment.title}
                              </h3>
                              <div className="flex items-center space-x-2 mb-3">
                                <Badge variant={experiment.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                  {experiment.status}
                                </Badge>
                                <span className="text-sm text-secondary-text">
                                  {getExperimentDuration(experiment.start_date, experiment.end_date)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Progress Bar - Only show for active experiments or if experiment has started */}
                          {(experiment.status === 'ACTIVE' || progress.status !== 'upcoming') && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-primary-text">Progress</span>
                                <span className="text-secondary-text">
                                  {progress.status === 'upcoming' 
                                    ? 'Starts soon'
                                    : progress.status === 'completed'
                                    ? 'Completed'
                                    : `Day ${progress.daysElapsed} of ${progress.totalDays}`
                                  }
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ease-out ${
                                    progress.status === 'completed' 
                                      ? 'bg-accent-2' 
                                      : progress.status === 'active'
                                      ? 'bg-primary' 
                                      : 'bg-gray-300'
                                  }`}
                                  style={{ width: `${progress.percentage}%` }}
                                ></div>
                              </div>
                              {progress.status === 'active' && progress.percentage > 0 && progress.percentage < 100 && (
                                <p className="text-xs text-secondary-text">
                                  {Math.round(progress.percentage)}% complete
                                </p>
                              )}
                            </div>
                          )}

                          {/* Date Range */}
                          <div className="flex items-center space-x-2 text-sm text-secondary-text">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(experiment.start_date)} - {formatDate(experiment.end_date)}</span>
                          </div>

                          {/* Variables */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm">
                              <Target className="w-4 h-4 text-accent-1" />
                              <span className="text-secondary-text">Cause:</span>
                              <span className="font-medium text-primary-text">
                                {experiment.independent_variable?.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <TrendingUp className="w-4 h-4 text-accent-2" />
                              <span className="text-secondary-text">Effect:</span>
                              <span className="font-medium text-primary-text">
                                {experiment.dependent_variable?.name}
                              </span>
                            </div>
                          </div>

                          {/* Hypothesis */}
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-secondary-text italic">
                              "{experiment.hypothesis}"
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex space-x-2">
                              {experiment.status === 'COMPLETED' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleViewResults(experiment)}
                                  loading={analyzingId === experiment.id}
                                  disabled={analyzingId === experiment.id}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Results
                                </Button>
                              )}
                              {experiment.status === 'ACTIVE' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCompleteExperiment(experiment.id)}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <Square className="w-4 h-4 mr-2" />
                                  Complete
                                </Button>
                              )}
                              {experiment.status === 'COMPLETED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReactivateExperiment(experiment.id)}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Reactivate
                                </Button>
                              )}
                            </div>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditExperiment(experiment)}
                                className="text-primary hover:text-primary hover:bg-primary/10"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteExperiment(experiment.id)}
                                disabled={deleteMutation.isPending}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateExperimentDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        inputMetrics={inputMetrics}
        outputMetrics={outputMetrics}
      />

      <EditExperimentDialog
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedExperiment(null);
        }}
        experiment={selectedExperiment}
        inputMetrics={inputMetrics}
        outputMetrics={outputMetrics}
      />

      <ExperimentResultsDialog
        isOpen={showResultsDialog}
        onClose={() => setShowResultsDialog(false)}
        results={selectedResults}
      />
    </div>
  );
}