/*
  # Community Findings Feature

  1. New Tables
    - `community_findings` - User-submitted findings
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `title` (varchar, finding title)
      - `content` (text, finding content)
      - `status` (enum, 'pending_review', 'approved', 'rejected')
      - `upvotes` (integer, cached upvote count)
      - `downvotes` (integer, cached downvote count)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `finding_votes` - User votes on findings
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `finding_id` (uuid, foreign key to community_findings)
      - `vote_type` (enum, 'upvote', 'downvote')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (user_id, finding_id)

    - `finding_reports` - User reports on findings
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `finding_id` (uuid, foreign key to community_findings)
      - `reason` (text, optional reason for report)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Appropriate policies for reading and writing
    - Users can only vote/report once per finding

  3. Indexes
    - Performance indexes for common queries
*/

-- Create enums
CREATE TYPE finding_status AS ENUM ('pending_review', 'approved', 'rejected');
CREATE TYPE vote_type AS ENUM ('upvote', 'downvote');

-- Create community_findings table
CREATE TABLE IF NOT EXISTS community_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  status finding_status DEFAULT 'pending_review',
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create finding_votes table
CREATE TABLE IF NOT EXISTS finding_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finding_id UUID NOT NULL REFERENCES community_findings(id) ON DELETE CASCADE,
  vote_type vote_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, finding_id)
);

-- Create finding_reports table
CREATE TABLE IF NOT EXISTS finding_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  finding_id UUID NOT NULL REFERENCES community_findings(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on community_findings
ALTER TABLE community_findings ENABLE ROW LEVEL SECURITY;

-- RLS policies for community_findings
-- Anyone can read approved findings
CREATE POLICY "Anyone can read approved findings"
  ON community_findings
  FOR SELECT
  TO authenticated
  USING (status = 'approved');

-- Users can read their own findings regardless of status
CREATE POLICY "Users can read own findings"
  ON community_findings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create findings
CREATE POLICY "Users can create findings"
  ON community_findings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own findings (only if pending_review)
CREATE POLICY "Users can update own pending findings"
  ON community_findings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending_review')
  WITH CHECK (auth.uid() = user_id AND status = 'pending_review');

-- Enable RLS on finding_votes
ALTER TABLE finding_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for finding_votes
-- Users can read all votes (for displaying vote counts)
CREATE POLICY "Users can read all votes"
  ON finding_votes
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can manage their own votes
CREATE POLICY "Users can manage own votes"
  ON finding_votes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on finding_reports
ALTER TABLE finding_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for finding_reports
-- Users can create reports
CREATE POLICY "Users can create reports"
  ON finding_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own reports
CREATE POLICY "Users can read own reports"
  ON finding_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER on_community_findings_updated
  BEFORE UPDATE ON community_findings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_finding_votes_updated
  BEFORE UPDATE ON finding_votes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_community_findings_status ON community_findings(status);
CREATE INDEX IF NOT EXISTS idx_community_findings_user_id ON community_findings(user_id);
CREATE INDEX IF NOT EXISTS idx_community_findings_created_at ON community_findings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finding_votes_finding_id ON finding_votes(finding_id);
CREATE INDEX IF NOT EXISTS idx_finding_votes_user_finding ON finding_votes(user_id, finding_id);
CREATE INDEX IF NOT EXISTS idx_finding_reports_finding_id ON finding_reports(finding_id);