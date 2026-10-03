"use client";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useAction, useResource } from "@/lib/frontend/hooks";
import { queryPath } from "@/lib/frontend/api-client";
import { localTransactionDate, transactionPayload } from "@/lib/frontend/forms";
import { TransactionOverview } from "@/components/workspace-overview";
import type { Dashboard, Category, Transaction, TransactionType } from "@/lib/frontend/types";
import { AmountInput, Empty, Field, Notice, PageTitle, Pagination, ResourceState, currentDate, date, money } from "@/components/ui";
const types: TransactionType[] = ["CASH_IN", "CASH_OUT", "MERCHANT_PAY", "MOBILE_RECHARGE"];
const labels: Record<TransactionType, string> = { CASH_IN: "Income / cash in", CASH_OUT: "Expense / cash out", MERCHANT_PAY: "Merchant payment", MOBILE_RECHARGE: "Mobile recharge" };
export default function TransactionsPage() {
  const { request } = useAuth(), action = useAction();
  const [page, setPage] = useState(1), [filters, setFilters] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Transaction | null>(null), [type, setType] = useState<TransactionType>("CASH_IN"), [formVersion, setFormVersion] = useState(0);
  const list = useResource<Transaction[]>(queryPath("/transactions", { ...filters, page, pageSize: 20 }));
  const summary = useResource<Dashboard>("/dashboard/summary");
  const categories = useResource<Category[]>("/categories");
  const available = categories.data?.filter(item => item.categoryType === (type === "CASH_IN" ? "income" : "expense")) ?? [];
  function reset() { setEditing(null); setType("CASH_IN"); setFormVersion(value => value + 1); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const fields = new FormData(event.currentTarget);
    void action.run(async () => { const result = await request<Transaction>(editing ? `/transactions/${editing.transactionId}` : "/transactions", { method: editing ? "PATCH" : "POST", body: transactionPayload(fields, Boolean(editing)) }); if (editing) { setEditing(result.data); setType(result.data.transactionType); setFormVersion(value => value + 1); } else reset(); list.reload(); summary.reload(); }, editing ? "Transaction updated." : "Transaction recorded.");
  }
  return <><PageTitle title="Transactions" description="Track and understand your recorded cash flow. Prototype records, not wallet transfers." />
    <ResourceState {...summary} />{summary.data && <TransactionOverview summary={summary.data} count={list.meta?.total} filtered={Object.values(filters).some(Boolean)} />}
    <div className="grid two transaction-layout section-space"><section className="card form-panel"><p className="eyebrow">RECORD YOUR ACTIVITY</p><h2>{editing ? "Edit transaction" : "Add transaction"}</h2><ResourceState {...categories} /><Notice error={action.error} success={action.success} />
      <form onChange={action.clear} onInvalidCapture={action.clear} key={`${editing?.transactionId ?? "new"}-${formVersion}`} onSubmit={submit}><fieldset disabled={action.busy || categories.loading || Boolean(categories.error)}>
        <Field label="Transaction type"><select name="transactionType" value={type} onChange={event => setType(event.target.value as TransactionType)}>{types.map(value => <option value={value} key={value}>{labels[value]}</option>)}</select></Field>
        <Field label="Category"><select name="categoryId" key={type} required defaultValue={editing?.categoryId ?? ""}><option value="" disabled>Select a category</option>{available.map(item => <option key={item.categoryId} value={item.categoryId}>{item.categoryName}</option>)}</select></Field>
        <Field label="Amount (BDT)"><AmountInput value={editing?.amount} /></Field><Field label={editing ? "Date and time" : "Date"}><input name="transactionDate" type={editing ? "datetime-local" : "date"} required defaultValue={editing ? localTransactionDate(editing) : currentDate()} /></Field>
        <Field label="Merchant (optional)"><input name="merchantName" placeholder="e.g. Grocery store, salary, transport" maxLength={200} defaultValue={editing?.merchantName ?? ""} /></Field><Field label="Note (optional)"><textarea name="description" placeholder="Add an optional note" maxLength={2000} defaultValue={editing?.description ?? ""} /></Field>
        <div className="actions"><button type="submit">{action.busy ? "Saving…" : editing ? "Save changes" : "Add transaction"}</button>{editing && <button type="button" className="secondary" onClick={() => { action.clear(); reset(); }}>Cancel edit</button>}</div></fieldset></form></section>
      <section className="card history-panel"><p className="eyebrow">YOUR RECORDED CASH FLOW</p><h2>Your transaction history</h2><form onChange={action.clear} onInvalidCapture={action.clear} className="filters" onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); setFilters(Object.fromEntries([...fields.entries()].map(([key, value]) => [key, String(value)]))); setPage(1); }}>
        <Field label="Search"><input name="search" maxLength={200} placeholder="Search merchant, note or category" /></Field><Field label="Type"><select name="type"><option value="">All types</option>{types.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></Field>
        <Field label="Filter category"><select name="category"><option value="">All categories</option>{categories.data?.map(item => <option key={item.categoryId} value={item.categoryId}>{item.categoryName}</option>)}</select></Field>
        <Field label="From"><input name="startDate" type="date" /></Field><Field label="To"><input name="endDate" type="date" /></Field><button type="submit" className="secondary">Apply filters</button></form>
        <ResourceState {...list} />{list.data?.length === 0 && <Empty>No transactions match. Add a record or adjust your filters.</Empty>}
        {list.data && list.data.length > 0 && <div className="table-wrap"><table><thead><tr><th>Date / category</th><th>Details</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{list.data.map(item => <tr key={item.transactionId}><td>{date(item.transactionDate)}<p className="muted">{item.categoryName}</p></td><td>{labels[item.transactionType]}<p className="muted">{item.merchantName || item.description}</p></td><td className={item.transactionType === "CASH_IN" ? "amount-income" : "amount-expense"}>{money(item.amount)}</td><td><div className="actions"><button className="secondary" disabled={action.busy || !["manual", "mock"].includes(item.source)} onClick={() => { action.clear(); setEditing(item); setType(item.transactionType); }}>Edit</button><button className="danger" disabled={action.busy || !["manual", "mock"].includes(item.source)} onClick={() => { if (window.confirm("Delete this recorded transaction? Goal contribution history will be retained.")) void action.run(async () => { await request(`/transactions/${item.transactionId}`, { method: "DELETE" }); if (editing?.transactionId === item.transactionId) reset(); list.reload(); summary.reload(); }, "Transaction deleted."); }}>Delete</button></div></td></tr>)}</tbody></table></div>}
        <Pagination page={page} meta={list.meta} change={setPage} /></section></div></>;
}
