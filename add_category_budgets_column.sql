-- Add per-category monthly budget limits to budgets.
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS category_budgets JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Ensure older rows have an empty object so clients can rely on the field existing.
UPDATE budgets
SET category_budgets = '{}'::jsonb
WHERE category_budgets IS NULL;
