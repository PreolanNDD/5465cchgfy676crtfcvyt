/*
  # Add sharing functionality to community findings

  1. Schema Changes
    - Add `share_data` boolean column to community_findings table
    - Add `chart_config` jsonb column for storing chart/data context
    - Add `experiment_id` uuid column for linking to experiments

  2. Notes
    - chart_config will store metric IDs, date ranges, and other chart context
    - experiment_id will link directly to experiments table
    - share_data indicates if user wants to share anonymized data
*/

-- Add new columns to community_findings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_findings' AND column_name = 'share_data'
  ) THEN
    ALTER TABLE community_findings ADD COLUMN share_data BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_findings' AND column_name = 'chart_config'
  ) THEN
    ALTER TABLE community_findings ADD COLUMN chart_config JSONB;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_findings' AND column_name = 'experiment_id'
  ) THEN
    ALTER TABLE community_findings ADD COLUMN experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for experiment_id lookups
CREATE INDEX IF NOT EXISTS idx_community_findings_experiment_id ON community_findings(experiment_id);