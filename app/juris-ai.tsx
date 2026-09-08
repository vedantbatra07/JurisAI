"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowUp, ExternalLink, FileText, MapPin, Menu, Paperclip, Plus, Scale, Shield, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentGroup, AttachmentMedia, AttachmentTitle } from "@/components/ui/attachment";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";

type Message = { id: number; role: "user" | "assistant"; content: string; error?: boolean };
type ChatSession = { id: string; title: string; jurisdiction: string; messages: Message[]; updatedAt: number };
type PendingAttachment = { id: string; name: string; mimeType: string; data: string; size: number };


const jurisdictions = [
  "Delhi, India", "Mumbai, Maharashtra, India", "Bengaluru, Karnataka, India", "Kolkata, West Bengal, India",
  "Chennai, Tamil Nadu, India", "Hyderabad, Telangana, India", "Pune, Maharashtra, India", "Ahmedabad, Gujarat, India",
  "Jaipur, Rajasthan, India", "Lucknow, Uttar Pradesh, India", "Noida, Uttar Pradesh, India", "Gurugram, Haryana, India",
  "Chandigarh, India", "Kochi, Kerala, India", "Bhopal, Madhya Pradesh, India", "Patna, Bihar, India",
  "Bhubaneswar, Odisha, India", "Guwahati, Assam, India", "Dehradun, Uttarakhand, India", "Shimla, Himachal Pradesh, India",
  "Srinagar, Jammu and Kashmir, India", "India", "United States", "United Kingdom", "Canada", "Australia",
];

const acceptedTypes = new Set(["application/pdf", "text/plain", "text/markdown", "text/csv", "application/json", "image/png", "image/jpeg", "image/webp"]);
const MAX_TOTAL_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const domainPattern = /^(?:https?:\/\/|www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?$/i;
const tokenPattern = /(\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s<]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z]{2,})(?:\/[^\s<]*)?)/gi;

function cleanHref(value: string) {
  const clean = value.replace(/^[`(]+|[`),.;:]+$/g, "");
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
}

function renderInline(text: string) {
  return text.split(tokenPattern).filter(Boolean).map((part, index) => {
    const markdownLink = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/i);
    if (markdownLink) {
      return <a key={index} href={cleanHref(markdownLink[2])} target="_blank" rel="noopener noreferrer" className="source-link">{markdownLink[1]} <ExternalLink size={13} /></a>;
    }
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) {
      const inner = part.slice(1, -1);
      if (domainPattern.test(inner)) return <a key={index} href={cleanHref(inner)} target="_blank" rel="noopener noreferrer" className="source-link">{inner} <ExternalLink size={13} /></a>;
      return <span key={index} className="legal-term">{inner}</span>;
    }
    if (/^https?:\/\//i.test(part) || domainPattern.test(part)) {
      const label = part.replace(/^https?:\/\//i, "").replace(/\/$/, "");
      return <a key={index} href={cleanHref(part)} target="_blank" rel="noopener noreferrer" className="source-link">{label} <ExternalLink size={13} /></a>;
    }
    return <span key={index}>{part}</span>;
  });
}

function LegalMessage({ content }: { content: string }) {
  return <div className="message-content">{content.split("\n").map((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return <div className="message-spacer" key={index} />;
    if (/^-{3,}$/.test(line)) return null;
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) return <h3 key={index}>{renderInline(heading[1])}</h3>;
    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) return <div className="legal-list-row" key={index}><span className="list-marker">{numbered[1]}.</span><span>{renderInline(numbered[2])}</span></div>;
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) return <div className="legal-list-row" key={index}><span className="list-marker">•</span><span>{renderInline(bullet[1])}</span></div>;
    return <p key={index}>{renderInline(line)}</p>;
  })}</div>;
}

export default function JurisAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [jurisdiction, setJurisdiction] = useState("Delhi, India");
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [historyReady, setHistoryReady] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const syncViewport = () => {
      const height = viewport?.height ?? window.innerHeight;
      const top = viewport?.offsetTop ?? 0;
      root.style.setProperty("--app-height", `${Math.round(height)}px`);
      root.style.setProperty("--app-top", `${Math.round(top)}px`);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      root.style.removeProperty("--app-height");
      root.style.removeProperty("--app-top");
    };
  }, []);

  useEffect(() => {
    let saved: ChatSession[] = [];
    try {
      const parsed = JSON.parse(sessionStorage.getItem("jurisai-chats") ?? "[]") as ChatSession[];
      if (Array.isArray(parsed)) saved = parsed.slice(0, 30);
    } catch { /* Ignore damaged session history. */ }
    const initialId = makeId();
    queueMicrotask(() => {
      setSessions(saved);
      setCurrentId(initialId);
      setHistoryReady(true);
    });
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    sessionStorage.setItem("jurisai-chats", JSON.stringify(sessions.slice(0, 30)));
  }, [sessions, historyReady]);

  useEffect(() => {
    if (!historyReady || !currentId || messages.length === 0) return;
    const firstQuestion = messages.find((message) => message.role === "user")?.content ?? "Legal consultation";
    const session: ChatSession = { id: currentId, title: firstQuestion.slice(0, 42), jurisdiction, messages, updatedAt: Date.now() };
    queueMicrotask(() => {
      setSessions((current) => [session, ...current.filter((item) => item.id !== currentId)].slice(0, 30));
    });
  }, [messages, jurisdiction, currentId, historyReady]);

  const startNew = () => {
    setMessages([]);
    setInput("");
    setAttachments([]);
    setCurrentId(makeId());
    setConnectionError(null);
    setMenuOpen(false);
  };

  const openSession = (session: ChatSession) => {
    setCurrentId(session.id);
    setMessages(session.messages);
    setJurisdiction(session.jurisdiction);
    setAttachments([]);
    setConnectionError(null);
    setMenuOpen(false);
  };

  const deleteSession = (id: string) => {
    setSessions((current) => current.filter((session) => session.id !== id));
    if (currentId === id) startNew();
  };

  async function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, 3 - attachments.length));
    let selectedBytes = attachments.reduce((total, file) => total + file.size, 0);
    for (const file of files) {
      if (!acceptedTypes.has(file.type) || selectedBytes + file.size > MAX_TOTAL_ATTACHMENT_BYTES) {
        setConnectionError(`${file.name} couldn’t be added. Use PDF, TXT, Markdown, CSV, JSON, PNG, JPG or WebP files, with attachments totaling no more than 3 MB.`);
        continue;
      }
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      selectedBytes += file.size;
      setAttachments((current) => [...current, { id: makeId(), name: file.name, mimeType: file.type, data, size: file.size }].slice(0, 3));
    }
    event.target.value = "";
  }

  async function submit(event?: FormEvent, suggested?: string) {
    event?.preventDefault();
    const typedContent = (suggested ?? input).trim();
    if ((!typedContent && attachments.length === 0) || loading) return;
    const attachmentNames = attachments.map((file) => file.name).join(", ");
    const content = typedContent || attachmentNames;
    const attachmentLabel = typedContent && attachmentNames ? `\n\nAttached: ${attachmentNames}` : "";
    const userMessage: Message = { id: Date.now(), role: "user", content: `${content}${attachmentLabel}` };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setConnectionError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          jurisdiction,
          attachments: attachments.map(({ name, mimeType, data }) => ({ name, mimeType, data })),
        }),
      });
      setAttachments([]);
      const raw = await response.text();
      let data: { text?: string; error?: string } = {};
      try { data = JSON.parse(raw) as { text?: string; error?: string }; } catch { data = {}; }
      const reply = data.text ?? data.error ?? "The legal assistant is temporarily unavailable.";
      setConnectionError(response.ok ? null : reply);
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", content: reply, error: !response.ok }]);
    } catch {
      const reply = "I couldn’t connect. Your question is still here—please try again.";
      setConnectionError(reply);
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", content: reply, error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><Scale size={18} /></div>
          <span className="brand-name">JurisAI</span>
          <button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={19} /></button>
        </div>

        <button className="new-chat" onClick={startNew}><Plus size={17} /> New chat</button>

        <div className="side-section">
          <p className="side-label">Jurisdiction</p>
          <Combobox value={jurisdiction} onValueChange={(value) => setJurisdiction(value ?? "")} items={jurisdictions}>
            <ComboboxInput className="jurisdiction-combobox" placeholder="Type a city or state" aria-label="Jurisdiction" showClear />
            <ComboboxContent className="jurisdiction-options">
              <ComboboxEmpty>No matching place</ComboboxEmpty>
              <ComboboxList>{jurisdictions.map((place) => <ComboboxItem key={place} value={place}>{place}</ComboboxItem>)}</ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>

        <div className="history-section">
          <p className="side-label">Recent chats</p>
          <div className="history-list">
            {sessions.length === 0 ? <p className="history-empty">Your consultations will appear here.</p> : sessions.map((session) => (
              <div className={`history-item ${session.id === currentId ? "active" : ""}`} key={session.id}>
                <button className="history-open" onClick={() => openSession(session)}><span>{session.title}</span><small>{session.jurisdiction}</small></button>
                <button className="history-delete" onClick={() => deleteSession(session.id)} aria-label={`Delete ${session.title}`}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-spacer" />
        <div className="privacy-note"><Shield size={15} /><span>Chats are kept only for this browser tab. Don’t share passwords, OTPs, or identity numbers.</span></div>
      </aside>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}

      <section className="chat-area">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="mobile-brand"><Scale size={17} /><strong>JurisAI</strong></div>
          <div className="model-name">JurisAI <span>Legal assistant</span></div>
          <div className="top-jurisdiction"><MapPin size={13} /> {jurisdiction || "Set jurisdiction"}</div>
        </header>

        <div className="conversation">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-mark"><Scale size={26} /></div>
              <h1>How can I help?</h1>
              <p>Describe your legal situation. I’ll explain what it may mean and the practical steps you can take.</p>
             
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article key={message.id} className={`message ${message.role} ${message.error ? "error" : ""}`}>
                  {message.role === "assistant" && <div className="assistant-avatar"><Scale size={16} /></div>}
                  <div className="message-body"><div className="message-meta">{message.role === "assistant" ? "JurisAI" : "You"}</div><LegalMessage content={message.content} /></div>
                </article>
              ))}
              {loading && <article className="message assistant"><div className="assistant-avatar"><Scale size={16} /></div><div className="message-body"><div className="message-meta">JurisAI</div><div className="thinking"><span /><span /><span /></div></div></article>}
            </div>
          )}
        </div>

        <div className="composer-wrap">
          {connectionError && <div className="connection-banner" role="alert"><AlertCircle size={16} /><span>{connectionError}</span></div>}
          <form className="composer" onSubmit={(event) => submit(event)}>
            {attachments.length > 0 && <AttachmentGroup className="pending-files">{attachments.map((file) => (
              <Attachment key={file.id} size="sm" className="pending-file">
                <AttachmentMedia><FileText size={16} /></AttachmentMedia>
                <AttachmentContent><AttachmentTitle>{file.name}</AttachmentTitle><AttachmentDescription>{Math.ceil(file.size / 1024)} KB</AttachmentDescription></AttachmentContent>
                <AttachmentActions><AttachmentAction onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))} aria-label={`Remove ${file.name}`}><X size={14} /></AttachmentAction></AttachmentActions>
              </Attachment>
            ))}</AttachmentGroup>}
            <Textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="Message JurisAI" rows={2} maxLength={6000} aria-label="Legal question" />
            <div className="composer-actions">
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp" multiple className="file-input" onChange={addFiles} />
              <button type="button" className="attach-button" onClick={() => fileInputRef.current?.click()} aria-label="Attach document" title="Attach up to 3 documents"><Paperclip size={18} /></button>
              <Button type="submit" disabled={(!input.trim() && attachments.length === 0) || loading} className="send-button" aria-label="Send question"><ArrowUp size={18} /></Button>
            </div>
          </form>
          <p className="disclaimer">JurisAI can make mistakes. Verify important information with a qualified lawyer.</p>
        </div>
      </section>
    </main>
  );
}

