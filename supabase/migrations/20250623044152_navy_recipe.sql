/*
  # Create participants table for session participants

  1. New Tables
    - `participants`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to sessions)
      - `name` (text) - Participant name
      - `last_seen` (timestamp) - Last activity timestamp
      - `created_at` (timestamp) - When participant joined
      - `is_online` (boolean) - Current online status

  2. Security
    - Enable RLS on `participants` table
    - Add policy for public access

  3. Relationships
    - Foreign key constraint to sessions table
*/

CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  is_online boolean DEFAULT true
);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Allow public access to participants
CREATE POLICY "Anyone can read participants"
  ON participants
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can manage participants"
  ON participants
  FOR ALL
  TO public
  USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS participants_session_id_idx ON participants(session_id);