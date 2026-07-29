import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Check, FileText, Flag, Globe2, MessageCircle, Paperclip, Pencil, Pin, Plus, Search, Send, ShieldAlert, SmilePlus, Trash2, Users, X } from "lucide-react";
import { apiFetch } from "../../lib/api.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useModal } from "../../contexts/ModalContext.jsx";
import { useSearchParams } from "react-router-dom";
import ProfileAvatar from "../../components/alumni/ProfileAvatar.jsx";
import AlumniSocialNav from "../../components/alumni/AlumniSocialNav.jsx";

const titleFor = (conversation, currentUserId) => {
  if (conversation.name) return conversation.name;
  return conversation.members?.find((member) => String(member._id) !== String(currentUserId))?.name || "Direct message";
};

async function videoSafetyFrame(file) {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.src = url;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error("Unable to read this video."));
    });
    await new Promise((resolve) => {
      video.onseeked = resolve;
      video.currentTime = Math.min(Math.max(video.duration * 0.25, 0.1), 3);
    });
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 896 / video.videoWidth, 896 / video.videoHeight);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error("Unable to generate the video safety preview.");
    return new File([blob], "video-safety-frame.jpg", { type: "image/jpeg" });
  } finally { URL.revokeObjectURL(url); }
}

export default function AlumniChatPage() {
  const { user } = useAuth();
  const { alert, confirm, requestText } = useModal();
  const [searchParams] = useSearchParams();
  const requestedConversationId = searchParams.get("conversation");
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [reactionPickerId, setReactionPickerId] = useState("");
  const [error, setError] = useState("");
  const [accessState, setAccessState] = useState({ blocked: false, request: null, warningCount: 0 });
  const messagesRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const active = conversations.find((item) => item._id === activeId);

  const loadConversations = async () => {
    const data = await apiFetch("/api/alumni-chat");
    setConversations(data);
    setActiveId((current) =>
      requestedConversationId && data.some((item) => item._id === requestedConversationId)
        ? requestedConversationId
        : current || data[0]?._id || "",
    );
  };
  const loadAccessState = async () => {
    const state = await apiFetch("/api/alumni-chat/access-request/me");
    setAccessState(state);
  };
  useEffect(() => { loadConversations().catch((e) => setError(e.message)); }, []);
  useEffect(() => { loadAccessState().catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    if (!accessState.blocked) return undefined;
    const timer = window.setInterval(() => loadAccessState().catch(() => {}), 10000);
    return () => window.clearInterval(timer);
  }, [accessState.blocked]);
  useEffect(() => {
    if (!activeId) return;
    setMessages([]);
    shouldAutoScrollRef.current = true;
    const load = () => apiFetch(`/api/alumni-chat/${activeId}/messages`).then(setMessages).catch((e) => setError(e.message));
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [activeId]);
  useEffect(() => {
    if (!shouldAutoScrollRef.current || !messagesRef.current) return;
    window.requestAnimationFrame(() => {
      if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    });
  }, [activeId, messages.length]);
  useEffect(() => {
    if (!creating) return;
    apiFetch("/api/alumni-directory?limit=100").then((data) => setDirectory(data.data || [])).catch((e) => setError(e.message));
  }, [creating]);

  const filtered = useMemo(() => conversations.filter((item) =>
    titleFor(item, user?.id).toLowerCase().includes(query.toLowerCase())), [conversations, query, user?.id]);

  const send = async (event) => {
    event.preventDefault();
    if ((!draft.trim() && !attachments.length) || !activeId || sending) return;
    setSending(true); setError("");
    try {
      const body = new FormData();
      body.append("content", draft);
      attachments.forEach((file) => body.append("attachments", file));
      const video = attachments.find((file) => file.type.startsWith("video/"));
      if (video) body.append("moderationFrame", await videoSafetyFrame(video));
      const message = await apiFetch(`/api/alumni-chat/${activeId}/messages`, { method: "POST", body });
      shouldAutoScrollRef.current = true;
      setMessages((items) => [...items, message]);
      setDraft(""); setAttachments([]);
      loadConversations();
    } catch (e) {
      setError(e.message);
      if (/chat access has been blocked/i.test(e.message)) loadAccessState().catch(() => {});
    } finally { setSending(false); }
  };
  const create = async () => {
    try {
      const conversation = await apiFetch("/api/alumni-chat", { method: "POST", body: JSON.stringify({ memberIds: selected, name: groupName }) });
      setCreating(false); setSelected([]); setGroupName("");
      await loadConversations(); setActiveId(conversation._id);
    } catch (e) {
      if (/connect with this alumni member before starting a private chat/i.test(e.message)) {
        setError("");
        await alert({ title: "Connection required", message: e.message, tone: "info", confirmLabel: "Okay" });
      } else setError(e.message);
    }
  };
  const removeMessage = async (message) => {
    if (!await confirm({ title: "Delete message?", message: "This message will be removed from the conversation.", confirmLabel: "Delete", tone: "danger" })) return;
    try {
      setError("");
      await apiFetch(`/api/alumni-chat/${activeId}/messages/${message._id}`, { method: "DELETE" });
      setMessages((items) => items.filter((item) => item._id !== message._id));
      await loadConversations();
    } catch (e) { setError(e.message); }
  };
  const reportUser = async (targetUser, messageId) => {
    const reason = await requestText({ title: `Report ${targetUser.name}`, message: "Tell the administrator why you are reporting this user.", defaultValue: "Community guidelines violation", confirmLabel: "Send report", tone: "warning" });
    if (reason === null) return;
    try {
      const result = await apiFetch(`/api/alumni-chat/${activeId}/report/${targetUser._id}`, {
        method: "POST",
        body: JSON.stringify({ reason, messageId, explanation: "Reported by a conversation participant." }),
      });
      setError("");
      await alert({ title: "Report submitted", message: result.message, tone: "success" });
    } catch (e) { setError(e.message); }
  };
  const blockUser = async (targetUser) => {
    if (!await confirm({ title: `Block ${targetUser.name}?`, message: "You will no longer see this user's messages.", confirmLabel: "Block user", tone: "danger" })) return;
    try {
      await apiFetch(`/api/blocks/${targetUser._id}`, { method: "POST" });
      setMessages((items) => items.filter((message) => message.messageType === "system_violation" || String(message.sender?._id) !== String(targetUser._id)));
      if (active?.type === "direct") { setActiveId(""); await loadConversations(); }
    } catch (e) { setError(e.message); }
  };
  const deleteConversation = async () => {
    if (!active || ["global", "department"].includes(active.type)) return;
    const accepted = await confirm({
      title: "Delete this chat?",
      message: "This conversation and its current history will be removed only from your chat page.",
      confirmLabel: "Delete chat",
      tone: "danger",
    });
    if (!accepted) return;
    try {
      setError("");
      await apiFetch(`/api/alumni-chat/${active._id}`, { method: "DELETE" });
      setMessages([]); setActiveId("");
      await loadConversations();
    } catch (e) { setError(e.message); }
  };
  const editMessage = async (message) => {
    const content = editingContent.trim();
    if (!content) return;
    try {
      setError("");
      const updated = await apiFetch(`/api/alumni-chat/${activeId}/messages/${message._id}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
      setMessages((items) => items.map((item) => item._id === updated._id ? updated : item));
      setEditingId(""); setEditingContent("");
    } catch (e) { setError(e.message); }
  };
  const reactToMessage = async (message, emoji) => {
    const mine = message.reactions?.find((reaction) => String(reaction.user?._id || reaction.user) === String(user?.id || user?._id));
    try {
      setError("");
      const updated = await apiFetch(`/api/alumni-chat/${activeId}/messages/${message._id}/reaction`, {
        method: "PUT",
        body: JSON.stringify({ emoji: mine?.emoji === emoji ? "" : emoji }),
      });
      setMessages((items) => items.map((item) => item._id === updated._id ? { ...item, reactions: updated.reactions } : item));
      setReactionPickerId("");
    } catch (e) { setError(e.message); }
  };
  const requestChatAccess = async () => {
    const message = await requestText({
      title: "Request chat access",
      message: "Explain why the administrator should restore your ability to send chat messages.",
      placeholder: "Write your request",
      confirmLabel: "Send request",
      tone: "warning",
    });
    if (message === null) return;
    try {
      setError("");
      const result = await apiFetch("/api/alumni-chat/access-request", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setAccessState((current) => ({ ...current, request: result.request }));
      await alert({ title: "Request sent", message: result.message, tone: "success" });
    } catch (e) {
      setError(e.message);
      await loadAccessState().catch(() => {});
    }
  };
  const directOther = active?.type === "direct"
    ? active.members?.find((member) => String(member._id) !== String(user?.id || user?._id))
    : null;

  return (
    <section className="alumni-chat-page">
      <header className="alumni-social-heading">
        <div><p className="portal-page-label">Alumni Social Network</p><h1 className="portal-page-title">Chat</h1><p className="portal-page-subtitle">Message alumni privately or join your community conversations.</p></div>
        <button className="portal-btn-primary" onClick={() => setCreating(true)}><Plus size={17}/>New conversation</button>
      </header>
      <AlumniSocialNav />
      {error && <div className="portal-alert-danger">{error}</div>}
      <div className="alumni-messenger">
        <aside className="alumni-chat-list">
          <label className="alumni-chat-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations"/></label>
          {filtered.map((conversation) => (
            <button key={conversation._id} className={`alumni-chat-row ${activeId === conversation._id ? "active" : ""}`} onClick={() => setActiveId(conversation._id)}>
              <span className="alumni-chat-icon">{conversation.type === "global" ? <Globe2/> : conversation.type === "department" || conversation.type === "custom" ? <Users/> : <MessageCircle/>}</span>
              <span><b className="flex items-center gap-1">{titleFor(conversation, user?.id)}{["global","department"].includes(conversation.type) && <Pin size={13} aria-label="Pinned conversation"/>}</b><small>{conversation.lastMessage?.content || (conversation.type === "department" ? "Your department group" : "Start a conversation")}</small></span>
            </button>
          ))}
        </aside>
        <main className="alumni-chat-thread">
          {active ? <>
            <header><div className="alumni-chat-icon"><MessageCircle/></div><div className="flex-1"><b>{titleFor(active, user?.id)}</b><small>{active.type === "global" ? "All approved alumni" : active.type === "department" ? "Department members only" : `${active.members?.length || 2} participant(s)`}</small></div>{directOther && <div className="alumni-chat-user-actions"><button onClick={() => reportUser(directOther)} title="Report user"><Flag size={16}/></button><button onClick={() => blockUser(directOther)} title="Block user"><Ban size={16}/></button></div>}{!["global","department"].includes(active.type) && <button className="alumni-delete-chat" onClick={deleteConversation} title="Delete this chat from my chat page"><Trash2 size={17}/></button>}</header>
            <div ref={messagesRef} className="alumni-chat-messages" onScroll={(event) => { const node = event.currentTarget; shouldAutoScrollRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120; }}>
              {messages.map((message) => {
                const mine = String(message.sender?._id) === String(user?.id || user?._id);
                if (message.messageType === "system_violation") return <div key={message._id} className="alumni-guideline-warning"><ShieldAlert size={20}/><div><b>Community Guidelines warning</b><p>{message.content}</p><small>{new Date(message.createdAt).toLocaleString()}</small></div>{!mine && message.violatedUser && <div className="alumni-warning-actions"><button onClick={() => reportUser(message.violatedUser, message._id)}><Flag size={14}/>Report</button><button onClick={() => blockUser(message.violatedUser)}><Ban size={14}/>Block</button></div>}</div>;
                return <div key={message._id} className={`alumni-message ${mine ? "mine" : ""}`}>
                  {!mine && <ProfileAvatar name={message.sender?.name} url={message.sender?.alumniProfile?.profilePhotoUrl}/>}
                  <div><small>{mine ? "You" : message.sender?.name}</small>{editingId === message._id ? <div className="alumni-message-edit"><input value={editingContent} onChange={(event) => setEditingContent(event.target.value)} maxLength={5000} autoFocus/><button onClick={() => editMessage(message)} title="Save edit"><Check size={15}/></button><button onClick={() => { setEditingId(""); setEditingContent(""); }} title="Cancel edit"><X size={15}/></button></div> : message.content && <p>{message.content}</p>}
                    {message.attachments?.length > 0 && <div className="alumni-message-attachments">{message.attachments.map((file) => file.mediaType === "image" ? <a key={file.url} href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt={file.originalName}/></a> : file.mediaType === "video" ? <video key={file.url} src={file.url} controls preload="metadata"/> : <a key={file.url} href={file.url} target="_blank" rel="noreferrer" className="alumni-chat-file"><FileText size={20}/><span>{file.originalName}</span></a>)}</div>}
                    {message.reactions?.length > 0 && <div className="alumni-message-reactions">{Object.entries(message.reactions.reduce((counts, reaction) => ({ ...counts, [reaction.emoji]: (counts[reaction.emoji] || 0) + 1 }), {})).map(([emoji,count]) => <button key={emoji} onClick={() => reactToMessage(message, emoji)}>{emoji} {count}</button>)}</div>}
                    <time>{new Date(message.createdAt).toLocaleString()}{message.editedAt ? " · edited" : ""}</time></div>
                  <div className="alumni-message-controls"><button onClick={() => setReactionPickerId((current) => current === message._id ? "" : message._id)} title="React"><SmilePlus size={14}/></button>{mine && Date.now() - new Date(message.createdAt).getTime() <= 5 * 60 * 1000 && message.content && <button onClick={() => { setEditingId(message._id); setEditingContent(message.content); }} title="Edit within five minutes"><Pencil size={14}/></button>}{mine ? <button onClick={() => removeMessage(message)} title="Delete message"><Trash2 size={14}/></button> : <><button onClick={() => reportUser(message.sender, message._id)} title="Report"><Flag size={13}/></button><button onClick={() => blockUser(message.sender)} title="Block"><Ban size={13}/></button></>}{reactionPickerId === message._id && <div className="alumni-reaction-picker">{["👍","❤️","😂","😮","😢","🙏"].map((emoji) => <button key={emoji} onClick={() => reactToMessage(message, emoji)}>{emoji}</button>)}</div>}</div>
                </div>;
              })}
            </div>
            {!accessState.blocked && attachments.length > 0 && <div className="alumni-chat-attachment-list">{attachments.map((file, index) => <span key={`${file.name}-${index}`}><FileText size={14}/>{file.name}<button type="button" onClick={() => setAttachments((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={13}/></button></span>)}</div>}
            {accessState.blocked ? <div className="alumni-chat-suspended"><ShieldAlert size={20}/><div><b>Chat access suspended</b><p>You reached {accessState.warningCount} Community Guidelines warnings and cannot send messages.</p>{accessState.request?.status === "pending" && <small>Your request is waiting for administrator review.</small>}{accessState.request?.status === "rejected" && <small>Your previous request was rejected. You may send a new request.</small>}</div>{accessState.request?.status !== "pending" && <button className="portal-btn-primary" onClick={requestChatAccess}>Request chat access</button>}</div> : <form className="alumni-chat-composer" onSubmit={send}>
              <label className="alumni-chat-attach" title="Attach photo, video, or file"><Paperclip size={19}/><input type="file" multiple accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" onChange={(event) => { const files = [...(event.target.files || [])].slice(0, 5); if (files.filter((file) => file.type.startsWith("video/")).length > 1) setError("Send one video at a time."); else setAttachments(files); event.target.value = ""; }}/></label>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={5000} placeholder="Write a message…"/>
              <button disabled={sending || (!draft.trim() && !attachments.length)}>{sending ? "…" : <Send size={19}/>}</button>
            </form>}
          </> : <div className="alumni-chat-empty"><MessageCircle size={44}/><h2>Select a conversation</h2><p>Your direct and community chats appear here.</p></div>}
        </main>
      </div>
      {creating && <div className="alumni-modal-backdrop"><section className="alumni-create-chat"><h2>New conversation or group</h2><p>Select one person for direct chat, or several alumni to create a group.</p><input className="portal-input w-full" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name (for groups)"/><div className="alumni-member-picker">{directory.map((person) => <label key={person.userId}><input type="checkbox" checked={selected.includes(person.userId)} onChange={(e) => setSelected((items) => e.target.checked ? [...items, person.userId] : items.filter((id) => id !== person.userId))}/><ProfileAvatar name={person.fullName} url={person.profilePhotoUrl}/><span><b>{person.fullName}</b><small>{person.department}</small></span></label>)}</div><footer><button className="portal-btn" onClick={() => setCreating(false)}>Cancel</button><button className="portal-btn-primary" disabled={!selected.length} onClick={create}>Create chat</button></footer></section></div>}
    </section>
  );
}
