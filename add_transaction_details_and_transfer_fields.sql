-- Extend transactions with richer details and transfer metadata.
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS merchant TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_source_id UUID REFERENCES recurring_transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS transfer_group_id UUID,
ADD COLUMN IF NOT EXISTS transfer_peer_envelope_id UUID REFERENCES envelopes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS transfer_direction TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_kind_check'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT transactions_kind_check
    CHECK (kind IN ('standard', 'transfer'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_transfer_direction_check'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT transactions_transfer_direction_check
    CHECK (
      transfer_direction IS NULL
      OR transfer_direction IN ('incoming', 'outgoing')
    );
  END IF;
END $$;
