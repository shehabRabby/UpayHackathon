import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
async function main() {
  const tables = await prisma.$queryRaw<{ tablename: string; rowsecurity: boolean }[]>`
    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'
    AND tablename IN ('users','categories','transactions','savings_goals','goal_contributions','financial_health','financial_insights','ai_conversations','ai_messages','recommendations')`;
  assert.equal(tables.length, 10);
  assert.ok(tables.every(table => table.rowsecurity));
  const checks = await prisma.$queryRaw<{ conname: string }[]>`
    SELECT conname FROM pg_constraint WHERE connamespace = 'public'::regnamespace
    AND conname IN ('users_auth_user_id_fkey','categories_category_type_check','transactions_amount_positive','transactions_source_check','savings_goals_target_amount_positive','savings_goals_current_amount_nonnegative','goal_contributions_amount_positive')`;
  assert.equal(checks.length, 7);
  const categories = await prisma.categories.count({ where: { is_active: true } });
  assert.ok(categories >= 6);
  console.log(`Database verified: ${tables.length} tables with RLS, ${checks.length} constraints, ${categories} active categories`);
}
main().catch(() => { console.error("Database verification failed; check the configured database and setup scripts"); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
