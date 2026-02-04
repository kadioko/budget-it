-- Add bank_balance column to budgets table
ALTER TABLE budgets 
ADD COLUMN bank_balance NUMERIC(15, 2) DEFAULT 0.0;

-- Update existing budgets to have a default bank balance of 0
UPDATE budgets SET bank_balance = 0.0 WHERE bank_balance IS NULL;
