-- Run after prisma db push. Existing constraints are preserved on repeat runs.
-- CHECK constraints remain SQL-only. Prisma 7 models the Auth foreign key
-- using an externally managed table, so its guard usually skips that constraint.
BEGIN;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_user_id_fkey' AND conrelid = 'public.users'::regclass) THEN
ALTER TABLE public.users
  ADD CONSTRAINT users_auth_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END IF;

IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_category_type_check' AND conrelid = 'public.categories'::regclass) THEN
ALTER TABLE public.categories
  ADD CONSTRAINT categories_category_type_check
  CHECK (category_type IN ('income', 'expense'));
END IF;

IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_amount_positive' AND conrelid = 'public.transactions'::regclass) THEN
ALTER TABLE public.transactions ADD CONSTRAINT transactions_amount_positive CHECK (amount > 0);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_source_check' AND conrelid = 'public.transactions'::regclass) THEN
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('mock', 'manual', 'upay_future'));
END IF;

IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'savings_goals_target_amount_positive' AND conrelid = 'public.savings_goals'::regclass) THEN
ALTER TABLE public.savings_goals ADD CONSTRAINT savings_goals_target_amount_positive CHECK (target_amount > 0);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'savings_goals_current_amount_nonnegative' AND conrelid = 'public.savings_goals'::regclass) THEN
ALTER TABLE public.savings_goals ADD CONSTRAINT savings_goals_current_amount_nonnegative CHECK (current_amount >= 0);
END IF;

IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goal_contributions_amount_positive' AND conrelid = 'public.goal_contributions'::regclass) THEN
ALTER TABLE public.goal_contributions
  ADD CONSTRAINT goal_contributions_amount_positive CHECK (amount > 0);
END IF;
END $$;

COMMIT;
