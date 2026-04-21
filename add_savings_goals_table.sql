CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date DATE NOT NULL,
  note TEXT,
  linked_envelope_id UUID REFERENCES envelopes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS savings_goals_user_id_idx
  ON savings_goals(user_id);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their savings goals"
  ON savings_goals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their savings goals"
  ON savings_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their savings goals"
  ON savings_goals
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their savings goals"
  ON savings_goals
  FOR DELETE
  USING (auth.uid() = user_id);
