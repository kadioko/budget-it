CREATE TABLE envelopes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💰',
  balance NUMERIC(10, 2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE envelopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own envelopes" ON envelopes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own envelopes" ON envelopes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own envelopes" ON envelopes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own envelopes" ON envelopes
  FOR DELETE USING (auth.uid() = user_id);

-- Add envelope_id to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS envelope_id UUID REFERENCES envelopes(id) ON DELETE SET NULL;
