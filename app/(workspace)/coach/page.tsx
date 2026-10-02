"use client";
import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useAction, useResource } from "@/lib/frontend/hooks";
import type { CoachAnswer, Conversation, Goal, Message } from "@/lib/frontend/types";
import { Empty, Field, Notice, PageTitle, Pagination, ResourceState, date } from "@/components/ui";
import { Recommendations } from "@/components/recommendations";
export default function CoachPage() {
  const { request, session } = useAuth(), action = useAction();
  const [selected, setSelected] = useState<string | null>(null), [page, setPage] = useState(1), [conversationPage, setConversationPage] = useState(1);
  const [draft, setDraft] = useState(""), [recommendationVersion, setRecommendationVersion] = useState(0);
  const pendingTurn = useRef<{ payload: string; requestId: string } | null>(null);
  const conversations = useResource<Conversation[]>(`/coach/conversations?page=${conversationPage}&pageSize=20`);
  const goals = useResource<Goal[]>("/goals?page=1&pageSize=100");
  const messages = useResource<Message[]>(selected ? `/coach/conversations/${selected}/messages?page=${page}&pageSize=20` : null);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; const fields = new FormData(event.currentTarget);
    const body = { message: draft.trim(), language: fields.get("language"), ...(fields.get("goalId") ? { goalId: fields.get("goalId") } : {}) };
    const payload = JSON.stringify([selected, body]);
    const storageKey = `upay-coach-retry:${session?.user.id}:${selected}`;
    void action.run(async () => {
    // Persist only a fingerprint and retry UUID, never the message or metrics.
    const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload))), value => value.toString(16).padStart(2, "0")).join("");
    if (pendingTurn.current?.payload !== payload) {
      let saved: { fingerprint?: string; requestId?: string } | null = null;
      try { saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null"); } catch { /* unavailable storage: retain in memory */ }
      const requestId = saved?.fingerprint === fingerprint && /^[0-9a-f-]{36}$/i.test(saved.requestId ?? "") ? saved!.requestId! : crypto.randomUUID();
      pendingTurn.current = { payload, requestId };
    }
    const requestId = pendingTurn.current.requestId;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ fingerprint, requestId })); } catch { /* in-memory retry remains available */ }
      await request<CoachAnswer>(`/coach/conversations/${selected}/messages`, { method: "POST", timeoutMs: 70_000, body: { ...body, requestId } });
      pendingTurn.current = null;
      try { sessionStorage.removeItem(storageKey); } catch { /* storage may be disabled */ }
      setDraft(""); setPage(Math.max(1, Math.ceil(((messages.meta?.total ?? 0) + 2) / 20))); messages.reload(); conversations.reload(); setRecommendationVersion(value => value + 1);
    }, "Your coach replied.");
  }
  return <><PageTitle title="Your AI financial coach" description="Talk through your finances in English, Bangla, or Banglish." /><div className="notice intro">Your coach receives a minimized summary of recorded finances and recent chat messages. Advice is illustrative. Keep passwords, card details, and other private identifiers out of messages.</div>
    <Notice error={action.error} success={action.success} /><div className="chat-layout section-space"><section className="card"><h2>Conversations</h2><form onChange={action.clear} onInvalidCapture={action.clear} onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const fields = new FormData(form); void action.run(async () => { const response = await request<Conversation>("/coach/conversations", { method: "POST", body: fields.get("title") ? { title: String(fields.get("title")).trim() } : {} }); form.reset(); setDraft(""); setSelected(response.data.conversationId); setPage(1); conversations.reload(); }, "Conversation created."); }}><fieldset disabled={action.busy}><Field label="Conversation title"><input name="title" maxLength={200} placeholder="My savings plan" /></Field><button type="submit">New conversation</button></fieldset></form>
      <ResourceState {...conversations} /><div className="conversation-list section-space">{conversations.data?.map(item => <button key={item.conversationId} className={selected === item.conversationId ? "" : "secondary"} disabled={action.busy} onClick={() => { action.clear(); if (selected !== item.conversationId) setDraft(""); setSelected(item.conversationId); setPage(1); }}>{item.title || "Untitled conversation"}<br /><small>{date(item.updatedAt)}</small></button>)}</div><Pagination page={conversationPage} meta={conversations.meta} change={setConversationPage} /></section>
    <section className="card"><div className="row"><h2>Coach chat</h2>{selected && <button className="danger" disabled={action.busy} onClick={() => { if (window.confirm("Delete this conversation and its messages?")) void action.run(async () => { await request(`/coach/conversations/${selected}`, { method: "DELETE" }); setSelected(null); setPage(1); conversations.reload(); }, "Conversation deleted."); }}>Delete conversation</button>}</div>
      {!selected && <Empty>Create a conversation to begin. Your recorded metrics will be fetched securely by the backend.</Empty>}<ResourceState {...messages} />
      {selected && <><div className="messages" aria-live="polite">{messages.data?.length === 0 && <Empty>Ask about your spending, savings, or a financial goal.</Empty>}{messages.data?.filter(item => item.role !== "SYSTEM").map(item => <article className={`message ${item.role.toLowerCase()}`} key={item.messageId}><small>{item.role === "USER" ? "You" : "Upay Coach"}</small>{item.message}</article>)}{action.busy && <p role="status" className="loading">Working on your request… Coaching can take up to a minute.</p>}</div><Pagination page={page} meta={messages.meta} change={setPage} />
        <button className="text-button" type="button" disabled={action.busy} onClick={messages.reload}>Reload messages before retrying an uncertain send</button>
        <form onChange={action.clear} onInvalidCapture={action.clear} className="section-space" onSubmit={send}><fieldset disabled={action.busy || messages.loading || Boolean(messages.error)}><div className="grid two"><Field label="Coach language"><select name="language"><option value="en">English</option><option value="bn">Bangla</option><option value="banglish">Banglish</option></select></Field><Field label="Discuss a goal (optional)"><select name="goalId"><option value="">All finances</option>{goals.data?.map(goal => <option key={goal.goalId} value={goal.goalId}>{goal.goalName}</option>)}</select></Field></div><ResourceState {...goals} />
          <Field label="Your message"><textarea required minLength={1} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="How can I improve my spending habits?" /></Field><div className="row"><small className="muted">{draft.length}/2000 characters</small><button type="submit" disabled={!draft.trim()}>Send to coach</button></div></fieldset></form></>}
    </section></div><div className="section-space"><Recommendations key={recommendationVersion} /></div></>;
}
