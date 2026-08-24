-- Temporary compatibility alias for Android releases that used the older plural RPC name.
-- Run this after add_atomic_money_operations.sql.

CREATE OR REPLACE FUNCTION public.budget_it_apply_transactions(
  p_user_id UUID,
  p_amount NUMERIC,
  p_category TEXT,
  p_date DATE,
  p_note TEXT DEFAULT NULL,
  p_envelope_id UUID DEFAULT NULL,
  p_merchant TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_is_recurring BOOLEAN DEFAULT FALSE,
  p_recurring_source_id UUID DEFAULT NULL,
  p_client_request_id UUID DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.budget_it_apply_transaction(
    p_user_id,
    p_amount,
    p_category,
    p_date,
    p_note,
    p_envelope_id,
    p_merchant,
    p_tags,
    p_is_recurring,
    p_recurring_source_id,
    p_client_request_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.budget_it_apply_transactions(
  UUID, NUMERIC, TEXT, DATE, TEXT, UUID, TEXT, TEXT[], BOOLEAN, UUID, UUID
) TO authenticated;

-- Make the new RPC visible to the REST API immediately.
NOTIFY pgrst, 'reload schema';
