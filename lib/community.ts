import { supabase } from './supabase';

export interface CommunityFinding {
  id: string;
  author_id: string;
  title: string;
  content: string;
  status: 'visible' | 'hidden_by_community';
  upvotes: number;
  downvotes: number;
  share_data: boolean;
  chart_config: any | null;
  experiment_id: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface FindingVote {
  id: string;
  user_id: string;
  finding_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
  updated_at: string;
}

export interface FindingReport {
  id: string;
  user_id: string;
  finding_id: string;
  reason: string | null;
  created_at: string;
}

export async function getCommunityFindings(): Promise<CommunityFinding[]> {
  console.log('Fetching community findings');
  
  // First, fetch the findings (only visible ones)
  const { data: findings, error: findingsError } = await supabase
    .from('community_findings')
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
    .eq('status', 'visible')
    .order('created_at', { ascending: false });

  if (findingsError) {
    console.error('Error fetching community findings:', findingsError);
    throw new Error(`Failed to fetch community findings: ${findingsError.message}`);
  }

  if (!findings || findings.length === 0) {
    console.log('No community findings found');
    return [];
  }

  // Get unique user IDs
  const userIds = Array.from(new Set(findings.map(finding => finding.author_id)));
  
  // Fetch user details
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .in('id', userIds);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    // Don't throw here, just continue without author details
  }

  // Create a map of user details for quick lookup
  const userMap = new Map();
  if (users) {
    users.forEach(user => {
      userMap.set(user.id, {
        first_name: user.first_name,
        last_name: user.last_name
      });
    });
  }

  // Merge findings with author details
  const transformedData = findings.map(finding => ({
    ...finding,
    author: userMap.get(finding.author_id) || undefined
  }));

  console.log('Fetched community findings:', transformedData.length);
  return transformedData;
}

export async function getCommunityFindingById(findingId: string): Promise<CommunityFinding | null> {
  console.log('Fetching community finding by ID:', findingId);
  
  // Fetch the finding
  const { data: finding, error: findingError } = await supabase
    .from('community_findings')
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
    .eq('id', findingId)
    .eq('status', 'visible')
    .single();

  if (findingError) {
    if (findingError.code === 'PGRST116') {
      console.log('Finding not found:', findingId);
      return null;
    }
    console.error('Error fetching finding:', findingError);
    throw new Error(`Failed to fetch finding: ${findingError.message}`);
  }

  if (!finding) {
    console.log('No finding found with ID:', findingId);
    return null;
  }

  // Fetch author details
  const { data: author, error: authorError } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('id', finding.author_id)
    .single();

  if (authorError) {
    console.error('Error fetching author:', authorError);
    // Continue without author details
  }

  const transformedData = {
    ...finding,
    author: author ? {
      first_name: author.first_name,
      last_name: author.last_name
    } : undefined
  };

  console.log('Fetched finding:', transformedData);
  return transformedData;
}

export async function getUserFindings(userId: string): Promise<CommunityFinding[]> {
  console.log('Fetching user findings for:', userId);
  
  // Fetch all findings by the user (any status)
  const { data: findings, error: findingsError } = await supabase
    .from('community_findings')
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
    .eq('author_id', userId)
    .order('created_at', { ascending: false });

  if (findingsError) {
    console.error('Error fetching user findings:', findingsError);
    throw new Error(`Failed to fetch user findings: ${findingsError.message}`);
  }

  if (!findings || findings.length === 0) {
    console.log('No user findings found');
    return [];
  }

  // For user's own findings, we don't need to fetch author details since it's the same user
  const transformedData = findings.map(finding => ({
    ...finding,
    author: undefined // We don't need author details for user's own findings
  }));

  console.log('Fetched user findings:', transformedData.length);
  return transformedData;
}

export async function getUserVotes(userId: string, findingIds: string[]): Promise<FindingVote[]> {
  if (findingIds.length === 0) return [];
  
  console.log('🗳️ [getUserVotes] Fetching user votes for findings:', { userId, findingIds });
  
  const { data, error } = await supabase
    .from('finding_votes')
    .select('*')
    .eq('user_id', userId)
    .in('finding_id', findingIds);

  if (error) {
    console.error('❌ [getUserVotes] Error fetching user votes:', error);
    throw new Error(`Failed to fetch user votes: ${error.message}`);
  }

  console.log('✅ [getUserVotes] Fetched user votes:', data?.length || 0, 'votes:', data);
  return data || [];
}

// Note: castVote and reportFinding functions have been moved to Server Actions
// They are no longer needed in this client-side library file
// The Server Actions handle all the database mutations with proper authentication

export async function createFinding(userId: string, title: string, content: string): Promise<CommunityFinding> {
  console.log('Creating finding:', { userId, title, content });
  
  const { data, error } = await supabase
    .from('community_findings')
    .insert({
      author_id: userId,
      title: title.trim(),
      content: content.trim()
      // No need to set status - database defaults to 'visible'
    })
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

  if (error) {
    console.error('Error creating finding:', error);
    throw new Error(`Failed to create finding: ${error.message}`);
  }

  console.log('Finding created successfully:', data);
  return {
    ...data,
    author: undefined // Author details not populated for creation operations
  };
}

export async function createFindingWithContext(findingData: {
  user_id: string;
  title: string;
  content: string;
  share_data: boolean;
  chart_config?: any;
  experiment_id?: string;
}): Promise<CommunityFinding> {
  console.log('Creating finding with context:', findingData);
  
  // Map user_id to author_id for the database insert
  const insertData = {
    author_id: findingData.user_id,
    title: findingData.title,
    content: findingData.content,
    share_data: findingData.share_data,
    chart_config: findingData.chart_config,
    experiment_id: findingData.experiment_id
    // No need to set status - database defaults to 'visible'
  };
  
  const { data, error } = await supabase
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

  if (error) {
    console.error('Error creating finding:', error);
    throw new Error(`Failed to create finding: ${error.message}`);
  }

  console.log('Finding created successfully:', data);
  return {
    ...data,
    author: undefined // Author details not populated for creation operations
  };
}