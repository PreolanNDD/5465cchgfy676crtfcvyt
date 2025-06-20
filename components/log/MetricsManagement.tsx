'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { 
  getTrackableItems, 
  deleteTrackableItem, 
  reactivateTrackableItem, 
  permanentlyDeleteTrackableItem,
  createTrackableItem,
  updateTrackableItem,
  findExistingMetricByName
} from '@/lib/trackable-items';
import { TrackableItem, DataType, Category } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReactivateMetricDialog } from '@/components/trackable-items/ReactivateMetricDialog';
import { Edit2, Trash2, Target, TrendingUp, Plus, Loader2, RotateCw, X, Save, Check, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

export function MetricsManagement({ onRefresh }: { onRefresh?: () => void }) {
  const { user } = useAuth();
  
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard' | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '' as Category | '',
    type: '' as DataType | ''
  });
  const [editFormError, setEditFormError] = useState('');

  // Add metric form state
  const [addFormData, setAddFormData] = useState({
    name: '',
    category: '' as Category | '',
    type: '' as DataType | ''
  });
  const [addFormError, setAddFormError] = useState('');

  // Reactivation dialog state
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [metricToReactivate, setMetricToReactivate] = useState<TrackableItem | null>(null);
  const operationRef = useRef<string>('');

  const { 
    data: allTrackableItems,
    isLoading: loading,
    refetch
  } = useQuery<TrackableItem[]>({
    queryKey: ['allTrackableItems', user?.id],
    queryFn: async () => {
      // Fetch both active and archived items
      const { data, error } = await supabase
        .from('trackable_items')
        .select('id, user_id, name, category, type, is_active, created_at')
        .eq('user_id', user!.id)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch all trackable items: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!user,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; category: Category; type: DataType }) => {
      if (!user) throw new Error("User not found");
      
      const result = await createTrackableItem({
        user_id: user.id,
        name: data.name.trim(),
        category: data.category,
        type: data.type,
        is_active: true
      });
      
      return result;
    },
    onSuccess: () => {
      setAddFormData({ name: '', category: '', type: '' });
      setAddFormError('');
      queryClient.invalidateQueries({ queryKey: ['allTrackableItems', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['trackableItems', user?.id] });
      if (onRefresh) {
        onRefresh();
      }
    },
    onError: (error: any) => {
      if (error.message && (error.message.includes('duplicate') || error.message.includes('unique'))) {
        setAddFormError('You already have a metric with this name.');
      } else {
        setAddFormError(error.message || 'Failed to create metric');
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; category: Category; type: DataType }) => {
      const result = await updateTrackableItem(data.id, {
        name: data.name.trim(),
        category: data.category,
        type: data.type,
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTrackableItems', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['trackableItems', user?.id] });
      if (onRefresh) {
        onRefresh();
      }
      setEditingItemId(null);
      setEditFormData({ name: '', category: '', type: '' });
      setEditFormError('');
    },
    onError: (error: any) => {
      if (error.message && (error.message.includes('duplicate') || error.message.includes('unique'))) {
        setEditFormError('You already have a metric with this name.');
      } else {
        setEditFormError(error.message || 'Failed to update metric');
      }
    },
  });

  // Reactivate mutation
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => {
      return reactivateTrackableItem(id);
    },
    onSuccess: () => {
      setShowReactivateDialog(false);
      setMetricToReactivate(null);
      setAddFormData({ name: '', category: '', type: '' });
      setAddFormError('');
      queryClient.invalidateQueries({ queryKey: ['allTrackableItems', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['trackableItems', user?.id] });
      if (onRefresh) {
        onRefresh();
      }
    },
    onError: (error) => {
      setAddFormError(error.message || 'Failed to reactivate metric');
      setShowReactivateDialog(false);
      setMetricToReactivate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return deleteTrackableItem(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTrackableItems', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['trackableItems', user?.id] });
      if (onRefresh) {
        onRefresh();
      }
      setDeletingItemId(null);
      setDeleteMode(null);
    },
    onError: (error) => {
      alert(`Failed to archive metric: ${error.message}`);
      setDeletingItemId(null);
      setDeleteMode(null);
    },
  });
  
  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => {
      return permanentlyDeleteTrackableItem(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTrackableItems', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['trackableItems', user?.id] });
      if (onRefresh) {
        onRefresh();
      }
      setDeletingItemId(null);
      setDeleteMode(null);
    },
    onError: (error) => {
      alert(`Failed to permanently delete metric: ${error.message}`);
      setDeletingItemId(null);
      setDeleteMode(null);
    },
  });

  const checkForDuplicateName = useCallback((name: string, excludeId?: string): boolean => {
    if (!name.trim() || !allTrackableItems) return false;
    
    const trimmedName = name.trim().toLowerCase();
    
    return allTrackableItems.some(item => 
      item.id !== excludeId &&
      item.name.toLowerCase() === trimmedName
    );
  }, [allTrackableItems]);

  // Add metric handlers
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !addFormData.name || !addFormData.category || !addFormData.type) return;

    // Prevent multiple simultaneous operations
    if (createMutation.isPending || reactivateMutation.isPending) {
      return;
    }

    operationRef.current = 'checking';
    setAddFormError('');

    try {
      // First, search for any existing metric with this name (active or inactive)
      const existingMetric = await findExistingMetricByName(user.id, addFormData.name);
      
      if (existingMetric) {
        if (existingMetric.is_active) {
          // Scenario B: Active metric with same name exists
          setAddFormError('You already have a metric with this name.');
          return;
        } else {
          // Found an inactive metric - now check if category and type match
          const categoryMatches = existingMetric.category === addFormData.category;
          const typeMatches = existingMetric.type === addFormData.type;
          
          if (categoryMatches && typeMatches) {
            // Scenario A: Names match AND category/type are the same - offer reactivation
            setMetricToReactivate(existingMetric);
            setShowReactivateDialog(true);
            return;
          } else {
            // Scenario B: Names match BUT category or type is different - show error
            setAddFormError('A metric with this name already exists in your archive with a different type. Please choose a new name.');
            return;
          }
        }
      }

      // Scenario C: No existing metric found - create new one
      
      // Additional client-side check against active items (backup validation)
      if (checkForDuplicateName(addFormData.name)) {
        setAddFormError('You already have a metric with this name.');
        return;
      }

      operationRef.current = 'creating';
      createMutation.mutate({
        name: addFormData.name,
        category: addFormData.category as Category,
        type: addFormData.type as DataType,
      });

    } catch (err: any) {
      // Handle database constraint errors as well
      if (err.message && (err.message.includes('duplicate') || err.message.includes('unique'))) {
        setAddFormError('You already have a metric with this name.');
      } else {
        setAddFormError(err.message || 'Failed to create metric');
      }
    } finally {
      operationRef.current = '';
    }
  };

  const handleAddNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setAddFormData({ ...addFormData, name: newName });
    
    // Clear error if user is typing and no longer has a duplicate
    if (addFormError && !checkForDuplicateName(newName)) {
      setAddFormError('');
    }
  };

  // Edit metric handlers
  const handleEdit = useCallback((item: TrackableItem) => {
    setEditingItemId(item.id);
    setEditFormData({
      name: item.name,
      category: item.category,
      type: item.type
    });
    setEditFormError('');
    // Cancel any delete operations when editing
    setDeletingItemId(null);
    setDeleteMode(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingItemId(null);
    setEditFormData({ name: '', category: '', type: '' });
    setEditFormError('');
  }, []);

  const handleSaveEdit = useCallback(async (itemId: string) => {
    if (!editFormData.name || !editFormData.category || !editFormData.type) return;

    if (updateMutation.isPending) {
      return;
    }

    setEditFormError('');

    // Check for duplicate names (excluding the current item)
    if (checkForDuplicateName(editFormData.name, itemId)) {
      setEditFormError('You already have a metric with this name.');
      return;
    }

    updateMutation.mutate({
      id: itemId,
      name: editFormData.name,
      category: editFormData.category as Category,
      type: editFormData.type as DataType,
    });
  }, [editFormData, updateMutation, checkForDuplicateName]);

  // Delete handlers
  const handleDelete = useCallback((id: string) => {
    setDeletingItemId(id);
    setDeleteMode('soft');
    // Cancel any edit operations when deleting
    setEditingItemId(null);
    setEditFormData({ name: '', category: '', type: '' });
    setEditFormError('');
  }, []);
  
  const handleHardDelete = useCallback((id: string) => {
    setDeletingItemId(id);
    setDeleteMode('hard');
    // Cancel any edit operations when deleting
    setEditingItemId(null);
    setEditFormData({ name: '', category: '', type: '' });
    setEditFormError('');
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deletingItemId || !deleteMode) return;

    if (deleteMode === 'soft') {
      deleteMutation.mutate(deletingItemId);
    } else {
      hardDeleteMutation.mutate(deletingItemId);
    }
  }, [deletingItemId, deleteMode, deleteMutation, hardDeleteMutation]);

  const handleCancelDelete = useCallback(() => {
    setDeletingItemId(null);
    setDeleteMode(null);
  }, []);
  
  const handleReactivate = useCallback((id: string) => {
    reactivateMutation.mutate(id);
  }, [reactivateMutation]);

  const handleReactivateConfirm = () => {
    if (!metricToReactivate || reactivateMutation.isPending) {
      return;
    }

    operationRef.current = 'reactivating';
    reactivateMutation.mutate(metricToReactivate.id);
  };

  const handleReactivateClose = () => {
    if (reactivateMutation.isPending) {
      return;
    }
    setShowReactivateDialog(false);
    setMetricToReactivate(null);
  };

  const handleEditFormNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setEditFormData({ ...editFormData, name: newName });
    
    // Clear error if user is typing and no longer has a duplicate
    if (editFormError && !checkForDuplicateName(newName, editingItemId || undefined)) {
      setEditFormError('');
    }
  };

  if (loading || !allTrackableItems) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl text-primary-text">Manage Metrics</h2>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const activeItems = allTrackableItems.filter(item => item.is_active);
  const archivedItems = allTrackableItems.filter(item => !item.is_active);
  const itemsToDisplay = activeTab === 'active' ? activeItems : archivedItems;

  // Separate items by category
  const inputItems = itemsToDisplay.filter(item => item.category === 'INPUT');
  const outputItems = itemsToDisplay.filter(item => item.category === 'OUTPUT');

  const renderMetricCard = (item: TrackableItem) => {
    const isEditing = editingItemId === item.id;
    const isDeleting = deletingItemId === item.id;
    const isMutating = deleteMutation.isPending && deleteMutation.variables === item.id ||
                       hardDeleteMutation.isPending && hardDeleteMutation.variables === item.id ||
                       reactivateMutation.isPending && reactivateMutation.variables === item.id ||
                       updateMutation.isPending;
    
    return (
      <Card key={item.id} className={`${!item.is_active ? 'bg-gray-50 opacity-70' : ''} ${isEditing || isDeleting ? 'ring-2 ring-primary ring-opacity-30' : ''} transition-all duration-200`}>
        <CardContent className="p-3">
          {isDeleting ? (
            // Delete confirmation mode - expanded form
            <div className="space-y-4">
              <div className={`p-4 border rounded-lg ${deleteMode === 'hard' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${deleteMode === 'hard' ? 'text-red-600' : 'text-yellow-600'}`} />
                  <div className="flex-1">
                    <h4 className={`font-medium mb-2 ${deleteMode === 'hard' ? 'text-red-800' : 'text-yellow-800'}`}>
                      {deleteMode === 'hard' ? 'Permanently Delete Metric?' : 'Archive Metric?'}
                    </h4>
                    <p className={`text-sm mb-3 ${deleteMode === 'hard' ? 'text-red-700' : 'text-yellow-700'}`}>
                      {deleteMode === 'hard' 
                        ? `Are you sure you want to permanently delete "${item.name}"?`
                        : `Are you sure you want to archive "${item.name}"?`
                      }
                    </p>
                    {deleteMode === 'hard' && (
                      <p className="text-sm text-red-600 font-medium">
                        Warning: This action cannot be undone. All historical data for this metric will be permanently erased.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelDelete}
                  disabled={isMutating}
                  className="h-7 px-3 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmDelete}
                  disabled={isMutating}
                  loading={isMutating}
                  className={`h-7 px-3 text-xs ${deleteMode === 'hard' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                >
                  {deleteMode === 'hard' ? 'Delete Permanently' : 'Archive'}
                </Button>
              </div>
            </div>
          ) : isEditing ? (
            // Edit mode - expanded form
            <div className="space-y-4">
              {editFormError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {editFormError}
                </div>
              )}
              
              <Input
                label="Metric Name"
                value={editFormData.name}
                onChange={handleEditFormNameChange}
                placeholder="Enter metric name"
                disabled={isMutating}
                className="text-sm"
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-primary-text">Category</label>
                  <Select
                    value={editFormData.category}
                    onValueChange={(value: Category) => setEditFormData({ ...editFormData, category: value })}
                    disabled={isMutating}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-sm">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-primary-text">Type</label>
                  <Select
                    value={editFormData.type}
                    onValueChange={(value: DataType) => setEditFormData({ ...editFormData, type: value })}
                    disabled={isMutating}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DATA_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-sm">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isMutating}
                  className="h-7 px-2 text-xs"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveEdit(item.id)}
                  disabled={!editFormData.name || !editFormData.category || !editFormData.type || isMutating}
                  loading={updateMutation.isPending}
                  className="h-7 px-2 text-xs"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            // View mode - compact display
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-primary-text text-sm truncate">{item.name}</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">{DATA_TYPE_LABELS[item.type]}</Badge>
                </div>
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
                {isMutating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  item.is_active ? (
                    <>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(item)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleReactivate(item.id)}>
                        <RotateCw className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700" onClick={() => handleHardDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const isAddFormLoading = createMutation.isPending || reactivateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Manage Metrics Header */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-primary-text">Manage Metrics</h2>
        <p className="text-secondary-text">Create and organize your trackable metrics</p>
      </div>

      {/* Add Metric Container */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-heading text-lg text-primary-text">Add New Metric</h3>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            {addFormError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{addFormError}</p>
              </div>
            )}

            <Input
              label="Metric Name"
              value={addFormData.name}
              onChange={handleAddNameChange}
              placeholder="e.g., Sleep Quality, Caffeine Intake"
              required
              disabled={isAddFormLoading}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-primary-text">
                  Category
                </label>
                <Select
                  value={addFormData.category}
                  onValueChange={(value: Category) => setAddFormData({ ...addFormData, category: value })}
                  disabled={isAddFormLoading}
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
                  value={addFormData.type}
                  onValueChange={(value: DataType) => setAddFormData({ ...addFormData, type: value })}
                  disabled={isAddFormLoading}
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
            </div>

            <Button
              type="submit"
              loading={isAddFormLoading}
              disabled={!addFormData.name || !addFormData.category || !addFormData.type || isAddFormLoading}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Metric
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => {
            setActiveTab('active');
            handleCancelEdit(); // Cancel any ongoing edits when switching tabs
            handleCancelDelete(); // Cancel any ongoing deletes when switching tabs
          }}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'active'
              ? 'bg-white text-primary-text shadow-sm'
              : 'text-secondary-text hover:text-primary-text'
          }`}
        >
          Active ({activeItems.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('archived');
            handleCancelEdit(); // Cancel any ongoing edits when switching tabs
            handleCancelDelete(); // Cancel any ongoing deletes when switching tabs
          }}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'archived'
              ? 'bg-white text-primary-text shadow-sm'
              : 'text-secondary-text hover:text-primary-text'
          }`}
        >
          Archived ({archivedItems.length})
        </button>
      </div>

      {itemsToDisplay.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-secondary-text text-sm">
              {activeTab === 'archived' ? "No archived metrics." : "No active metrics created yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Input Metrics Section */}
          {inputItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent-1 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-heading text-lg text-primary-text">Input Metrics</h3>
                <Badge variant="secondary" className="text-xs">{inputItems.length}</Badge>
              </div>
              <div className="space-y-2 pl-11">
                {inputItems.map(renderMetricCard)}
              </div>
            </div>
          )}

          {/* Output Metrics Section */}
          {outputItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent-2 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-heading text-lg text-primary-text">Output Metrics</h3>
                <Badge variant="secondary" className="text-xs">{outputItems.length}</Badge>
              </div>
              <div className="space-y-2 pl-11">
                {outputItems.map(renderMetricCard)}
              </div>
            </div>
          )}

          {/* Show message if only one category has items */}
          {inputItems.length === 0 && outputItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-gray-400" />
                </div>
                <h3 className="font-heading text-lg text-gray-400">Input Metrics</h3>
                <Badge variant="outline" className="text-xs text-gray-400">0</Badge>
              </div>
              <div className="pl-11">
                <p className="text-sm text-secondary-text">No input metrics yet.</p>
              </div>
            </div>
          )}

          {outputItems.length === 0 && inputItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                <h3 className="font-heading text-lg text-gray-400">Output Metrics</h3>
                <Badge variant="outline" className="text-xs text-gray-400">0</Badge>
              </div>
              <div className="pl-11">
                <p className="text-sm text-secondary-text">No output metrics yet.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reactivate Metric Dialog */}
      <ReactivateMetricDialog
        isOpen={showReactivateDialog}
        onClose={handleReactivateClose}
        onConfirm={handleReactivateConfirm}
        metric={metricToReactivate}
        loading={reactivateMutation.isPending}
      />
    </div>
  );
}