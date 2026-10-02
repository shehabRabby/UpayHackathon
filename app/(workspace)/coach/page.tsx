"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useAction, useResource } from "@/lib/frontend/hooks";
import type { CoachAnswer, Conversation, Goal, Message } from "@/lib/frontend/types";
import { Empty, Field, Notice, PageTitle, Pagination, ResourceState, date } from "@/components/ui";
import { Recommendations } from "@/components/recommendations";
import { ProductIcon } from "@/components/brand";
export default function CoachPage() {
  const { request, session } = useAuth(), action = useAction();
  const [selected, setSelected] = useState<string | null>(null), [page, setPage] = useState(1), [conversationPage, setConversationPage] = useState(1);
  const [draft, setDraft] = useState(""), [recommendationVersion, setRecommendationVersion] = useState(0);
  const [conversationOpen, setConversationOpen] = useState(false), conversationPanelId = useId();
  const [starterPrompt, setStarterPrompt] = useState<string | null>(null);
  const conversationTitle = useRef<HTMLInputElement>(null);
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
    <Notice error={action.error} success={action.success} /><div className="chat-layout section-space"><section className="card conversation-panel">
      <button type="button" className="conversation-disclosure secondary" aria-expanded={conversationOpen} aria-controls={conversationPanelId} onClick={() => setConversationOpen(value => !value)}><ProductIcon name="coach" />Conversations</button>
      <div id={conversationPanelId} className="conversation-content" data-open={conversationOpen}><h2>Conversations</h2><form onChange={action.clear} onInvalidCapture={action.clear} onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const fields = new FormData(form); void action.run(async () => { const response = await request<Conversation>("/coach/conversations", { method: "POST", body: fields.get("title") ? { title: String(fields.get("title")).trim() } : {} }); form.reset(); setDraft(starterPrompt ?? ""); setStarterPrompt(null); setConversationOpen(false); setSelected(response.data.conversationId); setPage(1); conversations.reload(); }, "Conversation created."); }}><fieldset disabled={action.busy}><Field label="Conversation title"><input ref={conversationTitle} name="title" maxLength={200} placeholder="My savings plan" /></Field><button type="submit">New conversation</button></fieldset></form>
      <ResourceState {...conversations} /><div className="conversation-list section-space">{conversations.data?.map(item => <button key={item.conversationId} className={selected === item.conversationId ? "" : "secondary"} aria-pressed={selected === item.conversationId} disabled={action.busy} onClick={() => { action.clear(); if (selected !== item.conversationId) setDraft(""); setStarterPrompt(null); setConversationOpen(false); setSelected(item.conversationId); setPage(1); }}>{item.title || "Untitled conversation"}<br /><small>{date(item.updatedAt)}</small></button>)}</div><Pagination page={conversationPage} meta={conversations.meta} change={setConversationPage} /></div></section>
    <section className="card chat-panel"><div className="row chat-heading"><div><p className="eyebrow">RECORDED DATA · PERSONAL GUIDANCE</p><h2>Coach chat</h2></div>{selected && <button className="danger" disabled={action.busy} onClick={() => { if (window.confirm("Delete this conversation and its messages?")) void action.run(async () => { await request(`/coach/conversations/${selected}`, { method: "DELETE" }); setSelected(null); setPage(1); conversations.reload(); }, "Conversation deleted."); }}>Delete conversation</button>}</div>
      {!selected && <div className="coach-empty"><span className="icon-tile"><ProductIcon name="coach" /></span><h3>Start a conversation about your finances.</h3><p>Choose a topic, then create a conversation. Nothing is sent until you submit a message.</p><div className="prompt-suggestions">{["Help me plan my emergency fund", "Where am I spending the most?", "Can I afford a large purchase?", "How can I improve my savings?"].map(prompt => <button key={prompt} type="button" className="secondary" aria-pressed={starterPrompt === prompt} onClick={() => { setStarterPrompt(prompt); setConversationOpen(true); requestAnimationFrame(() => conversationTitle.current?.focus()); }}>{prompt}<ProductIcon name="arrow" /></button>)}</div>{starterPrompt && <small role="status">Topic selected. Create a conversation to review your draft.</small>}</div>}<ResourceState {...messages} />
      {selected && <><div className="messages" aria-live="polite">{messages.data?.length === 0 && <Empty>Ask about your spending, savings, or a financial goal.</Empty>}{messages.data?.filter(item => item.role !== "SYSTEM").map(item => <article className={`message ${item.role.toLowerCase()}`} key={item.messageId}><small>{item.role === "USER" ? "You" : "Upay Coach"}</small>{item.message}</article>)}{action.busy && <p role="status" className="loading">Working on your request… Coaching can take up to a minute.</p>}</div><Pagination page={page} meta={messages.meta} change={setPage} />
        <button className="text-button" type="button" disabled={action.busy} onClick={messages.reload}>Reload messages before retrying an uncertain send</button>
        <form onChange={action.clear} onInvalidCapture={action.clear} className="chat-composer" onSubmit={send}><fieldset disabled={action.busy || messages.loading || Boolean(messages.error)}><div className="grid two"><Field label="Coach language"><select name="language"><option value="en">English</option><option value="bn">Bangla</option><option value="banglish">Banglish</option></select></Field><Field label="Discuss a goal (optional)"><select name="goalId"><option value="">All finances</option>{goals.data?.map(goal => <option key={goal.goalId} value={goal.goalId}>{goal.goalName}</option>)}</select></Field></div><ResourceState {...goals} />
          <Field label="Your message"><textarea required minLength={1} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="How can I improve my spending habits?" /></Field><div className="row"><small className="muted">{draft.length}/2000 characters</small><button type="submit" disabled={!draft.trim()}>Send to coach</button></div></fieldset></form></>}
    </section></div><div className="section-space"><Recommendations key={recommendationVersion} /></div></>;
}
