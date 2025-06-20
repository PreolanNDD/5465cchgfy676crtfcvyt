/*
  # Add missing updated_at column to community_findings table

  1. Schema Changes
    - Add `updated_at` column to community_findings table if it doesn't exist
    - Add trigger to automatically update the updated_at timestamp

  2. Notes
    - This fixes the missing updated_at column that should have been included in the original table creation
    - Uses IF NOT EXISTS to prevent errors if the column already exists
*/

-- Add updated_at column to community_findings table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_findings' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE community_findings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Add updated_at trigger for community_findings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_community_findings_updated'
  ) THEN
    CREATE TRIGGER on_community_findings_updated
      BEFORE UPDATE ON community_findings
      FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  END IF;
END $$;