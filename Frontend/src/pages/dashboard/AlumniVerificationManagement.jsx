import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CheckSquare, Download, FileWarning, History, ShieldAlert } from "lucide-react";
import GlassCard from "../../components/GlassCard.jsx";
import { apiFetch, downloadAuthenticatedFile } from "../../lib/api.js";
import { useModal } from "../../contexts/ModalContext.jsx";

const activeStatuses = new Set(["pending", "under_review", "additional_information_required"]);

export default function AlumniVerificationManagement() {
  const { requestText } = useModal();
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const load = () => apiFetch("/api/alumni-verification/admin").then(setRequests).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => requests.filter((request) =>
    tab === "pending" ? activeStatuses.has(request.status) : !activeStatuses.has(request.status)), [requests, tab]);
  useEffect(() => { setSelected([]); }, [tab]);

  const review = async (request, nextStatus) => {
    const reason = await requestText({
      title: nextStatus === "verified" ? "Verify alumni" : "Update verification",
      message: nextStatus === "verified" ? "Add an optional verification note." :
        nextStatus === "unverified" ? "Enter the reason for removing verification." :
        "Enter the reason or information required.",
      confirmLabel: "Save decision",
      tone: nextStatus === "verified" ? "success" : "warning",
      allowEmpty: nextStatus === "verified",
    });
    if (reason === null) return;
    setError(""); setStatus("");
    try {
      await apiFetch(`/api/alumni-verification/admin/${request._id}`, {
        method: "PUT", body: JSON.stringify({ status: nextStatus, reason }),
      });
      setStatus(nextStatus === "verified" ? `${request.alumni?.fullName} verified and moved to Verification History.` : `${request.alumni?.fullName} is now ${nextStatus.replaceAll("_", " ")}.`);
      await load();
    } catch (e) { setError(e.message); }
  };
  const bulkVerify = async () => {
    if (!selected.length) return;
    const reason = await requestText({ title: `Verify ${selected.length} alumni`, message: "Add an optional note for this bulk verification.", confirmLabel: "Verify selected", tone: "success", allowEmpty: true });
    if (reason === null) return;
    try {
      const result = await apiFetch("/api/alumni-verification/admin/bulk", {
        method: "PUT", body: JSON.stringify({ ids: selected, status: "verified", reason }),
      });
      setStatus(result.message); setSelected([]); await load();
    } catch (e) { setError(e.message); }
  };
  const toggleAll = (checked) => setSelected(checked ? visible.map((request) => request._id) : []);

  return <section className="space-y-5">
    <div><p className="portal-page-label">Admin · Alumni Trust</p><h1 className="portal-page-title">Alumni Verification</h1><p className="portal-page-subtitle">Verify one or many alumni and review every completed decision in the permanent history.</p></div>
    {error && <div className="portal-alert-danger">{error}</div>}{status && <div className="portal-alert-success">{status}</div>}
    <div className="alumni-admin-tabs">
      <button className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}><CheckSquare size={17}/>Verification Queue ({requests.filter((item) => activeStatuses.has(item.status)).length})</button>
      <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><History size={17}/>Verification History ({requests.filter((item) => !activeStatuses.has(item.status)).length})</button>
    </div>
    {tab === "pending" && visible.length > 0 && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
      <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={selected.length === visible.length} onChange={(e) => toggleAll(e.target.checked)}/>Select all</label>
      <span className="text-sm text-[color:var(--md-text-secondary)]">{selected.length} selected</span>
      <button disabled={!selected.length} onClick={bulkVerify} className="portal-btn-primary"><BadgeCheck size={16}/>Verify selected</button>
    </div>}
    <div className="space-y-4">
      {visible.map((request) => <GlassCard key={request._id} className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          {tab === "pending" && <input type="checkbox" checked={selected.includes(request._id)} onChange={(e) => setSelected((items) => e.target.checked ? [...items, request._id] : items.filter((id) => id !== request._id))}/>}
          <BadgeCheck className={request.status === "verified" ? "text-emerald-500" : "text-sky-500"}/>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-black">{request.alumni?.fullName}</h2><span className="portal-badge portal-badge-neutral capitalize">{request.status.replaceAll("_", " ")}</span></div>
            <p className="text-sm text-[color:var(--md-text-secondary)]">{request.alumni?.department} · {request.alumni?.programme} · {request.alumni?.graduationYear}</p>
            <p className="mt-3 text-sm">Methods: {request.methods.join(", ").replaceAll("_", " ")}</p>
            {request.applicantNote && <p className="mt-2 rounded-lg bg-[color:var(--md-hover)] p-3">{request.applicantNote}</p>}
            {request.adminReason && <p className="mt-2 text-sm"><b>Admin note:</b> {request.adminReason}</p>}
            {request.reviewedAt && <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">Reviewed by {request.reviewedBy?.name || "Administrator"} · {new Date(request.reviewedAt).toLocaleString()}</p>}
            <div className="mt-3 flex flex-wrap gap-2">{request.evidence.map((file) => <button key={file.storedName} onClick={() => downloadAuthenticatedFile(`/api/alumni-verification/admin/${request._id}/evidence/${encodeURIComponent(file.storedName)}`, file.originalName)} className="portal-btn"><Download size={14}/>{file.documentType}</button>)}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tab === "pending" ? <>
            <button onClick={() => review(request, "under_review")} className="portal-btn">Under review</button>
            <button onClick={() => review(request, "additional_information_required")} className="portal-btn"><FileWarning size={15}/>Request information</button>
            <button onClick={() => review(request, "verified")} className="portal-btn-primary"><BadgeCheck size={15}/>Verify</button>
            <button onClick={() => review(request, "rejected")} className="portal-btn-danger">Reject</button>
            <button onClick={() => review(request, "suspended")} className="portal-btn-danger"><ShieldAlert size={15}/>Suspend</button>
          </> : <span className="text-sm font-bold text-[color:var(--md-text-secondary)]">Completed verification record</span>}
        </div>
      </GlassCard>)}
      {!visible.length && <GlassCard className="p-8 text-center text-[color:var(--md-text-secondary)]">{tab === "pending" ? "No verification requests are waiting." : "No verification history yet."}</GlassCard>}
    </div>
  </section>;
}
