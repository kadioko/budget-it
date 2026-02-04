-- Remove the amount > 0 constraint to allow negative amounts for income
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS valid_amount;

-- Add a new constraint that allows any numeric amount (positive or negative)
ALTER TABLE transactions ADD CONSTRAINT valid_amount CHECK (amount IS NOT NULL);
