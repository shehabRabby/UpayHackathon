import { RecommendationPriority, RecommendationStatus } from "@prisma/client";
import { z } from "zod";
import { money, pagination, positiveMoney } from "./validation";

export const language = z.enum(["bn", "banglish", "en"]);
export const conversationInput = z.strictObject({
  title: z.string().trim().min(1).max(200).optional(),
});
export const messageInput = z.strictObject({
  message: z.string().trim().min(1).max(2000),
  language: language.optional(),
  goalId: z.uuid().optional(),
});
export const recommendationQuery = pagination
  .extend({
    status: z.enum(RecommendationStatus).optional(),
    priority: z.enum(RecommendationPriority).optional(),
  })
  .strict();
export const recommendationPatch = z.strictObject({
  status: z.enum(["VIEWED", "COMPLETED", "DISMISSED"]),
});
export const simulationInput = z.strictObject({
  monthlyIncome: money,
  monthlyExpenses: money,
  monthlySaving: money,
  goalId: z.uuid().optional(),
  horizonMonths: z.number().int().min(1).max(120).default(12),
});
export const affordabilityInput = z.strictObject({
  purchaseAmount: positiveMoney,
  goalId: z.uuid().optional(),
  explain: z.boolean().default(false),
  emergencyBufferMonths: z.number().int().min(0).max(12).default(3),
  language: language.optional(),
});
export const coachResponse = z.strictObject({
  message: z.string().trim().min(1).max(8000),
  recommendations: z
    .array(
      z.strictObject({
        recommendationType: z.enum(["SAVING", "BUDGET", "GOAL", "EMERGENCY"]),
        recommendationText: z.string().trim().min(1).max(1000),
        priority: z.enum(RecommendationPriority),
      }),
    )
    .max(3),
});
