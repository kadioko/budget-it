-- Keep transaction history and account balances in the same database transaction.
-- Run this migration after the existing Budget It SQL files.

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS client_request_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_client_request_idx
  ON public.transactions (user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.budget_it_apply_transaction(
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
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_transaction public.transactions;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized to change this budget.';
  END IF;

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Transaction amount must not be zero.';
  END IF;

  -- Retrying an offline request must return its original result, not duplicate it.
  IF p_client_request_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::TEXT || ':' || p_client_request_id::TEXT));
    SELECT * INTO v_transaction
    FROM public.transactions
    WHERE user_id = p_user_id AND client_request_id = p_client_request_id;
    IF FOUND THEN
      RETURN v_transaction;
    END IF;
  END IF;

  -- A recurring template can only create one entry for a given date.
  IF p_recurring_source_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('recurring:' || p_recurring_source_id::TEXT || ':' || p_date::TEXT));
    SELECT * INTO v_transaction
    FROM public.transactions
    WHERE user_id = p_user_id
      AND recurring_source_id = p_recurring_source_id
      AND date = p_date;
    IF FOUND THEN
      RETURN v_transaction;
    END IF;
  END IF;

  IF p_envelope_id IS NULL THEN
    UPDATE public.budgets
    SET bank_balance = bank_balance - p_amount,
        updated_at = timezone('utc', now())
    WHERE user_id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Create a budget before adding transactions.';
    END IF;
  ELSE
    UPDATE public.envelopes
    SET balance = balance - p_amount
    WHERE id = p_envelope_id AND user_id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected envelope was not found.';
    END IF;
  END IF;

  INSERT INTO public.transactions (
    user_id, amount, category, date, note, envelope_id, merchant, tags,
    is_recurring, recurring_source_id, kind, client_request_id
  )
  VALUES (
    p_user_id, p_amount, p_category, p_date, p_note, p_envelope_id, p_merchant,
    COALESCE(p_tags, ARRAY[]::TEXT[]), p_is_recurring, p_recurring_source_id,
    'standard', p_client_request_id
  )
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$;

CREATE OR REPLACE FUNCTION public.budget_it_update_transaction(
  p_user_id UUID,
  p_transaction_id UUID,
  p_amount NUMERIC,
  p_category TEXT,
  p_date DATE,
  p_note TEXT DEFAULT NULL,
  p_envelope_id UUID DEFAULT NULL,
  p_merchant TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_is_recurring BOOLEAN DEFAULT FALSE,
  p_recurring_source_id UUID DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing public.transactions;
  v_transaction public.transactions;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized to change this budget.';
  END IF;
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'Transaction amount must not be zero.';
  END IF;

  SELECT * INTO v_existing
  FROM public.transactions
  WHERE id = p_transaction_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found.';
  END IF;
  IF v_existing.kind = 'transfer' THEN
    RAISE EXCEPTION 'Transfers cannot be edited as standard transactions.';
  END IF;

  -- Refund the old account, then apply the new amount to its destination.
  IF v_existing.envelope_id IS NULL THEN
    UPDATE public.budgets
    SET bank_balance = bank_balance + v_existing.amount,
        updated_at = timezone('utc', now())
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.envelopes
    SET balance = balance + v_existing.amount
    WHERE id = v_existing.envelope_id AND user_id = p_user_id;
  END IF;

  IF p_envelope_id IS NULL THEN
    UPDATE public.budgets
    SET bank_balance = bank_balance - p_amount,
        updated_at = timezone('utc', now())
    WHERE user_id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Budget not found.';
    END IF;
  ELSE
    UPDATE public.envelopes
    SET balance = balance - p_amount
    WHERE id = p_envelope_id AND user_id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected envelope was not found.';
    END IF;
  END IF;

  UPDATE public.transactions
  SET amount = p_amount,
      category = p_category,
      date = p_date,
      note = p_note,
      envelope_id = p_envelope_id,
      merchant = p_merchant,
      tags = COALESCE(p_tags, ARRAY[]::TEXT[]),
      is_recurring = p_is_recurring,
      recurring_source_id = p_recurring_source_id
  WHERE id = p_transaction_id
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$;

CREATE OR REPLACE FUNCTION public.budget_it_delete_transaction(
  p_user_id UUID,
  p_transaction_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing public.transactions;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized to change this budget.';
  END IF;

  SELECT * INTO v_existing
  FROM public.transactions
  WHERE id = p_transaction_id AND user_id = p_user_id
  FOR UPDATE;

  -- A repeated offline delete is already complete.
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF v_existing.kind = 'transfer' THEN
    RAISE EXCEPTION 'Transfers must be managed as a pair.';
  END IF;

  IF v_existing.envelope_id IS NULL THEN
    UPDATE public.budgets
    SET bank_balance = bank_balance + v_existing.amount,
        updated_at = timezone('utc', now())
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.envelopes
    SET balance = balance + v_existing.amount
    WHERE id = v_existing.envelope_id AND user_id = p_user_id;
  END IF;

  DELETE FROM public.transactions WHERE id = p_transaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.budget_it_create_transfer(
  p_user_id UUID,
  p_amount NUMERIC,
  p_from_envelope_id UUID DEFAULT NULL,
  p_to_envelope_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE,
  p_note TEXT DEFAULT NULL
)
RETURNS SETOF public.transactions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID := gen_random_uuid();
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized to change this budget.';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be greater than zero.';
  END IF;
  IF p_from_envelope_id IS NOT DISTINCT FROM p_to_envelope_id THEN
    RAISE EXCEPTION 'Choose different source and destination accounts.';
  END IF;

  IF p_from_envelope_id IS NULL THEN
    UPDATE public.budgets
    SET bank_balance = bank_balance - p_amount,
        updated_at = timezone('utc', now())
    WHERE user_id = p_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Budget not found.'; END IF;
  ELSE
    UPDATE public.envelopes SET balance = balance - p_amount
    WHERE id = p_from_envelope_id AND user_id = p_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Source envelope was not found.'; END IF;
  END IF;

  IF p_to_envelope_id IS NULL THEN
    UPDATE public.budgets
    SET bank_balance = bank_balance + p_amount,
        updated_at = timezone('utc', now())
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.envelopes SET balance = balance + p_amount
    WHERE id = p_to_envelope_id AND user_id = p_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Destination envelope was not found.'; END IF;
  END IF;

  RETURN QUERY
  INSERT INTO public.transactions (
    user_id, amount, category, date, note, kind, transfer_group_id,
    transfer_peer_envelope_id, transfer_direction, envelope_id, tags, is_recurring
  )
  VALUES
    (p_user_id, p_amount, 'Transfer', p_date, COALESCE(p_note, 'Transfer out'), 'transfer', v_group_id,
      p_to_envelope_id, 'outgoing', p_from_envelope_id, ARRAY['transfer']::TEXT[], FALSE),
    (p_user_id, -p_amount, 'Transfer', p_date, COALESCE(p_note, 'Transfer in'), 'transfer', v_group_id,
      p_from_envelope_id, 'incoming', p_to_envelope_id, ARRAY['transfer']::TEXT[], FALSE)
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.budget_it_apply_transaction(UUID, NUMERIC, TEXT, DATE, TEXT, UUID, TEXT, TEXT[], BOOLEAN, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.budget_it_update_transaction(UUID, UUID, NUMERIC, TEXT, DATE, TEXT, UUID, TEXT, TEXT[], BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.budget_it_delete_transaction(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.budget_it_create_transfer(UUID, NUMERIC, UUID, UUID, DATE, TEXT) TO authenticated;
