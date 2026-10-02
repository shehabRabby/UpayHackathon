import { Prisma } from "@prisma/client";
import { ApiError, body, handle, resourceId, success, type IdContext } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pagination } from "@/lib/validation";
import { messageInput } from "@/lib/phase56-validation";
import { minimizedContext } from "@/lib/coach-context";
import { generateCoaching, type CoachHistory } from "@/lib/gemini";
import { messageData, recommendationData } from "@/lib/coach-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request), id = await resourceId(context);
  const input = pagination.strict().parse(Object.fromEntries(new URL(request.url).searchParams));
  const data = await prisma.$transaction(async tx => {
    if (!await tx.ai_conversations.findFirst({ where: { conversation_id: id, user_id: userId }, select: { conversation_id: true } })) throw new ApiError(404, "Conversation not found");
    const where = { conversation_id: id, conversation: { user_id: userId } };
    const items = await tx.ai_messages.findMany({ where, orderBy: [{ created_at: "asc" }, { message_id: "asc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize });
    const total = await tx.ai_messages.count({ where });
    return { items, total };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  return success(data.items.map(messageData), "Messages retrieved", 200, { ...input, total: data.total, totalPages: Math.ceil(data.total / input.pageSize) });
});

export const POST = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request), id = await resourceId(context);
  const input = await body(request, messageInput);
  const prepared = await prisma.$transaction(async tx => {
    const conversation = await tx.ai_conversations.findFirst({ where: { conversation_id: id, user_id: userId } });
    if (!conversation) throw new ApiError(404, "Conversation not found");
    const metrics = await minimizedContext(tx, userId, input.goalId);
    const messages = await tx.ai_messages.findMany({ where: { conversation_id: id, conversation: { user_id: userId }, role: { in: ["USER", "ASSISTANT"] } },
      select: { role: true, message_content: true }, orderBy: [{ created_at: "desc" }, { message_id: "desc" }], take: 6 });
    const history: CoachHistory = messages.reverse().map(message => ({ role: message.role as "USER" | "ASSISTANT", content: message.message_content.slice(0, 2000) }));
    return { conversation, ...metrics, history };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  // Keep the paid network call outside database transactions. Failed calls
  // produce no orphan messages, recommendations, or altered conversation state.
  const answer = await generateCoaching({ message: input.message, language: input.language ?? prepared.preferredLanguage,
    context: prepared.context, history: prepared.history });
  const stored = await prisma.$transaction(async tx => {
    const timestamp = new Date(Math.max(Date.now(), prepared.conversation.updated_at.getTime() + 1));
    const guard = await tx.ai_conversations.updateMany({ where: { conversation_id: id, user_id: userId,
      updated_at: prepared.conversation.updated_at }, data: { updated_at: new Date(timestamp.getTime() + 1) } });
    if (!guard.count) throw new ApiError(400, "Conversation changed while the response was generated; reload before sending another message");
    const userMessage = await tx.ai_messages.create({ data: { conversation_id: id, role: "USER", message_content: input.message, created_at: timestamp } });
    const assistantMessage = await tx.ai_messages.create({ data: { conversation_id: id, role: "ASSISTANT", message_content: answer.message,
      created_at: new Date(timestamp.getTime() + 1) } });
    const recommendations = [];
    for (const item of answer.recommendations) recommendations.push(await tx.recommendations.create({ data: {
      user_id: userId, recommendation_type: item.recommendationType, recommendation_text: item.recommendationText, priority: item.priority, status: "NEW",
    } }));
    return { userMessage, assistantMessage, recommendations };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return success({ conversationId: id, userMessage: messageData(stored.userMessage), assistantMessage: messageData(stored.assistantMessage),
    recommendations: stored.recommendations.map(recommendationData) }, "Coach response created", 201);
});
