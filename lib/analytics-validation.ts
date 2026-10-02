import { z } from "zod";
import { dateOnly, pagination, today } from "./validation";

export const pastDate = dateOnly.refine(value => value <= today(), "Date must not be in the future (Asia/Dhaka)");
export const spendingInput = z.strictObject({ startDate: pastDate.optional(), endDate: pastDate.optional() })
  .refine(value => !value.startDate || !value.endDate || value.startDate <= value.endDate, {
    message: "startDate must not be after endDate", path: ["endDate"],
  });
export const lookbackMonths = z.number().int().min(1).max(12);
export const savingsPlanInput = z.strictObject({
  lookbackMonths: lookbackMonths.default(3),
  spendingReductionPercent: z.number().finite().min(0).max(50).default(10),
});
export const healthRefreshInput = z.strictObject({
  lookbackMonths: lookbackMonths.default(3), store: z.boolean().default(true),
});
export const healthQuery = z.union([
  z.strictObject({ mode: z.literal("current").default("current"),
    lookbackMonths: z.coerce.number().int().min(1).max(12).default(3) }),
  pagination.extend({ mode: z.literal("history"), startDate: pastDate.optional(), endDate: pastDate.optional() })
    .strict().refine(value => !value.startDate || !value.endDate || value.startDate <= value.endDate, {
      message: "startDate must not be after endDate", path: ["endDate"],
    }),
]);
