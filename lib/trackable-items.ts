import { supabase } from './supabase';
import { TrackableItem } from './types';

export async function getTrackableItems(userId: string): Promise<TrackableItem[]> {
  console.log('Fetching trackable items for user:', userId);
  
  const { data, error } = await supabase
    .from('trackable_items')
    .select('id, user_id, name, category, type, is_active, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching trackable items:', error);
    throw new Error(`Failed to fetch trackable items: ${error.message}`);
  }

  console.log('Fetched trackable items:', data?.length || 0);
  return data || [];
}

export async function getArchivedTrackableItems(userId: string): Promise<TrackableItem[]> {
  console.log('Fetching archived trackable items for user:', userId);
  
  const { data, error } = await supabase
    .from('trackable_items')
    .select('id, user_id, name, category, type, is_active, created_at')
    .eq('user_id', userId)
    .eq('is_active', false)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching archived trackable items:', error);
    throw new Error(`Failed to fetch archived trackable items: ${error.message}`);
  }

  console.log('Fetched archived trackable items:', data?.length || 0);
  return data || [];
}

export async function getAllTrackableItems(userId: string): Promise<TrackableItem[]> {
  console.log('Fetching all trackable items for user:', userId);
  
  const { data, error } = await supabase
    .from('trackable_items')
    .select('id, user_id, name, category, type, is_active, created_at')
    .eq('user_id', userId)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching all trackable items:', error);
    throw new Error(`Failed to fetch all trackable items: ${error.message}`);
  }

  console.log('Fetched all trackable items:', data?.length || 0);
  return data || [];
}

export async function findExistingMetricByName(userId: string, name: string): Promise<TrackableItem | null> {
  console.log('Searching for existing metric by name:', name, 'for user:', userId);
  
  const { data, error } = await supabase
    .from('trackable_items')
    .select('id, user_id, name, category, type, is_active, created_at')
    .eq('user_id', userId)
    .ilike('name', name.trim()) // Case-insensitive search
    .single();

  if (error) {
    // If no match found, that's expected - return null
    if (error.code === 'PGRST116') {
      console.log('No existing metric found with name:', name);
      return null;
    }
    console.error('Error searching for existing metric:', error);
    throw new Error(`Failed to search for existing metric: ${error.message}`);
  }

  console.log('Found existing metric:', data);
  return data;
}

export async function createTrackableItem(item: Omit<TrackableItem, 'id' | 'created_at'>): Promise<TrackableItem> {
  console.log('Creating trackable item:', item);
  
  const { data, error } = await supabase
    .from('trackable_items')
    .insert(item)
    .select('id, user_id, name, category, type, is_active, created_at')
    .single();

  if (error) {
    console.error('Error creating trackable item:', error);
    throw new Error(`Failed to create trackable item: ${error.message}`);
  }

  console.log('Created trackable item:', data);
  return data;
}

export async function updateTrackableItem(id: string, updates: Partial<TrackableItem>): Promise<TrackableItem> {
  console.log('Updating trackable item:', id, 'with updates:', updates);
  
  const { data, error } = await supabase
    .from('trackable_items')
    .update(updates)
    .eq('id', id)
    .select('id, user_id, name, category, type, is_active, created_at')
    .single();

  if (error) {
    console.error('Error updating trackable item:', error);
    throw new Error(`Failed to update trackable item: ${error.message}`);
  }

  console.log('Updated trackable item:', data);
  return data;
}

export async function reactivateTrackableItem(id: string): Promise<TrackableItem> {
  console.log('Reactivating trackable item:', id);
  
  const { data, error } = await supabase
    .from('trackable_items')
    .update({ is_active: true })
    .eq('id', id)
    .select('id, user_id, name, category, type, is_active, created_at')
    .single();

  if (error) {
    console.error('Error reactivating trackable item:', error);
    throw new Error(`Failed to reactivate trackable item: ${error.message}`);
  }

  console.log('Reactivated trackable item:', data);
  return data;
}

export async function deleteTrackableItem(id: string): Promise<void> {
  console.log('Archiving trackable item:', id);
  
  const { error } = await supabase
    .from('trackable_items')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error archiving trackable item:', error);
    throw new Error(`Failed to delete trackable item: ${error.message}`);
  }

  console.log('Archived trackable item:', id);
}

export async function permanentlyDeleteTrackableItem(id: string): Promise<void> {
  console.log('1. Attempting to permanently delete trackable item with ID:', id);
  
  const { error } = await supabase
    .from('trackable_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('2. Permanent deletion failed with error:', error);
    throw new Error(`Failed to permanently delete trackable item: ${error.message}`);
  }

  console.log('2. Permanent deletion completed successfully');
}