import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AlumniProfileCard from "../../components/alumni/AlumniProfileCard.jsx";
import EmptyState from "../../components/alumni/EmptyState.jsx";
import { apiFetch } from "../../lib/api.js";
import { useModal } from "../../contexts/ModalContext.jsx";

export default function AlumniDirectoryPage() {
  const navigate = useNavigate();
  const { alert, requestText } = useModal();
  const [profiles, setProfiles] = useState([]);
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30", ...(q && { q }), ...(department && { department }), ...(year && { graduationYear: year }) });
      const data = await apiFetch(`/api/alumni-directory?${params}`);
      setProfiles(data.data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { const timer = setTimeout(load, 300); return () => clearTimeout(timer); }, [q, department, year]);
  const connect = async (profile) => {
    const message = await requestText({ title: "Send connection request", message: "Add one introductory message (optional).", placeholder: "Write a short introduction", confirmLabel: "Send request", allowEmpty: true });
    if (message === null) return;
    setBusyId(profile.userId); setError(""); setStatus("");
    try {
      const connection = await apiFetch(`/api/connections/${profile.userId}`, { method: "POST", body: JSON.stringify({ message }) });
      setProfiles((items) => items.map((item) => item.userId === profile.userId ? { ...item, connectionId: connection._id, connectionStatus: connection.status, connectionDirection: connection.status === "accepted" ? "connected" : "sent" } : item));
      setStatus(connection.status === "accepted" ? `You are now connected with ${profile.fullName}.` : `Connection request sent to ${profile.fullName}.`);
    } catch (err) { setError(err.message); } finally { setBusyId(""); }
  };
  const message = async (profile) => {
    try {
      const conversation = await apiFetch("/api/alumni-chat", { method: "POST", body: JSON.stringify({ memberIds: [profile.userId] }) });
      navigate(`/alumni/chat?conversation=${conversation._id}`);
    } catch (err) {
      if (/connect with this alumni member before starting a private chat/i.test(err.message)) {
        setError("");
        await alert({ title: "Connection required", message: err.message, tone: "info", confirmLabel: "Okay" });
      } else setError(err.message);
    }
  };
  return <section className="space-y-5">
    <div><p className="portal-page-label">Alumni Network</p><h1 className="portal-page-title">Alumni Directory</h1><p className="portal-page-subtitle">Find verified professionals, mentors, recruiters, and former classmates.</p></div>
    {error && <div className="portal-alert-danger">{error}</div>}{status && <div className="portal-alert-success">{status}</div>}
    <div className="grid gap-3 md:grid-cols-3"><label className="portal-search"><Search size={16}/><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search alumni, skills, company..." className="w-full bg-transparent outline-none"/></label><input value={department} onChange={(e) => setDepartment(e.target.value)} className="portal-input" placeholder="Department"/><input value={year} onChange={(e) => setYear(e.target.value)} className="portal-input" placeholder="Graduation year"/></div>
    {loading ? <div className="py-12 text-center">Searching alumni...</div> : profiles.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{profiles.map((profile) => <AlumniProfileCard key={profile._id} profile={profile} busy={busyId === profile.userId} onConnect={connect} onMessage={message}/>)}</div> : <EmptyState title="No alumni found" message="Try a different name, department, skill, or year."/>}
  </section>;
}
