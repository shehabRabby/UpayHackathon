import { GoalStatus, TransactionType } from "@prisma/client";
import { z } from "zod";

// Keep JSON numbers within a safe range, and reject rounding away extra cents.
export const money = z.number().finite().min(0).max(1_000_000_000_000).refine(
  value => /^\d+(\.\d{1,2})?$/.test(String(value)),
  "Amount must have at most two decimal places",
);
export const positiveMoney = money.refine(value => value > 0, "Amount must be positive");
export const dateOnly = z.iso.date();
export const dateTime = z.iso.datetime({ offset: true });
export const transactionDate = z.union([dateOnly, dateTime]).transform(value => new Date(value));

export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const targetDate = dateOnly.refine(value => value > today(), "Target date must be after today (Asia/Dhaka)");

export const goalCreate = z.strictObject({
  goalName: z.string().trim().min(1).max(200),
  targetAmount: positiveMoney,
  currentAmount: money,
  targetDate,
}).refine(value => value.currentAmount <= value.targetAmount, {
  message: "Current amount cannot exceed target amount", path: ["currentAmount"],
});
export const goalPatch = z.strictObject({
  goalName: z.string().trim().min(1).max(200).optional(),
  targetAmount: positiveMoney.optional(),
  currentAmount: money.optional(),
  targetDate: targetDate.optional(),
  status: z.enum(GoalStatus).optional(),
}).refine(value => Object.keys(value).length > 0, "Provide at least one field");

export const transactionCreate = z.strictObject({
  categoryId: z.uuid(),
  transactionType: z.enum(TransactionType),
  amount: positiveMoney,
  merchantName: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  transactionDate,
  source: z.enum(["mock", "manual"]).default("manual"),
});
export const transactionPatch = transactionCreate.omit({ source: true }).partial()
  .refine(value => Object.keys(value).length > 0, "Provide at least one field");

export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const transactionQuery = pagination.extend({
  type: z.enum(TransactionType).optional(),
  category: z.uuid().optional(),
  search: z.string().trim().max(200).optional(),
  startDate: z.union([dateOnly, dateTime]).optional(),
  endDate: z.union([dateOnly, dateTime]).optional(),
}).strict().refine(value => !value.startDate || !value.endDate || new Date(value.startDate) <= new Date(value.endDate), {
  message: "startDate must not be after endDate", path: ["endDate"],
});
export const goalQuery = pagination.extend({ status: z.enum(GoalStatus).optional() }).strict();
export const contributionCreate = z.strictObject({
  amount: positiveMoney,
  transactionId: z.uuid().nullable().optional(),
  contributionDate: dateTime.optional(),
});
export const profileCreate = z.strictObject({
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(30).nullable().optional(),
  preferredLanguage: z.enum(["bn", "en", "bn-BD"]).default("bn-BD"),
});
