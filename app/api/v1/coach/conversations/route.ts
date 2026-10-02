import { Prisma } from "@prisma/client";
import { body, handle, success } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pagination } from "@/lib/validation";
import { conversationInput } from "@/lib/phase56-validation";
import { conversationData } from "@/lib/coach-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const input = pagination.strict().parse(Object.fromEntries(new URL(request.url).searchParams));
  const where = { user_id: userId };
  const [items, total] = await prisma.$transaction([
    prisma.ai_conversations.findMany({ where, orderBy: [{ updated_at: "desc" }, { conversation_id: "desc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
    prisma.ai_conversations.count({ where }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return success(items.map(conversationData), "Conversations retrieved", 200, { ...input, total, totalPages: Math.ceil(total / input.pageSize) });
});
export const POST = handle(async (request: Request) => {
  const userId = await requireUser(request);
  const input = await body(request, conversationInput);
  const item = await prisma.ai_conversations.create({ data: { user_id: userId, conversation_title: input.title ?? null } });
  return success(conversationData(item), "Conversation created", 201);
});
