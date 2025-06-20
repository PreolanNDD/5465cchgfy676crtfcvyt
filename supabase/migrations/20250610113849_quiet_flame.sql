/*
  # PIDMe Phase 2: Data Logging Tables

  1. New Tables
    - `trackable_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `name` (varchar, metric name like "Sleep Quality")
      - `category` (enum, 'INPUT' or 'OUTPUT')
      - `data_type` (enum, 'SCALE_1_10', 'NUMERIC', 'BOOLEAN', 'TEXT')
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `logged_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `trackable_item_id` (uuid, foreign key to trackable_items)
      - `entry_date` (date, the date this entry is for)
      - `numeric_value` (decimal, for numeric and scale data)
      - `text_value` (text, for text data)
      - `boolean_value` (boolean, for boolean data)
      - `notes` (text, optional notes)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own data
    - Proper foreign key constraints

  3. Indexes
    - Performance indexes for common queries
*/

-- Create enums for trackable items
CREATE TYPE trackable_category AS ENUM ('INPUT', 'OUTPUT');
CREATE TYPE trackable_data_type AS ENUM ('SCALE_1_10', 'NUMERIC', 'BOOLEAN', 'TEXT');

-- Create trackable_items table
CREATE TABLE IF NOT EXISTS trackable_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category trackable_category NOT NULL,
  data_type trackable_data_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create logged_entries table
CREATE TABLE IF NOT EXISTS logged_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trackable_item_id UUID NOT NULL REFERENCES trackable_items(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  numeric_value DECIMAL,
  text_value TEXT,
  boolean_value BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, trackable_item_id, entry_date)
);

-- Enable RLS on trackable_items
ALTER TABLE trackable_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for trackable_items
CREATE POLICY "Users can manage own trackable items"
  ON trackable_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable RLS on logged_entries
ALTER TABLE logged_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for logged_entries
CREATE POLICY "Users can manage own logged entries"
  ON logged_entries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for trackable_items
CREATE TRIGGER on_trackable_items_updated
  BEFORE UPDATE ON trackable_items
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Add updated_at trigger for logged_entries
CREATE TRIGGER on_logged_entries_updated
  BEFORE UPDATE ON logged_entries
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trackable_items_user_id ON trackable_items(user_id);
CREATE INDEX IF NOT EXISTS idx_trackable_items_user_active ON trackable_items(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_logged_entries_user_id ON logged_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_logged_entries_user_date ON logged_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_logged_entries_trackable_item ON logged_entries(trackable_item_id);