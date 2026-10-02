import type { RecommendationStatus } from "@prisma/client";

// Shared by API enforcement and UI actions. Same-status requests are no-ops.
export const recommendationTransitions: Record<RecommendationStatus, readonly RecommendationStatus[]> = {
  NEW: ["VIEWED", "COMPLETED", "DISMISSED"],
  VIEWED: ["COMPLETED", "DISMISSED"],
  COMPLETED: [],
  DISMISSED: [],
};
