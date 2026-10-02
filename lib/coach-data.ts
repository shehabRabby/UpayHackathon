import type {
  ai_conversations,
  ai_messages,
  recommendations,
} from "@prisma/client";

export const conversationData = (item: ai_conversations) => ({
  conversationId: item.conversation_id,
  title: item.conversation_title,
  createdAt: item.created_at.toISOString(),
  updatedAt: item.updated_at.toISOString(),
});
export const messageData = (item: ai_messages) => ({
  messageId: item.message_id,
  conversationId: item.conversation_id,
  role: item.role,
  message: item.message_content,
  createdAt: item.created_at.toISOString(),
});
export const recommendationData = (item: recommendations) => ({
  recommendationId: item.recommendation_id,
  recommendationType: item.recommendation_type,
  recommendationText: item.recommendation_text,
  priority: item.priority,
  status: item.status,
  createdAt: item.created_at.toISOString(),
});
