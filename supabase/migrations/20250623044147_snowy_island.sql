/*
  # Create tasks table for session tasks

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to sessions)
      - `title` (text) - Task description
      - `order_index` (integer) - Order of task in session
      - `created_at` (timestamp) - When task was created

  2. Security
    - Enable RLS on `tasks` table
    - Add policy for public access (students need to see tasks)

  3. Relationships
    - Foreign key constraint to sessions table
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow public access to tasks
CREATE POLICY "Anyone can read tasks"
  ON tasks
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can manage tasks"
  ON tasks
  FOR ALL
  TO public
  USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS tasks_session_id_idx ON tasks(session_id);
CREATE INDEX IF NOT EXISTS tasks_order_idx ON tasks(session_id, order_index);