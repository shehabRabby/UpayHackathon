import type { Transaction, TransactionType } from "./types";
export function numeric(fields: FormData, name: string) {
  const raw = String(fields.get(name) ?? "").trim();
  if (!raw || !Number.isFinite(Number(raw)))
    throw new Error("Enter a valid number for each amount.");
  return Number(raw);
}
export function transactionPayload(fields: FormData, editing: boolean) {
  const transactionDate = String(fields.get("transactionDate"));
  return {
    categoryId: String(fields.get("categoryId")),
    transactionType: String(fields.get("transactionType")) as TransactionType,
    amount: numeric(fields, "amount"),
    merchantName: String(fields.get("merchantName") ?? "").trim() || null,
    description: String(fields.get("description") ?? "").trim() || null,
    transactionDate: editing
      ? new Date(transactionDate).toISOString()
      : transactionDate,
    ...(editing ? {} : { source: "manual" as const }),
  };
}
export function localTransactionDate(item: Transaction) {
  const value = new Date(item.transactionDate);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}
