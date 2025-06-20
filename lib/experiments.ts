import { supabase } from './supabase';
import { TrackableItem } from './types';

export interface Experiment {
  id: string;
  user_id: string;
  title: string;
  hypothesis: string;
  independent_variable_id: string;
  dependent_variable_id: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'COMPLETED';
  created_at: string;
  updated_at: string;
  independent_variable?: TrackableItem;
  dependent_variable?: TrackableItem;
}

export interface ExperimentResults {
  experiment: Experiment;
  positiveConditionAverage: number | null;
  negativeConditionAverage: number | null;
  positiveConditionCount: number;
  negativeConditionCount: number;
  totalDays: number;
  daysWithData: number;
}

export async function getExperiments(userId: string): Promise<Experiment[]> {
  console.log('Fetching experiments for user:', userId);
  
  const { data, error } = await supabase
    .from('experiments')
    .select(`
      *,
      independent_variable:trackable_items!experiments_independent_variable_id_fkey(*),
      dependent_variable:trackable_items!experiments_dependent_variable_id_fkey(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching experiments:', error);
    throw new Error(`Failed to fetch experiments: ${error.message}`);
  }

  console.log('Fetched experiments:', data?.length || 0);
  return data || [];
}

export async function createExperiment(experiment: Omit<Experiment, 'id' | 'created_at' | 'updated_at'>): Promise<Experiment> {
  console.log('Creating experiment:', experiment);
  
  const { data, error } = await supabase
    .from('experiments')
    .insert(experiment)
    .select(`
      *,
      independent_variable:trackable_items!experiments_independent_variable_id_fkey(*),
      dependent_variable:trackable_items!experiments_dependent_variable_id_fkey(*)
    `)
    .single();

  if (error) {
    console.error('Error creating experiment:', error);
    throw new Error(`Failed to create experiment: ${error.message}`);
  }

  console.log('Created experiment:', data);
  return data;
}

export async function updateExperiment(id: string, updates: Partial<Omit<Experiment, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<Experiment> {
  console.log('Updating experiment:', id, 'with updates:', updates);
  
  const { data, error } = await supabase
    .from('experiments')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      independent_variable:trackable_items!experiments_independent_variable_id_fkey(*),
      dependent_variable:trackable_items!experiments_dependent_variable_id_fkey(*)
    `)
    .single();

  if (error) {
    console.error('Error updating experiment:', error);
    throw new Error(`Failed to update experiment: ${error.message}`);
  }

  console.log('Updated experiment:', data);
  return data;
}

export async function updateExperimentStatus(id: string, status: 'ACTIVE' | 'COMPLETED'): Promise<Experiment> {
  console.log('Updating experiment status:', id, 'to', status);
  
  const { data, error } = await supabase
    .from('experiments')
    .update({ status })
    .eq('id', id)
    .select(`
      *,
      independent_variable:trackable_items!experiments_independent_variable_id_fkey(*),
      dependent_variable:trackable_items!experiments_dependent_variable_id_fkey(*)
    `)
    .single();

  if (error) {
    console.error('Error updating experiment status:', error);
    throw new Error(`Failed to update experiment status: ${error.message}`);
  }

  console.log('Updated experiment status:', data);
  return data;
}

export async function analyzeExperimentResults(experiment: Experiment): Promise<ExperimentResults> {
  console.log('Analyzing experiment results for:', experiment.id);
  
  // Fetch all logged entries for both variables during the experiment period
  const { data: entries, error } = await supabase
    .from('logged_entries')
    .select('entry_date, trackable_item_id, numeric_value, boolean_value')
    .eq('user_id', experiment.user_id)
    .in('trackable_item_id', [experiment.independent_variable_id, experiment.dependent_variable_id])
    .gte('entry_date', experiment.start_date)
    .lte('entry_date', experiment.end_date)
    .order('entry_date', { ascending: true });

  if (error) {
    console.error('Error fetching experiment data:', error);
    throw new Error(`Failed to fetch experiment data: ${error.message}`);
  }

  // Group entries by date
  const entriesByDate = new Map<string, Map<string, number>>();
  entries?.forEach(entry => {
    let value: number | null = null;
    
    if (entry.numeric_value !== null && entry.numeric_value !== undefined) {
      value = entry.numeric_value;
    } else if (entry.boolean_value !== null && entry.boolean_value !== undefined) {
      value = entry.boolean_value ? 1 : 0;
    }

    if (value !== null) {
      if (!entriesByDate.has(entry.entry_date)) {
        entriesByDate.set(entry.entry_date, new Map());
      }
      entriesByDate.get(entry.entry_date)!.set(entry.trackable_item_id, value);
    }
  });

  // Analyze the data
  const positiveConditionValues: number[] = [];
  const negativeConditionValues: number[] = [];
  let daysWithData = 0;

  entriesByDate.forEach((dayEntries, date) => {
    const independentValue = dayEntries.get(experiment.independent_variable_id);
    const dependentValue = dayEntries.get(experiment.dependent_variable_id);

    // Only analyze days where both variables have data
    if (independentValue !== undefined && dependentValue !== undefined) {
      daysWithData++;
      
      // Determine if this is a positive or negative condition
      // For boolean: 1 = positive, 0 = negative
      // For numeric/scale: above median = positive, below/equal median = negative
      let isPositiveCondition = false;
      
      if (experiment.independent_variable?.type === 'BOOLEAN') {
        isPositiveCondition = independentValue === 1;
      } else {
        // For numeric/scale variables, we need to determine the threshold
        // For now, we'll use a simple approach: above 5 for scale 1-10, above 0 for numeric
        if (experiment.independent_variable?.type === 'SCALE_1_10') {
          isPositiveCondition = independentValue > 5;
        } else {
          isPositiveCondition = independentValue > 0;
        }
      }

      if (isPositiveCondition) {
        positiveConditionValues.push(dependentValue);
      } else {
        negativeConditionValues.push(dependentValue);
      }
    }
  });

  // Calculate averages
  const positiveConditionAverage = positiveConditionValues.length > 0
    ? positiveConditionValues.reduce((sum, val) => sum + val, 0) / positiveConditionValues.length
    : null;

  const negativeConditionAverage = negativeConditionValues.length > 0
    ? negativeConditionValues.reduce((sum, val) => sum + val, 0) / negativeConditionValues.length
    : null;

  // Calculate total days in experiment
  const startDate = new Date(experiment.start_date);
  const endDate = new Date(experiment.end_date);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const results: ExperimentResults = {
    experiment,
    positiveConditionAverage,
    negativeConditionAverage,
    positiveConditionCount: positiveConditionValues.length,
    negativeConditionCount: negativeConditionValues.length,
    totalDays,
    daysWithData
  };

  console.log('Experiment analysis results:', results);
  return results;
}

export async function deleteExperiment(id: string): Promise<void> {
  console.log('Deleting experiment:', id);
  
  const { error } = await supabase
    .from('experiments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting experiment:', error);
    throw new Error(`Failed to delete experiment: ${error.message}`);
  }

  console.log('Deleted experiment:', id);
}