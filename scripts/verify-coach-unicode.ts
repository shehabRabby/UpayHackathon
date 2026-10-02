import "./gemini-env";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
// Isolated temporary table only. No application records or permanent DDL.
try {
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`CREATE TEMP TABLE coach_unicode_check (message_content text, recommendation_text text) ON COMMIT DROP`;
    const text = "আপনার সঞ্চয় লক্ষ্য পর্যালোচনা করুন। Apnar sonchoy lokkho dekhun. English guidance.";
    await tx.$executeRaw`INSERT INTO coach_unicode_check (message_content, recommendation_text) VALUES (${text}, ${text})`;
    const rows = await tx.$queryRaw<{ message_content: string; recommendation_text: string }[]>`SELECT message_content, recommendation_text FROM coach_unicode_check`;
    assert.equal(rows[0].message_content, text);
    assert.equal(rows[0].recommendation_text, text);
  });
  console.log("PostgreSQL Unicode text persistence verified; temporary table dropped; application records untouched");
} catch {
  console.error("PostgreSQL Unicode persistence verification failed (details withheld)");
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
