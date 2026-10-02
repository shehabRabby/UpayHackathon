import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { ApiError } from "./api";
import { messageData, recommendationData } from "./coach-data";

function stableId(value: string) {
  const hex = createHash("sha256").update(value, "utf8").digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export function turnIds(userId: string, conversationId: string, input: { requestId?: string; message: string; language?: string; goalId?: string }) {
  if (!input.requestId) return null;
  const scope = JSON.stringify([userId, conversationId, input.requestId]);
  // The assistant ID binds this retry key to its exact validated payload.
  return { user: stableId(scope + ":user"),
    assistant: stableId(scope + JSON.stringify([input.message, input.language ?? null, input.goalId ?? null])),
    recommendations: [0, 1, 2].map(index => stableId(scope + ":recommendation:" + index)) };
}
export async function replayTurn(tx: Prisma.TransactionClient, userId: string, conversationId: string, ids: ReturnType<typeof turnIds>) {
  if (!ids) return null;
  const messages = await tx.ai_messages.findMany({ where: { conversation_id: conversationId, conversation: { user_id: userId },
    message_id: { in: [ids.user, ids.assistant] } } });
  const user = messages.find(message => message.message_id === ids.user);
  if (!user) return null;
  const assistant = messages.find(message => message.message_id === ids.assistant);
  if (!assistant) throw new ApiError(400, "This request ID was already used for a different message; reload before sending");
  const recommendations = await tx.recommendations.findMany({ where: { user_id: userId, recommendation_id: { in: ids.recommendations } }, orderBy: { recommendation_id: "asc" } });
  return { conversationId, userMessage: messageData(user), assistantMessage: messageData(assistant), recommendations: recommendations.map(recommendationData) };
}
