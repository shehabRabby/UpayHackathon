-- Deny direct Data API access by default. The Next.js API uses the server-only
-- Prisma connection and scopes every request to a verified Supabase user.
-- Authenticated Data API clients can read their own records with these policies.
BEGIN;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users', 'transactions', 'savings_goals', 'financial_health', 'financial_insights', 'ai_conversations', 'recommendations'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name AND policyname = 'upay_owner_read') THEN
      EXECUTE format('CREATE POLICY upay_owner_read ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id)', table_name);
    END IF;
  END LOOP;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'upay_active_categories_read') THEN
  CREATE POLICY upay_active_categories_read ON public.categories FOR SELECT TO authenticated USING (is_active = true);
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'goal_contributions' AND policyname = 'upay_contribution_owner_read') THEN
  CREATE POLICY upay_contribution_owner_read ON public.goal_contributions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.savings_goals g WHERE g.goal_id = goal_contributions.goal_id AND g.user_id = (SELECT auth.uid())));
END IF;
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_messages' AND policyname = 'upay_message_owner_read') THEN
  CREATE POLICY upay_message_owner_read ON public.ai_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.conversation_id = ai_messages.conversation_id AND c.user_id = (SELECT auth.uid())));
END IF;
END $$;
COMMIT;
