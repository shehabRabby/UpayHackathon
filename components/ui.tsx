"use client";
import { cloneElement, useId, type ReactElement, type ReactNode } from "react";
import type { Meta, Goal, Spending } from "@/lib/frontend/types";
import Link from "next/link";
import { ProductIcon } from "./brand";

export const money = (value: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(value);
export const date = (value: string) =>
  new Date(
    value.length === 10 ? `${value}T12:00:00Z` : value,
  ).toLocaleDateString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const currentDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <p className="eyebrow">YOUR FINANCIAL WORKSPACE</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}
export function Notice({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="notice success" role="status">
          {success}
        </p>
      )}
    </>
  );
}
export function ResourceState({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  return (
    <>
      {loading && (
        <p className="loading" role="status">
          Loading your data…
        </p>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}{" "}
          <button className="text-button" onClick={reload}>
            Retry
          </button>
        </div>
      )}
    </>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
export function Metric({
  label,
  value,
  note,
  icon = "analytics",
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon?: string;
  tone?: "brand" | "success" | "expense" | "highlight";
}) {
  const currency = typeof value === "string" ? /^(BDT\s+)(.+)$/.exec(value) : null;
  return (
    <section className="metric" data-tone={tone}>
      <div className="metric-top"><p>{label}</p><span className="metric-icon"><ProductIcon name={icon} /></span></div>
      <strong className={currency && currency[0].length > 18 ? "long-value" : undefined}>{currency ? <><span className="currency-code">{currency[1]}</span><span className="currency-value">{currency[2]}</span></> : value}</strong>
      {note && <small>{note}</small>}
    </section>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
export function Pagination({
  page,
  meta,
  change,
}: {
  page: number;
  meta?: Meta;
  change: (page: number) => void;
}) {
  if (!meta || !meta.total) return null;
  return (
    <div className="pagination">
      <button
        className="secondary"
        disabled={page <= 1}
        onClick={() => change(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {meta.totalPages ?? 1} · {meta.total} records
      </span>
      <button
        className="secondary"
        disabled={page >= (meta.totalPages ?? 1)}
        onClick={() => change(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
export function GoalCard({ goal }: { goal: Goal }) {
  return (
    <article className="goal-card">
      <div className="row">
        <Link href={`/goals/${goal.goalId}`}>
          <h3>{goal.goalName}</h3>
        </Link>
        <span className="badge" data-status={goal.status}>{goal.status}</span>
      </div>
      <progress
        value={goal.progressPercentage}
        max={100}
        aria-label={`${goal.goalName} progress`}
      />
      <div className="row">
        <span>{money(goal.currentAmount)} saved</span>
        <span>{goal.progressPercentage}%</span>
      </div>
      <p className="goal-remaining">{money(goal.remainingAmount)} remaining</p>
      <p className="muted">
        Target {money(goal.targetAmount)} · {date(goal.targetDate)}
        {goal.isOverdue ? " · Overdue" : ""}
      </p>
      <Link className="inline-link goal-detail-link" href={`/goals/${goal.goalId}`}>View goal <ProductIcon name="arrow" /></Link>
    </article>
  );
}
export function SpendingBars({ data }: { data: Spending }) {
  return (
    <div className="bars">
      {data.categorySpending.length ? (
        data.categorySpending.map((item) => (
          <div key={item.categoryId}>
            <div className="row">
              <span>{item.categoryName}</span>
              <strong>
                {money(item.totalSpent)} <small>({item.percentage}%)</small>
              </strong>
            </div>
            <progress
              value={item.percentage}
              max={100}
              aria-label={`${item.categoryName} share of expenses`}
            />
          </div>
        ))
      ) : (
        <Empty>No expenses recorded in this period.</Empty>
      )}
    </div>
  );
}
export function AmountInput({
  name = "amount",
  value,
  positive = true,
  max = 1_000_000_000_000,
  id,
  placeholder = "Enter amount in BDT",
}: {
  name?: string;
  value?: number;
  positive?: boolean;
  max?: number;
  id?: string;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      name={name}
      type="number"
      required
      min={positive ? "0.01" : "0"}
      max={max}
      step="0.01"
      defaultValue={value}
      inputMode="decimal"
      placeholder={placeholder}
    />
  );
}
export function Limitations({ items }: { items?: string[] }) {
  return items?.length ? (
    <ul className="muted notes">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  ) : null;
}
