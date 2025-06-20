/*
  # Fix Community Findings Schema

  1. Schema Updates
    - Add missing columns to `community_findings` table:
      - `share_data` (boolean, whether user allows data sharing)
      - `chart_config` (jsonb, chart configuration data)
      - `experiment_id` (uuid, optional reference to experiment)

  2. Notes
    - These columns are referenced in the application code but missing from the original migration
    - Adding them with appropriate defaults and constraints
*/

-- Add missing columns to community_findings table
DO $$
BEGIN
  -- Add share_data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_findings' AND column_name = 'share_data'
  ) THEN
    ALTER TABLE community_findings ADD COLUMN share_data BOOLEAN DEFAULT false;
  END IF;

  -- Add chart_config column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_findings' AND column_name = 'chart_config'
  ) THEN
    ALTER TABLE community_findings ADD COLUMN chart_config JSONB;
  END IF;

  -- Add experiment_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_findings' AND column_name = 'experiment_id'
  ) THEN
    ALTER TABLE community_findings ADD COLUMN experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for experiment_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_community_findings_experiment_id ON community_findings(experiment_id);