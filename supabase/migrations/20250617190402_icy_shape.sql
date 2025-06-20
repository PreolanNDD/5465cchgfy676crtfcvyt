/*
  # Create experiments table for the Experimentation Lab

  1. New Tables
    - `experiments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `title` (varchar, experiment title)
      - `hypothesis` (text, user's hypothesis)
      - `independent_variable_id` (uuid, foreign key to trackable_items - INPUT metric)
      - `dependent_variable_id` (uuid, foreign key to trackable_items - OUTPUT metric)
      - `start_date` (date, experiment start date)
      - `end_date` (date, experiment end date)
      - `status` (enum, 'ACTIVE' or 'COMPLETED')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on experiments table
    - Users can only access their own experiments
    - Proper foreign key constraints

  3. Indexes
    - Performance indexes for common queries
*/

-- Create enum for experiment status
CREATE TYPE experiment_status AS ENUM ('ACTIVE', 'COMPLETED');

-- Create experiments table
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  hypothesis TEXT NOT NULL,
  independent_variable_id UUID NOT NULL REFERENCES trackable_items(id) ON DELETE CASCADE,
  dependent_variable_id UUID NOT NULL REFERENCES trackable_items(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status experiment_status DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable RLS on experiments
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

-- RLS policies for experiments
CREATE POLICY "Users can manage own experiments"
  ON experiments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for experiments
CREATE TRIGGER on_experiments_updated
  BEFORE UPDATE ON experiments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_experiments_user_id ON experiments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiments_user_status ON experiments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_experiments_dates ON experiments(start_date, end_date);