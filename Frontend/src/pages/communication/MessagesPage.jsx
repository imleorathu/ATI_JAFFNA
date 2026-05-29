import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Clipboard,
  Download,
  Filter,
  Mail,
  MessageSquare,
  RefreshCw,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  UserCheck,
  X
} from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch, downloadCsv } from "../../lib/api";

const emptyDraft = {
  subject: "",
  message: ""
};

const statusStyles = {
  new: "bg-sky-500/15 text-sky-300",
  read: "bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)]",
  resolved: "bg-emerald-500/15 text-emerald-300",
  archived: "bg-slate-500/15 text-slate-300"
};

const priorityStyles = {
  low: "bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)]",
  normal: "bg-blue-500/15 text-blue-300",
  high: "bg-amber-500/15 text-amber-300",
  urgent: "bg-red-500/15 text-red-300"
};

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function mailtoFor(message, draft = emptyDraft) {
  const subject = draft.subject || `Re: ${message.subject || "ATI Jaffna inquiry"}`;
  const body = draft.message || `Hello ${message.name},\n\n`;
  return `mailto:${message.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function StaffMessagesPage({ role }) {
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [draft, setDraft] = useState(emptyDraft);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const loadMessages = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/contacts");
      setMessages(data);
      setSelectedId((current) => current || data[0]?._id || "");
    } catch (err) {
      setError(err?.message || "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const selectedMessage = useMemo(
    () => messages.find((message) => message._id === selectedId) || messages[0] || null,
    [messages, selectedId]
  );

  useEffect(() => {
    if (!selectedMessage) return;
    setNote(selectedMessage.internalNote || "");
    setDraft({
      subject: `Re: ${selectedMessage.subject || "ATI Jaffna inquiry"}`,
      message: `Hello ${selectedMessage.name},\n\nThank you for contacting ATI Jaffna.\n\n`
    });
  }, [selectedMessage?._id]);

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLowerCase();
    return messages.filter((message) => {
      const matchesSearch =
        !query ||
        [message.name, message.email, message.subject, message.message, message.category, message.priority, message.status, message.department, message.studentId]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || message.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || message.priority === priorityFilter;
      const matchesCategory = categoryFilter === "all" || (message.category || "general") === categoryFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [messages, search, statusFilter, priorityFilter, categoryFilter]);

  const stats = useMemo(
    () => ({
      total: messages.length,
      new: messages.filter((message) => message.status === "new").length,
      urgent: messages.filter((message) => message.priority === "urgent").length,
      resolved: messages.filter((message) => message.status === "resolved").length
    }),
    [messages]
  );

  const updateMessage = async (message, patch) => {
    setSaving(message._id);
    setError("");
    try {
      const updated = await apiFetch(`/api/contacts/${message._id}`, {
        method: "PUT",
        body: JSON.stringify(patch)
      });
      setMessages((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      setToast("Message updated");
      setTimeout(() => setToast(""), 1800);
      return updated;
    } catch (err) {
      setError(err?.message || "Unable to update message.");
      return null;
    } finally {
      setSaving("");
    }
  };

  const deleteMessage = async (message) => {
    const confirmed = window.confirm(`Delete message from ${message.name}?`);
    if (!confirmed) return;

    setSaving(message._id);
    setError("");
    try {
      await apiFetch(`/api/contacts/${message._id}`, { method: "DELETE" });
      setMessages((current) => current.filter((item) => item._id !== message._id));
      setSelectedId((current) => (current === message._id ? "" : current));
      setSelectedIds((current) => current.filter((id) => id !== message._id));
      setToast("Message deleted");
      setTimeout(() => setToast(""), 1800);
    } catch (err) {
      setError(err?.message || "Unable to delete message.");
    } finally {
      setSaving("");
    }
  };

  const runBulkUpdate = async (patch) => {
    const targets = messages.filter((message) => selectedIds.includes(message._id));
    if (!targets.length) return;

    setError("");
    try {
      const updated = await Promise.all(
        targets.map((message) =>
          apiFetch(`/api/contacts/${message._id}`, {
            method: "PUT",
            body: JSON.stringify(patch)
          })
        )
      );
      setMessages((current) => current.map((message) => updated.find((item) => item._id === message._id) || message));
      setSelectedIds([]);
      setToast(`${targets.length} message${targets.length === 1 ? "" : "s"} updated`);
      setTimeout(() => setToast(""), 1800);
    } catch (err) {
      setError(err?.message || "Bulk update failed.");
    }
  };

  const exportMessages = () => {
    downloadCsv(
      "ati-contact-messages.csv",
      filteredMessages.map((message) => ({
        name: message.name,
        email: message.email,
          subject: message.subject,
          status: message.status,
          priority: message.priority,
          category: message.category,
          department: message.department,
          studentId: message.studentId,
          assignedTo: message.assignedTo,
        createdAt: message.createdAt,
        message: message.message
      }))
    );
  };

  const copyEmail = async (email) => {
    await navigator.clipboard.writeText(email);
    setToast("Email copied");
    setTimeout(() => setToast(""), 1800);
  };

  const openReply = async () => {
    if (!selectedMessage) return;
    await updateMessage(selectedMessage, { status: "read", repliedAt: new Date().toISOString() });
    window.location.href = mailtoFor(selectedMessage, draft);
  };

  const saveNote = async () => {
    if (!selectedMessage) return;
    await updateMessage(selectedMessage, { internalNote: note });
  };

  const toggleSelected = (id) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const allFilteredSelected = filteredMessages.length > 0 && filteredMessages.every((message) => selectedIds.includes(message._id));

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between" style={{borderBottom:"1px solid var(--md-border)"}}>
        <div>
          <p className="portal-page-label">Communication</p>
          <h1 className="portal-page-title">{role === "lecturer" ? "Department Complaints" : "Admin Messages"}</h1>
          <p className="portal-page-subtitle">
            {role === "lecturer" ? "Manage complaints sent by students in your assigned department only." : "Manage contact inquiries, replies, priorities, notes, and message status."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadMessages} type="button" className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={exportMessages} type="button" className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-sky-400">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {error && <div className="portal-alert-danger">{error}</div>}
      {toast && <div className="portal-alert-success">{toast}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total", stats.total, MessageSquare, "text-[color:var(--md-text-primary)]"],
          ["New", stats.new, Mail, "text-sky-300"],
          ["Urgent", stats.urgent, Star, "text-red-300"],
          ["Resolved", stats.resolved, CheckCircle2, "text-emerald-300"]
        ].map(([label, value, Icon, color]) => (
          <GlassCard key={label} dark className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="portal-stat-label">{label}</p>
                <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
              </div>
              <Icon className={color} size={24} />
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-slate-950 px-3 py-2.5">
            <Search size={16} className="text-[color:var(--md-text-secondary)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, subject, message, status..."
              className="" style={{width:"100%"}}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={["all", "new", "read", "resolved", "archived"]} />
            <FilterSelect value={priorityFilter} onChange={setPriorityFilter} options={["all", "low", "normal", "high", "urgent"]} />
            <FilterSelect value={categoryFilter} onChange={setCategoryFilter} options={["all", "general", "fees", "academic", "technical"]} />
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setPriorityFilter("all");
                setCategoryFilter("all");
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]"
            >
              <X size={15} />
              Clear
            </button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-sky-400/20 bg-sky-500/10 p-3">
            <span className="mr-2 text-sm font-bold text-sky-100">{selectedIds.length} selected</span>
            <BulkButton onClick={() => runBulkUpdate({ status: "read" })} icon={Mail} label="Mark read" />
            <BulkButton onClick={() => runBulkUpdate({ status: "resolved" })} icon={CheckCircle2} label="Resolve" />
            <BulkButton onClick={() => runBulkUpdate({ status: "archived" })} icon={Archive} label="Archive" />
            <button type="button" onClick={() => setSelectedIds([])} className="ml-auto rounded-lg px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
              Clear selection
            </button>
          </div>
        )}
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[color:var(--md-border)] p-4">
            <div>
              <h2 className="classroom-section-title">Inbox</h2>
              <p className="text-xs text-[color:var(--md-text-secondary)]">{filteredMessages.length} visible messages</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-[color:var(--md-text-secondary)]">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={(event) => setSelectedIds(event.target.checked ? filteredMessages.map((message) => message._id) : [])}
                className="h-4 w-4 accent-sky-400"
              />
              Select all
            </label>
          </div>
          <div className="max-h-[680px] overflow-y-auto">
            {loading ? (
              <p className="p-8 text-center text-sm text-[color:var(--md-text-secondary)]">Loading messages...</p>
            ) : filteredMessages.length === 0 ? (
              <p className="p-8 text-center text-sm text-[color:var(--md-text-secondary)]">No messages match your filters.</p>
            ) : (
              filteredMessages.map((message) => {
                const active = selectedMessage?._id === message._id;
                return (
                  <button
                    type="button"
                    key={message._id}
                    onClick={() => setSelectedId(message._id)}
                    className={`flex w-full gap-3 border-b border-[color:var(--md-border)] p-4 text-left transition hover:bg-[color:var(--md-hover)] ${active ? "bg-sky-500/10" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(message._id)}
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => toggleSelected(message._id)}
                      className="mt-1 h-4 w-4 shrink-0 accent-sky-400"
                    />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sm font-black text-sky-200">
                      {message.name?.slice(0, 2).toUpperCase() || "MS"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[color:var(--md-text-primary)]">{message.name}</p>
                          <p className="truncate text-xs text-[color:var(--md-text-secondary)]">{message.email}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-[color:var(--md-text-secondary)]">{formatDate(message.createdAt)}</span>
                      </div>
                      <p className="mt-2 truncate text-sm font-bold text-[color:var(--md-text-secondary)]">{message.subject}</p>
                      <p className="mt-1 max-h-10 overflow-hidden text-sm text-[color:var(--md-text-secondary)]">{message.message}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className={statusStyles[message.status] || statusStyles.new}>{message.status || "new"}</Badge>
                        <Badge className={priorityStyles[message.priority] || priorityStyles.normal}>{message.priority || "normal"}</Badge>
                        <Badge className="bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)]">{message.category || "general"}</Badge>
                        {message.department && <Badge className="bg-sky-500/10 text-sky-200">{message.department}</Badge>}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          {!selectedMessage ? (
            <div className="flex min-h-[420px] items-center justify-center text-center text-[color:var(--md-text-secondary)]">
              <div>
                <MessageSquare className="mx-auto mb-3" size={36} />
                <p className="text-sm">Select a message to view details.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-start sm:justify-between" style={{borderBottom:"1px solid var(--md-border)"}}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">Selected Message</p>
                  <h2 className="mt-2 text-xl font-black text-[color:var(--md-text-primary)]">{selectedMessage.subject}</h2>
                  <p className="portal-page-subtitle">{formatDate(selectedMessage.createdAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <IconButton title="Reply" onClick={openReply} icon={Reply} />
                  <IconButton title="Copy email" onClick={() => copyEmail(selectedMessage.email)} icon={Clipboard} />
                  <IconButton title="Archive" onClick={() => updateMessage(selectedMessage, { status: "archived" })} icon={Archive} />
                  <IconButton title="Delete" onClick={() => deleteMessage(selectedMessage)} icon={Trash2} danger />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="From" value={selectedMessage.name} />
                <Info label="Email" value={selectedMessage.email} />
                <Info label="Department" value={selectedMessage.department || "General contact"} />
                <Info label="Student ID" value={selectedMessage.studentId || "-"} />
                <Info label="Status" value={selectedMessage.status || "new"} />
                <Info label="Replied" value={selectedMessage.repliedAt ? formatDate(selectedMessage.repliedAt) : "Not yet"} />
              </div>

              <div className="rounded-lg border border-[color:var(--md-border)] bg-slate-950/60 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">Message</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--md-text-secondary)]">{selectedMessage.message}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <DetailSelect
                  label="Status"
                  value={selectedMessage.status || "new"}
                  options={["new", "read", "resolved", "archived"]}
                  onChange={(value) => updateMessage(selectedMessage, { status: value })}
                  disabled={saving === selectedMessage._id}
                />
                <DetailSelect
                  label="Priority"
                  value={selectedMessage.priority || "normal"}
                  options={["low", "normal", "high", "urgent"]}
                  onChange={(value) => updateMessage(selectedMessage, { priority: value })}
                  disabled={saving === selectedMessage._id}
                />
                <DetailSelect
                  label="Category"
                  value={selectedMessage.category || "general"}
                  options={["general", "fees", "academic", "technical"]}
                  onChange={(value) => updateMessage(selectedMessage, { category: value })}
                  disabled={saving === selectedMessage._id}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">Assign to</span>
                    <input
                      value={selectedMessage.assignedTo || ""}
                      onChange={(event) =>
                        setMessages((current) =>
                          current.map((message) => (message._id === selectedMessage._id ? { ...message, assignedTo: event.target.value } : message))
                        )
                      }
                      onBlur={(event) => updateMessage(selectedMessage, { assignedTo: event.target.value })}
                      placeholder="Admin name or department"
                      className="mt-2 w-full portal-input"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">Internal note</span>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={5}
                      placeholder="Add private admin notes..."
                      className="mt-2 w-full resize-none portal-input"
                    />
                  </label>
                  <button type="button" onClick={saveNote} className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-primary)] hover:bg-[color:var(--md-hover)]">
                    <UserCheck size={16} />
                    Save note
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">Reply subject</span>
                    <input
                      value={draft.subject}
                      onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
                      className="mt-2 w-full portal-input"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">Reply draft</span>
                    <textarea
                      value={draft.message}
                      onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))}
                      rows={5}
                      className="mt-2 w-full resize-none portal-input"
                    />
                  </label>
                  <a
                    href={mailtoFor(selectedMessage, draft)}
                    onClick={() => updateMessage(selectedMessage, { status: "read", repliedAt: new Date().toISOString() })}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-black text-slate-950 hover:bg-sky-400"
                  >
                    <Send size={16} />
                    Open email reply
                  </a>
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </section>
  );
}

function StudentComplaintCenter({ user }) {
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({ subject: "", category: "academic", priority: "normal", message: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const department = user?.studentProfile?.department || "";

  const loadMessages = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/contacts");
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Unable to load your complaints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const sendComplaint = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setToast("");
    try {
      const created = await apiFetch("/api/contacts", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMessages((current) => [created, ...current]);
      setForm({ subject: "", category: "academic", priority: "normal", message: "" });
      setToast("Complaint sent to your department staff.");
    } catch (err) {
      setError(err?.message || "Unable to send complaint.");
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: messages.length,
    new: messages.filter((message) => message.status === "new").length,
    resolved: messages.filter((message) => message.status === "resolved").length
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between" style={{borderBottom:"1px solid var(--md-border)"}}>
        <div>
          <p className="portal-page-label">Student Complaints</p>
          <h1 className="portal-page-title">Department Messages</h1>
          <p className="portal-page-subtitle">
            Your complaint will be sent only to staff in your department{department ? `: ${department}` : "."}
          </p>
        </div>
        <button onClick={loadMessages} type="button" className="inline-flex w-fit items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="portal-alert-danger">{error}</div>}
      {toast && <div className="portal-alert-success">{toast}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total Complaints", stats.total, MessageSquare, "text-[color:var(--md-text-primary)]"],
          ["New", stats.new, Mail, "text-sky-300"],
          ["Resolved", stats.resolved, CheckCircle2, "text-emerald-300"]
        ].map(([label, value, Icon, color]) => (
          <GlassCard key={label} dark className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="portal-stat-label">{label}</p>
                <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
              </div>
              <Icon className={color} size={24} />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <GlassCard className="p-5">
          <h2 className="classroom-section-title">Send Complaint</h2>
          <form onSubmit={sendComplaint} className="mt-4 space-y-4">
            <input required value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Subject" className="w-full portal-input" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="portal-input">
                <option value="academic">Academic</option>
                <option value="fees">Fees</option>
                <option value="technical">Technical</option>
                <option value="general">General</option>
              </select>
              <select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className="portal-input">
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="low">Low</option>
              </select>
            </div>
            <textarea required value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} rows={7} placeholder="Explain your complaint" className="w-full resize-none portal-input" />
            <button type="submit" disabled={saving} className="portal-btn-primary">
              <Send size={16} />
              {saving ? "Sending..." : "Send to Department Staff"}
            </button>
          </form>
        </GlassCard>

        <GlassCard className="overflow-hidden p-0">
          <div className="border-b border-[color:var(--md-border)] p-4">
            <h2 className="classroom-section-title">My Complaints</h2>
            <p className="text-xs text-[color:var(--md-text-secondary)]">Only your own complaints are shown here.</p>
          </div>
          <div className="max-h-[620px] overflow-y-auto">
            {loading ? (
              <p className="p-8 text-center text-sm text-[color:var(--md-text-secondary)]">Loading complaints...</p>
            ) : messages.length === 0 ? (
              <p className="p-8 text-center text-sm text-[color:var(--md-text-secondary)]">No complaints sent yet.</p>
            ) : (
              messages.map((message) => (
                <div key={message._id} className="border-b border-[color:var(--md-border)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold" style={{color:"var(--md-text-primary)"}}>{message.subject}</h3>
                      <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">{formatDate(message.createdAt)} | {message.department}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={statusStyles[message.status] || statusStyles.new}>{message.status || "new"}</Badge>
                      <Badge className={priorityStyles[message.priority] || priorityStyles.normal}>{message.priority || "normal"}</Badge>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--md-text-secondary)]">{message.message}</p>
                  {message.internalNote && <p className="mt-3 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-3 text-sm text-[color:var(--md-text-secondary)]">Staff note: {message.internalNote}</p>}
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  return role === "student" ? <StudentComplaintCenter user={user} /> : <StaffMessagesPage role={role} />;
}

function Badge({ className, children }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${className}`}>{children}</span>;
}

function FilterSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-[color:var(--md-border)] bg-slate-950 px-3 py-2 text-sm font-bold capitalize text-[color:var(--md-text-primary)] outline-none focus:border-sky-400"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function DetailSelect({ label, value, options, onChange, disabled }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-[color:var(--md-border)] bg-slate-950 px-3 py-2.5 text-sm font-bold capitalize text-[color:var(--md-text-primary)] outline-none focus:border-sky-400 disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function IconButton({ title, onClick, icon: Icon, danger = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${danger ? "bg-red-500/10 text-red-300 hover:bg-red-500/20" : "bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]"}`}
    >
      <Icon size={17} />
    </button>
  );
}

function BulkButton({ onClick, icon: Icon, label }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
      <Icon size={15} />
      {label}
    </button>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-[color:var(--md-hover)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[color:var(--md-text-secondary)]">{value}</p>
    </div>
  );
}
