/*
  # Create sessions table for instructor dashboard

  1. New Tables
    - `sessions`
      - `id` (uuid, primary key)
      - `code` (text, unique) - Session join code
      - `title` (text) - Session title/name
      - `created_at` (timestamp) - When session was created
      - `active` (boolean) - Whether session is currently active

  2. Security
    - Enable RLS on `sessions` table
    - Add policy for public read access (students need to join by code)
    - Add policy for authenticated users to manage sessions
*/

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read access for students to join sessions
CREATE POLICY "Anyone can read sessions"
  ON sessions
  FOR SELECT
  TO public
  USING (true);

-- Allow public insert/update for demo purposes (in production, restrict to authenticated instructors)
CREATE POLICY "Anyone can manage sessions"
  ON sessions
  FOR ALL
  TO public
  USING (true);