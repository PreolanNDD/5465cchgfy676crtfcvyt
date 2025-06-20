/*
  # PIDMe Initial Schema Setup

  1. New Tables
    - `users` - Public user profile table linked to auth.users
      - `id` (uuid, primary key, matches auth.users.id)
      - `name` (varchar, user's display name)
      - `created_at` (timestamptz, account creation time)
      - `updated_at` (timestamptz, last profile update)

  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read/update their own profile
    - Add policy for authenticated users to read other users' basic info

  3. Triggers
    - Auto-create profile when new auth user signs up
    - Auto-update timestamps on profile changes
*/

-- Create the public users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID NOT NULL PRIMARY KEY,
  name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_auth_user FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read and update their own profile
CREATE POLICY "Users can manage own profile"
  ON public.users
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Authenticated users can read basic profile info of others
CREATE POLICY "Users can read others basic info"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to automatically create a public user profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function upon new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update the updated_at timestamp on profile changes
DROP TRIGGER IF EXISTS on_user_updated ON public.users;
CREATE TRIGGER on_user_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();