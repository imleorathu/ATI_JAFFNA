import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  BookOpen,
  CheckCircle2,
  Code2,
  Database,
  FileText,
  Languages,
  Link as LinkIcon,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { useLocation } from "react-router-dom";
import GlassCard from "./GlassCard";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const quickPrompts = [
  "What is the due date for SE assignment?",
  "Summarize week 5 lecture",
  "What are the exam rules?",
  "Give me notes for database normalization",
  "What announcements were posted today?"
];

const starterMessage = {
  id: 1,
  sender: "bot",
  text: "Hi, I am your ATI Jaffna RAG assistant. Ask a question and I will search department materials before answering."
};

function localAssistantAnswer(question) {
  const lower = question.toLowerCase();
  if (lower.includes("upload") || lower.includes("document")) return "Log in to the student or faculty portal to use RAG document upload and indexed knowledge search.";
  if (lower.includes("assignment") || lower.includes("due")) return "Assignment due dates are available inside the student portal. The RAG assistant can answer from uploaded department materials after login.";
  if (lower.includes("attendance")) return "Attendance is managed in the student portal with GPS-based rules and department-scoped staff reports.";
  return "Please log in to use the full RAG assistant with document retrieval, conversation history, and department knowledge search.";
}

function nextId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderMarkdown(text) {
  const parts = String(text || "").split(/(```[\s\S]*?```)/g);
  return parts.map((part, index) => {
    if (part.startsWith("```")) {
      const code = part.replace(/^```[a-zA-Z0-9]*\n?/, "").replace(/```$/, "");
      return (
        <pre key={index} className="my-3 overflow-x-auto rounded-lg border border-[color:var(--md-border)] bg-slate-950 p-3 text-xs text-sky-100">
          <code>{code}</code>
        </pre>
      );
    }
    return part.split("\n").map((line, lineIndex) => {
      const html = line
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code class='rounded bg-black/20 px-1 py-0.5 text-sky-200'>$1</code>");
      return <p key={`${index}-${lineIndex}`} className="mb-2" dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />;
    });
  });
}

function Avatar({ sender }) {
  const isBot = sender === "bot";
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isBot ? "bg-sky-500 text-slate-950" : "bg-[color:var(--md-hover)] text-[color:var(--md-text-primary)]"}`}>
      {isBot ? <Bot size={16} /> : <span className="text-xs font-black">U</span>}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-4 py-3">
      {[0, 1, 2].map((dot) => (
        <span key={dot} className="h-2 w-2 rounded-full bg-[color:var(--md-text-secondary)]" style={{ animation: `aiTyping 1.1s ${dot * 0.16}s infinite ease-in-out` }} />
      ))}
    </div>
  );
}

export default function AIAssistant() {
  const location = useLocation();
  const isPortalPage = location.pathname.includes("/ai-assistant");
  return isPortalPage ? <AIAssistantPage /> : <FloatingAssistant />;
}

function readChatHistory(historyKey) {
  try {
    return JSON.parse(localStorage.getItem(historyKey) || "null") || [starterMessage];
  } catch {
    return [starterMessage];
  }
}

function useRagChat(activeDocumentId = "", userKey = "guest") {
  const historyKey = `atiAiHistory:${userKey}:${activeDocumentId || "general"}`;
  const [activeHistoryKey, setActiveHistoryKey] = useState(historyKey);
  const [messages, setMessages] = useState(() => readChatHistory(historyKey));
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setActiveHistoryKey(historyKey);
    setMessages(readChatHistory(historyKey));
  }, [historyKey]);

  useEffect(() => {
    if (activeHistoryKey !== historyKey) return;
    try {
      localStorage.setItem(historyKey, JSON.stringify(messages.slice(-40)));
    } catch {
      // Ignore localStorage write failures; chat can still continue.
    }
  }, [activeHistoryKey, historyKey, messages]);

  const sendMessage = async (text) => {
    const question = String(text || "").trim();
    if (!question || isTyping) return;
    const botId = nextId();
    setMessages((current) => [...current, { id: nextId(), sender: "user", text: question }, { id: botId, sender: "bot", text: "" }]);
    setIsTyping(true);

    try {
      const token = localStorage.getItem("atiToken");
      if (!token) {
        const answer = localAssistantAnswer(question);
        for (const word of answer.split(/(\s+)/)) {
          await new Promise((resolve) => setTimeout(resolve, 10));
          setMessages((current) => current.map((message) => (message.id === botId ? { ...message, text: `${message.text}${word}` } : message)));
        }
        return;
      }
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message: question, documentId: activeDocumentId })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to get AI response.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = result.done;
        const chunk = decoder.decode(result.value || new Uint8Array(), { stream: !done });
        if (chunk) {
          setMessages((current) => current.map((message) => (message.id === botId ? { ...message, text: `${message.text}${chunk}` } : message)));
        }
      }
    } catch (error) {
      setMessages((current) => current.map((message) => (message.id === botId ? { ...message, text: error.message || "AI response failed." } : message)));
    } finally {
      setIsTyping(false);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(historyKey);
    setMessages([starterMessage]);
  };
  return { messages, setMessages, isTyping, sendMessage, clearHistory };
}

function ChatSurface({ compact = false, activeDocument = null, allowStudentDocumentUpload = false, onTemporaryDocumentUploaded, onClearActiveDocument }) {
  const { user } = useAuth();
  const userKey = String(user?.id || user?._id || user?.email || "guest");
  const { messages, setMessages, isTyping, sendMessage, clearHistory } = useRagChat(activeDocument?._id || "", userKey);
  const [input, setInput] = useState("");
  const [documentUploading, setDocumentUploading] = useState(false);
  const inputRef = useRef(null);
  const privateFileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const submit = (textOverride) => {
    const text = textOverride || input;
    sendMessage(text);
    setInput("");
  };

  const uploadPrivateDocument = async (file) => {
    if (!file) return;
    setDocumentUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      formData.append("topicModule", "Private student AI document");
      const created = await apiFetch("/api/ai/knowledge", { method: "POST", body: formData });
      const nextMessages = [
        starterMessage,
        {
          id: nextId(),
          sender: "bot",
          text: `I read **${created.title}**. Ask me to summarize it, create 10 questions, explain topics, or answer anything from this document.`
        }
      ];
      localStorage.setItem(`atiAiHistory:${userKey}:${created._id}`, JSON.stringify(nextMessages));
      onTemporaryDocumentUploaded?.(created);
      setMessages(nextMessages);
    } catch (error) {
      setMessages((current) => [...current, { id: nextId(), sender: "bot", text: error.message || "Unable to upload this document." }]);
    } finally {
      setDocumentUploading(false);
    }
  };

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden ${compact ? "h-full" : "h-[calc(100vh-220px)] rounded-lg border border-[color:var(--md-border)] bg-[#0f172a]/80"}`}>
      <div className="border-b border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-500 text-slate-950">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">RAG AI Chat Assistant</h2>
              <p className="text-xs text-[color:var(--md-text-secondary)]">
                {activeDocument ? `Reading selected file: ${activeDocument.title}` : "Searching department knowledge and portal context"}
              </p>
            </div>
          </div>
          <button type="button" onClick={clearHistory} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-xs font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
            <Trash2 size={14} />
            Clear
          </button>
        </div>
        {!compact && (
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => submit(prompt)} className="shrink-0 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-xs font-bold text-[color:var(--md-text-secondary)] hover:border-sky-400/50 hover:bg-sky-400/10">
                {prompt}
              </button>
            ))}
            {activeDocument && (
              <button type="button" onClick={() => submit("Summarize this document")} className="shrink-0 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20">
                Summarize this document
              </button>
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex items-start gap-3 ${message.sender === "user" ? "flex-row-reverse" : ""}`}>
            <Avatar sender={message.sender} />
            <div className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-relaxed ${message.sender === "user" ? "bg-sky-500 text-slate-950" : "border border-[color:var(--md-border)] bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)]"}`}>
              {message.text ? renderMarkdown(message.text) : <TypingDots />}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-3">
        <div className="flex gap-2">
          {allowStudentDocumentUpload && (
            <>
              <button
                type="button"
                onClick={() => privateFileInputRef.current?.click()}
                disabled={documentUploading || isTyping}
                title={activeDocument?.visibility === "private" ? "Replace private document" : "Upload private document"}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)] transition hover:border-sky-400/50 hover:bg-sky-400/10 hover:text-[color:var(--md-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Upload size={18} />
              </button>
              <input ref={privateFileInputRef} type="file" accept=".pdf,.docx,.pptx,.txt" disabled={documentUploading} onChange={(event) => { uploadPrivateDocument(event.target.files?.[0]); event.target.value = ""; }} className="hidden" />
            </>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={activeDocument ? "Ask anything about this selected document..." : "Ask about assignments, lecture notes, announcements, rules..."}
            className="min-h-12 min-w-0 flex-1 resize-none rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-4 py-3 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400/60"
          />
          <button type="button" onClick={() => submit()} disabled={!input.trim() || isTyping} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-slate-950 transition hover:bg-sky-400 disabled:bg-[color:var(--md-hover)] disabled:text-[color:var(--md-text-secondary)]">
            <Send size={18} />
          </button>
          {allowStudentDocumentUpload && activeDocument?.visibility === "private" && (
            <button
              type="button"
              onClick={onClearActiveDocument}
              disabled={documentUploading || isTyping}
              title="Clear private document context"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-500/10 text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes aiTyping {
          0%, 80%, 100% { opacity: 0.35; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

function AIAssistantPage() {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const userKey = String(user?.id || user?._id || user?.email || "guest");
  const isStudent = role === "student";
  const canManage = ["lecturer", "admin"].includes(role);
  const canUpload = ["lecturer", "admin"].includes(role);
  const knowledgeFileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [uploadForm, setUploadForm] = useState({ title: "", topicModule: "", department: "" });
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState({ title: "", topicModule: "" });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadDocuments = async () => {
    setError("");
    try {
      const data = await apiFetch("/api/ai/knowledge");
      const nextDocuments = Array.isArray(data) ? data : [];
      setDocuments(nextDocuments);
    } catch (err) {
      setError(err?.message || "Unable to load knowledge files.");
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const stats = useMemo(
    () => ({
      files: documents.length,
      indexed: documents.filter((item) => item.status === "indexed").length,
      chunks: documents.reduce((sum, item) => sum + Number(item.chunkCount || 0), 0)
    }),
    [documents]
  );

  const uploadDocument = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    setStatus("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", uploadForm.title || file.name);
      formData.append("topicModule", uploadForm.topicModule);
      formData.append("department", uploadForm.department);
      const created = await apiFetch("/api/ai/knowledge", { method: "POST", body: formData });
      setDocuments((current) => [created, ...current]);
      setActiveDocument(created);
      setUploadForm({ title: "", topicModule: "", department: "" });
      setStatus("Document uploaded and indexed. You can ask using full RAG or select this document only.");
    } catch (err) {
      setError(err?.message || "Unable to upload knowledge file.");
    } finally {
      setUploading(false);
    }
  };

  const openUploadPicker = () => {
    if (!canUpload) {
      setError("Please log in before uploading knowledge documents.");
      return;
    }
    knowledgeFileInputRef.current?.click();
  };

  const deleteDocument = async (document) => {
    if (!window.confirm(`Delete ${document.title}?`)) return;
    setError("");
    try {
      await apiFetch(`/api/ai/knowledge/${document._id}`, { method: "DELETE" });
      setDocuments((current) => current.filter((item) => item._id !== document._id));
      localStorage.removeItem(`atiAiHistory:${userKey}:${document._id}`);
      setActiveDocument((current) => (current?._id === document._id ? null : current));
      setStatus("Document cleared. The AI will no longer use that document.");
    } catch (err) {
      setError(err?.message || "Unable to delete knowledge file.");
    }
  };

  const clearActiveDocument = async () => {
    if (!activeDocument) {
      setStatus("No selected document context to clear.");
      return;
    }
    setError("");
    try {
      if (activeDocument.visibility === "private") {
        await apiFetch(`/api/ai/knowledge/${activeDocument._id}`, { method: "DELETE" });
        setDocuments((current) => current.filter((item) => item._id !== activeDocument._id));
      }
      localStorage.removeItem(`atiAiHistory:${userKey}:${activeDocument._id}`);
      setActiveDocument(null);
      setStatus(activeDocument.visibility === "private" ? "Private document cleared. AI will no longer use that document." : "Selected document context cleared. AI will use full department RAG again.");
    } catch (err) {
      setError(err?.message || "Unable to clear selected document.");
    }
  };

  const handleTemporaryDocumentUploaded = (document) => {
    setDocuments((current) => [document, ...current.filter((item) => item._id !== document._id)]);
    setActiveDocument(document);
    setStatus("Private document uploaded. Only your AI Assistant can use this document.");
  };

  const startEditDocument = (document) => {
    setEditingId(document._id);
    setEditForm({ title: document.title || "", topicModule: document.topicModule || "" });
    setError("");
    setStatus("");
  };

  const cancelEditDocument = () => {
    setEditingId("");
    setEditForm({ title: "", topicModule: "" });
  };

  const saveDocument = async (document) => {
    setError("");
    setStatus("");
    try {
      const updated = await apiFetch(`/api/ai/knowledge/${document._id}`, {
        method: "PUT",
        body: JSON.stringify(editForm)
      });
      setDocuments((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      cancelEditDocument();
      setStatus("Knowledge file updated.");
    } catch (err) {
      setError(err?.message || "Unable to update knowledge file.");
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[color:var(--md-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">RAG System</p>
          <h1 className="mt-2 text-2xl font-black text-[color:var(--md-text-primary)] sm:text-3xl">AI Assistant</h1>
          <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">Chat with department knowledge, uploaded course documents, and live portal context using RAG.</p>
        </div>
        <button type="button" onClick={loadDocuments} className="inline-flex w-fit items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200">{error}</div>}
      {status && <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200">{status}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Knowledge Files", stats.files, FileText],
          ["Indexed", stats.indexed, CheckCircle2],
          ["Vector Chunks", stats.chunks, Database]
        ].map(([label, value, Icon]) => (
          <GlassCard key={label} dark className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">{label}</p>
                <p className="mt-2 text-3xl font-black text-[color:var(--md-text-primary)]">{value}</p>
              </div>
              <Icon className="text-sky-300" size={24} />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <ChatSurface
          key={activeDocument?._id || "general-chat"}
          activeDocument={activeDocument}
          allowStudentDocumentUpload={isStudent}
          onTemporaryDocumentUploaded={handleTemporaryDocumentUploaded}
          onClearActiveDocument={clearActiveDocument}
        />

        <div className="space-y-6">
          {canUpload && (
            <GlassCard dark className="p-5">
              <h2 className="text-lg font-black text-[color:var(--md-text-primary)]">Upload Knowledge</h2>
              <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">
                Upload PDF, DOCX, PPTX, or TXT files. AI extracts text, chunks it, stores embeddings, and retrieves relevant context during chat.
              </p>
              <div className="mt-4 space-y-3">
                <input value={uploadForm.title} onChange={(event) => setUploadForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" className="w-full rounded-lg border border-[color:var(--md-border)] bg-slate-950 px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none focus:border-sky-400" />
                <input value={uploadForm.topicModule} onChange={(event) => setUploadForm((current) => ({ ...current, topicModule: event.target.value }))} placeholder="Topic / module / week" className="w-full rounded-lg border border-[color:var(--md-border)] bg-slate-950 px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none focus:border-sky-400" />
                {role === "admin" && (
                  <input value={uploadForm.department} onChange={(event) => setUploadForm((current) => ({ ...current, department: event.target.value }))} placeholder="Department" className="w-full rounded-lg border border-[color:var(--md-border)] bg-slate-950 px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none focus:border-sky-400" />
                )}
                <button type="button" onClick={openUploadPicker} disabled={uploading} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[color:var(--md-border)] bg-slate-950 px-4 py-8 text-sm font-bold text-[color:var(--md-text-secondary)] hover:border-sky-400 hover:text-[color:var(--md-text-primary)] disabled:cursor-not-allowed disabled:opacity-60">
                  <Upload size={18} />
                  {uploading ? "Indexing..." : "Upload document"}
                </button>
                <input ref={knowledgeFileInputRef} type="file" accept=".pdf,.docx,.pptx,.txt" disabled={uploading} onChange={(event) => { uploadDocument(event.target.files?.[0]); event.target.value = ""; }} className="hidden" />
                <button type="button" onClick={clearActiveDocument} className="w-full rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 hover:bg-red-500/20">
                  Clear Selected Document Context
                </button>
              </div>
            </GlassCard>
          )}

          <GlassCard dark className="p-5">
            <h2 className="text-lg font-black text-[color:var(--md-text-primary)]">Knowledge Files</h2>
            <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto">
              {!documents.length && <p className="py-8 text-center text-sm text-[color:var(--md-text-secondary)]">No knowledge files indexed yet.</p>}
              {documents.map((document) => (
                <div key={document._id} className={`rounded-lg border p-3 ${activeDocument?._id === document._id ? "border-sky-400 bg-sky-500/10" : "border-[color:var(--md-border)] bg-[color:var(--md-hover)]"}`}>
                  {editingId === document._id ? (
                    <div className="space-y-3">
                      <input value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-lg border border-[color:var(--md-border)] bg-slate-950 px-3 py-2 text-sm text-[color:var(--md-text-primary)] outline-none focus:border-sky-400" />
                      <input value={editForm.topicModule} onChange={(event) => setEditForm((current) => ({ ...current, topicModule: event.target.value }))} placeholder="Topic / module / week" className="w-full rounded-lg border border-[color:var(--md-border)] bg-slate-950 px-3 py-2 text-sm text-[color:var(--md-text-primary)] outline-none focus:border-sky-400" />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => saveDocument(document)} className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-black text-slate-950 hover:bg-sky-400">Save</button>
                        <button type="button" onClick={cancelEditDocument} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-xs font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-[color:var(--md-text-primary)]">{document.title}</h3>
                        <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">{document.fileType.toUpperCase()} | {document.chunkCount} chunks | {document.topicModule || "General"}</p>
                        <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${document.status === "indexed" ? "bg-emerald-500/15 text-emerald-300" : document.status === "failed" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}`}>
                          {document.status}
                        </span>
                        <button type="button" onClick={() => setActiveDocument(document)} className="mt-2 block rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-1.5 text-xs font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
                          Use only this document
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <a href={document.fileUrl} target="_blank" rel="noreferrer" title="Open file" className="rounded-lg bg-[color:var(--md-hover)] p-2 text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]">
                          <LinkIcon size={15} />
                        </a>
                      {(canManage || String(document.uploadedBy || "") === String(user?.id || user?._id || "")) && (
                          <>
                            <button type="button" onClick={() => startEditDocument(document)} title="Edit knowledge file" className="rounded-lg bg-[color:var(--md-hover)] p-2 text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]">
                              <FileText size={15} />
                            </button>
                            <button type="button" onClick={() => deleteDocument(document)} title="Delete knowledge file" className="rounded-lg bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {document.error && <p className="mt-2 text-xs text-red-200">{document.error}</p>}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          canUpload ? [Upload, activeDocument ? "Upload another document" : "Upload document", openUploadPicker] : null,
          [Code2, "Chunk and embed"],
          [Database, "Retrieve context"],
          [MessageSquare, "Stream answer"]
        ].filter(Boolean).map(([Icon, label, onClick]) => (
          <button key={label} type="button" onClick={onClick || undefined} className={`rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-4 text-left text-sm font-bold text-[color:var(--md-text-secondary)] ${onClick ? "transition hover:border-sky-400/50 hover:bg-sky-400/10 hover:text-[color:var(--md-text-primary)]" : ""}`}>
            <Icon className="mb-3 text-sky-300" size={20} />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-[9999] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 60, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.96 }} transition={{ type: "spring", damping: 24, stiffness: 300 }} className="absolute bottom-20 right-0 flex h-[min(620px,calc(100vh-120px))] w-[calc(100vw-40px)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-[color:var(--md-border)] bg-[#0f172a]/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-500 text-slate-950">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">AI Student Assistant</h2>
                  <p className="text-xs text-[color:var(--md-text-secondary)]">RAG chat in the student portal</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]">
                <X size={18} />
              </button>
            </div>
            <ChatSurface compact />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button type="button" onClick={() => setIsOpen((prev) => !prev)} animate={{ y: [0, -4, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--md-border)] bg-sky-500 text-slate-950 shadow-2xl shadow-sky-500/30">
        {isOpen ? <X size={26} /> : <Bot size={28} />}
      </motion.button>

      <style>{`
        @keyframes aiTyping {
          0%, 80%, 100% { opacity: 0.35; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
