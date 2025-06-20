import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface VoteProcessorRequest {
  finding_id: string
}

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { finding_id }: VoteProcessorRequest = await req.json()

    if (!finding_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: finding_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔄 [vote-processor] Processing votes for finding: ${finding_id}`)

    // Get current vote counts from the finding_votes table
    const { data: votes, error: votesError } = await supabase
      .from('finding_votes')
      .select('vote_type')
      .eq('finding_id', finding_id)

    if (votesError) {
      console.error('❌ [vote-processor] Error fetching votes:', votesError)
      throw votesError
    }

    // Calculate vote counts
    const upvotes = votes?.filter(vote => vote.vote_type === 'upvote').length || 0
    const downvotes = votes?.filter(vote => vote.vote_type === 'downvote').length || 0

    console.log(`📊 [vote-processor] Calculated counts - Upvotes: ${upvotes}, Downvotes: ${downvotes}`)

    // Update the cached counts in the community_findings table
    const { error: updateError } = await supabase
      .from('community_findings')
      .update({ 
        upvotes: upvotes,
        downvotes: downvotes 
      })
      .eq('id', finding_id)

    if (updateError) {
      console.error('❌ [vote-processor] Error updating cached counts:', updateError)
      throw updateError
    }

    console.log(`✅ [vote-processor] Successfully updated cached counts for finding: ${finding_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        finding_id,
        upvotes,
        downvotes,
        total_votes: upvotes + downvotes
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 [vote-processor] Critical error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})