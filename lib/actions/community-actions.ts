'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface CreateFindingData {
  title: string;
  content: string;
  share_data: boolean;
  chart_config?: any;
  experiment_id?: string;
}

// Updated signature for useFormState compatibility
export async function createFindingAction(
  prevState: { message: string },
  formData: FormData
) {
  console.log('🚀 [createFindingAction] Starting server action with FormData');

  try {
    // Create authenticated Supabase client
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ [createFindingAction] Authentication failed:', userError);
      return { message: 'You must be logged in to create a finding' };
    }

    console.log('✅ [createFindingAction] User authenticated:', user.id);

    // Extract data from FormData
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const shareData = formData.get('shareData') === 'on'; // Checkbox value is 'on' when checked
    const chartConfigStr = formData.get('chartConfig') as string;
    const experimentId = formData.get('experimentId') as string;

    // Validate required fields
    if (!title?.trim()) {
      return { message: 'Title is required' };
    }
    if (!content?.trim()) {
      return { message: 'Content is required' };
    }

    // Parse chart config if provided
    let chartConfig = null;
    if (chartConfigStr) {
      try {
        chartConfig = JSON.parse(chartConfigStr);
      } catch (error) {
        console.error('❌ [createFindingAction] Invalid chart config JSON:', error);
        return { message: 'Invalid chart configuration' };
      }
    }

    console.log('📝 [createFindingAction] Extracted form data:', {
      title: title.trim(),
      content_length: content.trim().length,
      share_data: shareData,
      has_chart_config: !!chartConfig,
      has_experiment_id: !!experimentId
    });

    // Step 1: Create the finding in the database
    console.log('📝 [createFindingAction] Step 1: Creating finding in database...');
    
    const insertData = {
      author_id: user.id, // Associate with the authenticated user
      title: title.trim(),
      content: content.trim(),
      share_data: shareData,
      chart_config: chartConfig,
      experiment_id: experimentId || null
    };

    const { data: newFinding, error: insertError } = await supabase
      .from('community_findings')
      .insert(insertData)
      .select(`
        id,
        author_id,
        title,
        content,
        status,
        upvotes,
        downvotes,
        share_data,
        chart_config,
        experiment_id,
        created_at,
        updated_at
      `)
      .single();

    if (insertError) {
      console.error('❌ [createFindingAction] Database insert failed:', insertError);
      return { message: `Failed to create finding: ${insertError.message}` };
    }

    console.log('✅ [createFindingAction] Finding created successfully:', {
      id: newFinding.id,
      title: newFinding.title
    });

    // Step 2: Revalidate the community page cache to show the new finding
    console.log('🔄 [createFindingAction] Step 2: Revalidating community page cache...');
    revalidatePath('/community');
    console.log('✅ [createFindingAction] Cache revalidated for /community');

    // Step 3: Redirect to the new finding's detail page
    console.log(`🎯 [createFindingAction] Step 3: Redirecting to /community/${newFinding.id}`);
    redirect(`/community/${newFinding.id}`);

  } catch (error) {
    console.error('❌ [createFindingAction] Server action failed:', error);
    return { message: 'An unexpected error occurred while creating the finding' };
  }
}

export interface ShareFindingData {
  type: 'chart' | 'experiment';
  title: string;
  content: string;
  share_data: boolean;
  // For chart context
  primaryMetricId?: string;
  comparisonMetricId?: string | null;
  dateRange?: number;
  // For experiment context
  experimentId?: string;
}

export async function shareFindingAction(data: ShareFindingData) {
  console.log('🚀 [shareFindingAction] Starting share finding action with data:', {
    type: data.type,
    title: data.title,
    content_length: data.content.length,
    share_data: data.share_data
  });

  try {
    // Create authenticated Supabase client
    const supabase = createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ [shareFindingAction] Authentication failed:', userError);
      throw new Error('You must be logged in to share a finding');
    }

    console.log('✅ [shareFindingAction] User authenticated:', user.id);

    // Prepare the finding data based on context type
    const insertData = {
      author_id: user.id,
      title: data.title,
      content: data.content,
      share_data: data.share_data,
      chart_config: null as any,
      experiment_id: null as string | null
    };

    // Add context-specific data
    if (data.type === 'chart') {
      insertData.chart_config = {
        primaryMetricId: data.primaryMetricId,
        comparisonMetricId: data.comparisonMetricId,
        dateRange: data.dateRange
      };
    } else if (data.type === 'experiment') {
      insertData.experiment_id = data.experimentId || null;
    }

    console.log('📝 [shareFindingAction] Creating finding in database...');

    const { data: newFinding, error: insertError } = await supabase
      .from('community_findings')
      .insert(insertData)
      .select(`
        id,
        author_id,
        title,
        content,
        status,
        upvotes,
        downvotes,
        share_data,
        chart_config,
        experiment_id,
        created_at,
        updated_at
      `)
      .single();

    if (insertError) {
      console.error('❌ [shareFindingAction] Database insert failed:', insertError);
      throw new Error(`Failed to share finding: ${insertError.message}`);
    }

    console.log('✅ [shareFindingAction] Finding shared successfully:', {
      id: newFinding.id,
      title: newFinding.title
    });

    // Revalidate the community page cache
    console.log('🔄 [shareFindingAction] Revalidating community page cache...');
    revalidatePath('/community');
    console.log('✅ [shareFindingAction] Cache revalidated for /community');

    // Return the new finding data instead of redirecting
    // This allows the client to handle the success state
    return {
      success: true,
      finding: newFinding
    };

  } catch (error) {
    console.error('❌ [shareFindingAction] Server action failed:', error);
    throw error; // Re-throw to be handled by the client
  }
}

// --- VOTE ACTION ---
export async function castVoteAction(
  userId: string,
  findingId: string,
  voteType: 'upvote' | 'downvote'
) {
  console.log('🗳️ [castVoteAction] Starting vote action:', { userId, findingId, voteType });

  if (!userId || !findingId) {
    return { error: 'User and Finding ID are required.' };
  }

  try {
    // Create authenticated Supabase client
    const supabase = createClient();
    
    // Get the current user to verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user || user.id !== userId) {
      console.error('❌ [castVoteAction] Authentication failed:', userError);
      return { error: 'You must be logged in to vote.' };
    }

    console.log('✅ [castVoteAction] User authenticated:', user.id);

    // First, check if user has already voted
    console.log('🔍 [castVoteAction] Checking for existing vote...');
    const { data: existingVote, error: fetchError } = await supabase
      .from('finding_votes')
      .select('*')
      .eq('user_id', userId)
      .eq('finding_id', findingId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ [castVoteAction] Error checking existing vote:', fetchError);
      return { error: `Failed to check existing vote: ${fetchError.message}` };
    }

    console.log('📊 [castVoteAction] Existing vote check result:', { existingVote, fetchError: fetchError?.code });

    if (existingVote) {
      console.log('🔄 [castVoteAction] User has existing vote:', existingVote.vote_type);
      
      if (existingVote.vote_type === voteType) {
        // User clicked the same vote type - remove the vote
        console.log('🗑️ [castVoteAction] Removing existing vote (same type clicked)');
        const { error: deleteError } = await supabase
          .from('finding_votes')
          .delete()
          .eq('user_id', userId)
          .eq('finding_id', findingId);

        if (deleteError) {
          console.error('❌ [castVoteAction] Error removing vote:', deleteError);
          return { error: `Failed to remove vote: ${deleteError.message}` };
        }
        console.log('✅ [castVoteAction] Vote removed successfully');
      } else {
        // User clicked different vote type - update the vote
        console.log('🔄 [castVoteAction] Updating vote type from', existingVote.vote_type, 'to', voteType);
        const { error: updateError } = await supabase
          .from('finding_votes')
          .update({ vote_type: voteType })
          .eq('user_id', userId)
          .eq('finding_id', findingId);

        if (updateError) {
          console.error('❌ [castVoteAction] Error updating vote:', updateError);
          return { error: `Failed to update vote: ${updateError.message}` };
        }
        console.log('✅ [castVoteAction] Vote updated successfully');
      }
    } else {
      // No existing vote - create new vote
      console.log('➕ [castVoteAction] Creating new vote');
      const { error: insertError } = await supabase
        .from('finding_votes')
        .insert({
          user_id: userId,
          finding_id: findingId,
          vote_type: voteType
        });

      if (insertError) {
        console.error('❌ [castVoteAction] Error creating vote:', insertError);
        return { error: `Failed to create vote: ${insertError.message}` };
      }
      console.log('✅ [castVoteAction] New vote created successfully');
    }

    // Call the vote-processor Edge Function to update cached counts
    console.log('🚀 [castVoteAction] Calling vote-processor Edge Function...');
    try {
      const { data, error } = await supabase.functions.invoke('vote-processor', {
        body: { finding_id: findingId }
      });

      if (error) {
        console.error('❌ [castVoteAction] Edge function error:', error);
        // Don't return error here - the vote was still recorded, just the cache update failed
      } else {
        console.log('✅ [castVoteAction] Vote counts updated successfully via Edge Function:', data);
      }
    } catch (error) {
      console.error('❌ [castVoteAction] Error calling vote-processor Edge Function:', error);
      // Don't return error here - the vote was still recorded
    }

    // Revalidate the cache for the pages
    console.log('🔄 [castVoteAction] Revalidating page cache...');
    revalidatePath(`/community/${findingId}`);
    revalidatePath('/community');
    console.log('✅ [castVoteAction] Cache revalidated');

    console.log('🎉 [castVoteAction] Vote process completed successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ [castVoteAction] Server action failed:', error);
    return { error: 'An unexpected error occurred while voting.' };
  }
}

// --- REPORT ACTION ---
export async function reportFindingAction(
  userId: string,
  findingId: string,
  reason: string
) {
  console.log('🚨 [reportFindingAction] Starting report action:', { userId, findingId, reason });

  if (!userId || !findingId) {
    return { error: 'User and Finding ID are required.' };
  }

  try {
    // Create authenticated Supabase client
    const supabase = createClient();
    
    // Get the current user to verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user || user.id !== userId) {
      console.error('❌ [reportFindingAction] Authentication failed:', userError);
      return { error: 'You must be logged in to report a finding.' };
    }

    console.log('✅ [reportFindingAction] User authenticated:', user.id);

    // Insert the report into the database
    console.log('📝 [reportFindingAction] Creating report in database...');
    const { error: insertError } = await supabase
      .from('finding_reports')
      .insert({
        user_id: userId,
        finding_id: findingId,
        reason: reason || null
      });

    if (insertError) {
      console.error('❌ [reportFindingAction] Error creating report:', insertError);
      return { error: `Failed to report finding: ${insertError.message}` };
    }

    console.log('✅ [reportFindingAction] Report created successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ [reportFindingAction] Server action failed:', error);
    return { error: 'An unexpected error occurred while reporting the finding.' };
  }
}