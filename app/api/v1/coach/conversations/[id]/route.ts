import { ApiError, handle, resourceId, success, type IdContext } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const DELETE = handle(async (request: Request, context: IdContext) => {
  const userId = await requireUser(request), id = await resourceId(context);
  const result = await prisma.ai_conversations.deleteMany({ where: { conversation_id: id, user_id: userId } });
  if (!result.count) throw new ApiError(404, "Conversation not found");
  return success({ conversationId: id }, "Conversation and its messages deleted");
});
