/*
  # Fix Community Findings Schema

  1. Schema Updates
    - Add missing columns to community_findings table:
      - `share_data` (boolean, default false)
      - `chart_config` (jsonb, nullable)
      - `experiment_id` (uuid, nullable, foreign key to experiments)
    
  2. Security
    - Update RLS policies to handle new columns
    
  3. Notes
    - Uses IF NOT EXISTS checks to prevent errors if columns already exist
    - Maintains backward compatibility
*/

-- Add missing columns to community_findings table if they don't exist
DO $$
BEGIN
  -- Add share_data column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_findings' AND column_name = 'share_data'
  ) THEN
    ALTER TABLE community_findings ADD COLUMN share_data BOOLEAN DEFAULT false;
  END IF;

  -- Add chart_config column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_findings' AND column_name = 'chart_config'
  ) THEN
    ALTER TABLE community_findings ADD COLUMN chart_config JSONB;
  END IF;

  -- Add experiment_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_findings' AND column_name = 'experiment_id'
  ) THEN
    ALTER TABLE community_findings ADD COLUMN experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for experiment_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_community_findings_experiment_id ON community_findings(experiment_id);

-- Update RLS policies to ensure they work with new columns
-- Drop and recreate the insert policy to include new columns
DROP POLICY IF EXISTS "Users can create findings" ON community_findings;
CREATE POLICY "Users can create findings"
  ON community_findings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Drop and recreate the update policy to include new columns
DROP POLICY IF EXISTS "Users can update own pending findings" ON community_findings;
CREATE POLICY "Users can update own pending findings"
  ON community_findings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending_review')
  WITH CHECK (auth.uid() = user_id AND status = 'pending_review');