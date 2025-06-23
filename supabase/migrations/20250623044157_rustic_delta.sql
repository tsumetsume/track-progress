/*
  # Create progress table for tracking task completion

  1. New Tables
    - `progress`
      - `id` (uuid, primary key)
      - `participant_id` (uuid, foreign key to participants)
      - `task_id` (uuid, foreign key to tasks)
      - `completed` (boolean) - Whether task is completed
      - `updated_at` (timestamp) - Last update timestamp

  2. Security
    - Enable RLS on `progress` table
    - Add policy for public access

  3. Relationships
    - Foreign key constraints to participants and tasks tables
    - Unique constraint on participant_id + task_id combination

  4. Indexes
    - Performance indexes for common queries
*/

CREATE TABLE IF NOT EXISTS progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(participant_id, task_id)
);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Allow public access to progress
CREATE POLICY "Anyone can read progress"
  ON progress
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can manage progress"
  ON progress
  FOR ALL
  TO public
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS progress_participant_id_idx ON progress(participant_id);
CREATE INDEX IF NOT EXISTS progress_task_id_idx ON progress(task_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on progress changes
CREATE TRIGGER update_progress_updated_at 
    BEFORE UPDATE ON progress 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();