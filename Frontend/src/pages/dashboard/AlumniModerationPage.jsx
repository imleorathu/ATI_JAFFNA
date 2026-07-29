import { useEffect, useState } from "react";
import { Ban, Flag, MessageSquare, ShieldCheck, Trash2, Users } from "lucide-react";
import GlassCard from "../../components/GlassCard.jsx";
import { apiFetch } from "../../lib/api.js";
import { useModal } from "../../contexts/ModalContext.jsx";

export default function AlumniModerationPage() {
  const { confirm, requestText } = useModal();
  const [tab, setTab] = useState("reports");
  const [reports, setReports] = useState([]);
  const [posts, setPosts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [active, setActive] = useState(null);
  const [users, setUsers] = useState([]);
  const [restrictions, setRestrictions] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      if (tab === "reports") setReports(await apiFetch("/api/reports/admin"));
      if (tab === "posts") setPosts((await apiFetch("/api/feed?limit=100")).data || []);
      if (tab === "chats") setConversations(await apiFetch("/api/alumni-chat"));
      if (tab === "access") setAccessRequests(await apiFetch("/api/admin/alumni-social/chat-access-requests"));
      if (tab === "users") {
        const [people, rules] = await Promise.all([apiFetch("/api/admin/alumni-social/users"), apiFetch("/api/admin/alumni-social/restrictions")]);
        setUsers(people); setRestrictions(rules);
      }
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, [tab]);
  const act = async (report, status, removeContent = false) => {
    const resolution = await requestText({ title: "Moderation decision", message: "Record the reason for this decision.", confirmLabel: "Save decision" });
    if (resolution === null) return;
    try {
      setError("");
      await apiFetch(`/api/reports/admin/${report._id}`, { method: "PUT", body: JSON.stringify({ status, resolution, removeContent }) });
      await load();
    } catch (e) { setError(e.message); }
  };
  const removeReportedChatAccess = async (report) => {
    const user = report.targetUser;
    if (!user?._id) return;
    const reason = await requestText({ title: `Remove ${user.name}'s chat access`, message: "Record the reason for removing this user's chat access.", defaultValue: `Community Guidelines report: ${report.reason}`, confirmLabel: "Remove access", tone: "danger" });
    if (reason === null) return;
    try {
      setError("");
      await apiFetch(`/api/admin/alumni-social/users/${user._id}/restriction`, {
        method: "PUT",
        body: JSON.stringify({ feature: "chat", blocked: true, reason }),
      });
      await apiFetch(`/api/reports/admin/${report._id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "resolved", resolution: reason, removeContent: report.targetType === "chat_message" }),
      });
      await load();
    } catch (e) { setError(e.message); }
  };
  const openChat = async (conversation) => {
    try {
      setError(""); setActive(conversation);
      setMessages(await apiFetch(`/api/alumni-chat/${conversation._id}/messages`));
    } catch (e) { setError(e.message); }
  };
  const clearChat = async (conversation) => {
    if (!await confirm({ title: "Delete full chat history?", message: `All messages in “${conversation.name || "this conversation"}” will be permanently deleted.`, confirmLabel: "Delete history", tone: "danger" })) return;
    try {
      setError("");
      await apiFetch(`/api/admin/alumni-social/conversations/${conversation._id}/history`, { method: "DELETE" });
      setMessages([]);
      await load();
    } catch (e) { setError(e.message); }
  };
  const deleteFullChat = async (conversation) => {
    const community = ["global", "department"].includes(conversation.type);
    if (!await confirm({
      title: community ? "Clear community chat?" : "Delete full chat?",
      message: community
        ? "All messages will be permanently deleted, but this required community channel will remain."
        : "The conversation and every message in it will be permanently deleted for all participants.",
      confirmLabel: community ? "Clear all messages" : "Delete full chat",
      tone: "danger",
    })) return;
    try {
      setError("");
      await apiFetch(`/api/admin/alumni-social/conversations/${conversation._id}`, { method: "DELETE" });
      setMessages([]); setActive(null);
      await load();
    } catch (e) { setError(e.message); }
  };
  const deleteMessage = async (message) => {
    if (!await confirm({ title: "Delete message?", message: "This particular chat message will be permanently deleted.", confirmLabel: "Delete message", tone: "danger" })) return;
    try {
      setError("");
      await apiFetch(`/api/admin/alumni-social/messages/${message._id}`, { method: "DELETE" });
      setMessages((items) => items.filter((item) => item._id !== message._id));
    } catch (e) { setError(e.message); }
  };
  const deletePost = async (post) => {
    if (!await confirm({ title: "Delete alumni post?", message: "This post will be permanently removed from the alumni feed.", confirmLabel: "Delete post", tone: "danger" })) return;
    try {
      setError("");
      await apiFetch(`/api/posts/${post._id}`, { method: "DELETE" });
      setPosts((items) => items.filter((item) => item._id !== post._id));
    } catch (e) { setError(e.message); }
  };
  const isBlocked = (userId, feature) => restrictions.some((rule) => String(rule.user?._id) === String(userId) && rule.feature === feature && rule.blocked);
  const toggleRestriction = async (user, feature) => {
    const blocked = !isBlocked(user._id, feature);
    const reason = blocked ? await requestText({ title: `Block ${feature} access`, message: `Record why ${user.name}'s ${feature} access is being blocked.`, defaultValue: "Administrator moderation action", confirmLabel: "Block access", tone: "danger" }) : "";
    if (blocked && reason === null) return;
    try {
      setError("");
      await apiFetch(`/api/admin/alumni-social/users/${user._id}/restriction`, { method: "PUT", body: JSON.stringify({ feature, blocked, reason }) });
      await load();
    } catch (e) { setError(e.message); }
  };
  const reviewChatAccess = async (request, action) => {
    const adminNote = await requestText({
      title: `${action === "approve" ? "Approve" : "Reject"} chat access`,
      message: action === "approve" ? `Add an optional note for ${request.user?.name}.` : `Explain why ${request.user?.name}'s request is rejected.`,
      confirmLabel: action === "approve" ? "Approve access" : "Reject request",
      tone: action === "approve" ? "success" : "danger",
      allowEmpty: action === "approve",
    });
    if (adminNote === null) return;
    try {
      setError("");
      await apiFetch(`/api/admin/alumni-social/chat-access-requests/${request._id}`, {
        method: "PUT",
        body: JSON.stringify({ action, adminNote }),
      });
      await load();
    } catch (e) { setError(e.message); }
  };

  return <section className="space-y-5">
    <div><p className="portal-page-label">Admin · Alumni Social Network</p><h1 className="portal-page-title">Social Moderation Center</h1><p className="portal-page-subtitle">Manage reports, posts, chat history, individual messages, and user permissions.</p></div>
    {error && <div className="portal-alert-danger">{error}</div>}
    <div className="alumni-admin-tabs">{[["reports",Flag,"Reports"],["access",ShieldCheck,"Chat access requests"],["posts",ShieldCheck,"Feed posts"],["chats",MessageSquare,"Chats"],["users",Users,"User controls"]].map(([key,Icon,label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}><Icon size={17}/>{label}</button>)}</div>
    {tab === "access" && <div className="space-y-4">{accessRequests.map((request) => <GlassCard key={request._id} className="p-5"><div className="flex gap-3"><ShieldCheck className={request.status === "pending" ? "text-amber-500" : request.status === "approved" ? "text-emerald-500" : "text-red-500"}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b>{request.user?.name}</b><span className="portal-badge portal-badge-neutral capitalize">{request.status}</span></div><small>{request.user?.email} · {request.user?.alumniProfile?.department}</small><p className="mt-3 whitespace-pre-wrap">{request.message}</p>{request.adminNote && <p className="mt-2 text-sm"><b>Admin note:</b> {request.adminNote}</p>}<small>{new Date(request.createdAt).toLocaleString()}</small></div></div>{request.status === "pending" && <div className="mt-4 flex flex-wrap gap-2"><button className="portal-btn-primary" onClick={() => reviewChatAccess(request,"approve")}>Approve chat access</button><button className="portal-btn-danger" onClick={() => reviewChatAccess(request,"reject")}>Reject request</button></div>}</GlassCard>)}{!accessRequests.length && <GlassCard className="p-8 text-center">No chat access requests.</GlassCard>}</div>}
    {tab === "reports" && <div className="space-y-4">{reports.map((report) => <GlassCard key={report._id} className="p-5"><div className="flex gap-3"><Flag className="text-red-500"/><div className="flex-1"><b className="capitalize">{String(report.targetType || "content").replaceAll("_", " ")} report</b>{report.targetUser && <p><strong>Reported user:</strong> {report.targetUser.name} ({report.targetUser.email})</p>}<p><strong>Reason:</strong> {report.reason}</p>{report.explanation && <p>{report.explanation}</p>}<small>Reported by {report.reporter?.name} · {new Date(report.createdAt).toLocaleString()} · {report.status}</small></div></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => act(report,"under_review")} className="portal-btn">Review</button><button onClick={() => act(report,"resolved",["post","chat_message"].includes(report.targetType))} className="portal-btn-primary">Resolve</button>{["chat_user","chat_message"].includes(report.targetType) && report.targetUser && <button onClick={() => removeReportedChatAccess(report)} className="portal-btn-danger"><Ban size={15}/>Remove chat access</button>}<button onClick={() => act(report,"rejected")} className="portal-btn">Reject</button></div></GlassCard>)}</div>}
    {tab === "posts" && <div className="alumni-admin-posts">{posts.map((post) => <GlassCard key={post._id} className="p-5"><div className="flex justify-between gap-4"><div><b>{post.author?.name || "Alumni"}</b><small className="block">{new Date(post.createdAt).toLocaleString()}</small><p className="mt-3 whitespace-pre-wrap">{post.content || "(Media post)"}</p></div><button className="portal-btn-danger" onClick={() => deletePost(post)}><Trash2 size={16}/>Delete</button></div></GlassCard>)}</div>}
    {tab === "chats" && <div className="alumni-admin-chat"><aside>{conversations.map((item) => <button className={active?._id === item._id ? "active" : ""} key={item._id} onClick={() => openChat(item)}><b>{item.name || "Direct conversation"}</b><small>{item.type} · {item.members?.length || 0} members</small></button>)}</aside><main>{active ? <><header><div><h2>{active.name || "Direct conversation"}</h2><small>Administrators can review and remove chat content.</small></div><div className="flex flex-wrap gap-2"><button className="portal-btn-danger" onClick={() => clearChat(active)}><Trash2 size={16}/>Delete full history</button><button className="portal-btn-danger" onClick={() => deleteFullChat(active)}><Trash2 size={16}/>{["global","department"].includes(active.type) ? "Clear community chat" : "Delete full chat"}</button></div></header><div>{messages.map((message) => <article key={message._id}><div><b>{message.sender?.name}</b><p>{message.content}</p><small>{new Date(message.createdAt).toLocaleString()}</small></div><button onClick={() => deleteMessage(message)} title="Delete message"><Trash2 size={15}/></button></article>)}</div></> : <p className="p-8">Select a conversation to review it.</p>}</main></div>}
    {tab === "users" && <div className="alumni-admin-users">{users.map((person) => <GlassCard key={person._id} className="p-5"><div><b>{person.name}</b><small>{person.email}<br/>{person.alumniProfile?.department}</small></div><div><button className={isBlocked(person._id,"chat") ? "portal-btn-primary" : "portal-btn-danger"} onClick={() => toggleRestriction(person,"chat")}><Ban size={15}/>{isBlocked(person._id,"chat") ? "Allow chat" : "Block chat"}</button><button className={isBlocked(person._id,"post") ? "portal-btn-primary" : "portal-btn-danger"} onClick={() => toggleRestriction(person,"post")}><Ban size={15}/>{isBlocked(person._id,"post") ? "Allow posts" : "Block posts"}</button></div></GlassCard>)}</div>}
  </section>;
}
