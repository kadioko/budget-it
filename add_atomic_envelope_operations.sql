-- Create envelopes without inflating a user's total balance.
-- Run this after add_atomic_money_operations.sql.

CREATE OR REPLACE FUNCTION public.budget_it_create_envelope(
  p_user_id UUID,
  p_name TEXT,
  p_icon TEXT DEFAULT 'wallet',
  p_opening_balance NUMERIC DEFAULT 0,
  p_currency TEXT DEFAULT 'USD',
  p_is_default BOOLEAN DEFAULT FALSE
)
RETURNS public.envelopes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_envelope public.envelopes;
  v_group_id UUID := gen_random_uuid();
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized to create this envelope.';
  END IF;
  IF btrim(COALESCE(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Envelope name is required.';
  END IF;
  IF p_opening_balance < 0 THEN
    RAISE EXCEPTION 'Envelope opening balance cannot be negative.';
  END IF;

  -- Confirm the budget exists even for a zero-balance envelope.
  PERFORM 1 FROM public.budgets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Create a budget before adding an envelope.';
  END IF;

  INSERT INTO public.envelopes (user_id, name, icon, balance, currency, is_default)
  VALUES (p_user_id, btrim(p_name), COALESCE(NULLIF(p_icon, ''), 'wallet'), p_opening_balance, p_currency, p_is_default)
  RETURNING * INTO v_envelope;

  IF p_opening_balance > 0 THEN
    UPDATE public.budgets
    SET bank_balance = bank_balance - p_opening_balance,
        updated_at = timezone('utc', now())
    WHERE user_id = p_user_id;

    INSERT INTO public.transactions (
      user_id, amount, category, date, note, kind, transfer_group_id,
      transfer_peer_envelope_id, transfer_direction, envelope_id, tags, is_recurring
    )
    VALUES
      (p_user_id, p_opening_balance, 'Transfer', CURRENT_DATE, 'Envelope allocation', 'transfer', v_group_id,
        v_envelope.id, 'outgoing', NULL, ARRAY['transfer', 'envelope-allocation']::TEXT[], FALSE),
      (p_user_id, -p_opening_balance, 'Transfer', CURRENT_DATE, 'Envelope allocation', 'transfer', v_group_id,
        NULL, 'incoming', v_envelope.id, ARRAY['transfer', 'envelope-allocation']::TEXT[], FALSE);
  END IF;

  RETURN v_envelope;
END;
$$;

GRANT EXECUTE ON FUNCTION public.budget_it_create_envelope(UUID, TEXT, TEXT, NUMERIC, TEXT, BOOLEAN) TO authenticated;
