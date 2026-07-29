import { useEffect, useState } from "react";
import { BadgeCheck, FileCheck2, Send } from "lucide-react";
import GlassCard from "../../components/GlassCard.jsx";
import AlumniSocialNav from "../../components/alumni/AlumniSocialNav.jsx";
import { apiFetch } from "../../lib/api.js";
export default function AlumniVerificationPage() {
  const [requests, setRequests] = useState([]),
    [methods, setMethods] = useState(["registration_number"]),
    [note, setNote] = useState(""),
    [files, setFiles] = useState([]),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const load = () =>
    apiFetch("/api/alumni-verification/me")
      .then(setRequests)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      methods.forEach((method) => body.append("methods", method));
      body.append("applicantNote", note);
      [...files].forEach((file) => body.append("evidence", file));
      await apiFetch("/api/alumni-verification", { method: "POST", body });
      setStatus("Verification request submitted securely.");
      setNote("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const latest = requests[0];
  return (
    <section className="space-y-5">
      <div>
        <p className="portal-page-label">Trust and Identity</p>
        <h1 className="portal-page-title">Alumni Verification</h1>
        <p className="portal-page-subtitle">
          Verified alumni receive a visible badge and access to social
          participation.
        </p>
      </div>
      <AlumniSocialNav />
      {error && <div className="portal-alert-danger">{error}</div>}
      {status && <div className="portal-alert-success">{status}</div>}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3">
          <BadgeCheck className="text-sky-500" />
          <div>
            <b>Current status</b>
            <p className="capitalize text-[color:var(--md-text-secondary)]">
              {latest?.status?.replaceAll("_", " ") || "Unverified"}
            </p>
          </div>
        </div>
        {latest?.adminReason && (
          <p className="mt-4 rounded-lg bg-amber-500/10 p-3">
            Administrator note: {latest.adminReason}
          </p>
        )}
      </GlassCard>
      {latest?.status !== "verified" && (
        <GlassCard className="p-6">
          <form onSubmit={submit} className="space-y-4">
            <h2 className="alumni-form-title">
              <FileCheck2 size={19} />
              Submit Verification Evidence
            </h2>
            <div className="grid gap-2 md:grid-cols-2">
              {[
                ["registration_number", "Registration number verification"],
                ["institutional_email", "Institutional email"],
                ["graduation_record", "Graduation record"],
                ["certificate", "Certificate upload"],
                ["identity_document", "Identity document"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] p-3"
                >
                  <input
                    type="checkbox"
                    checked={methods.includes(value)}
                    onChange={(e) =>
                      setMethods((c) =>
                        e.target.checked
                          ? [...c, value]
                          : c.filter((x) => x !== value),
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="portal-input min-h-24 w-full"
              placeholder="Explain the evidence you are submitting..."
            />
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFiles(e.target.files)}
              className="portal-input w-full"
            />
            <button
              disabled={saving || !methods.length}
              className="portal-btn-primary"
            >
              <Send size={16} />
              {saving ? "Submitting..." : "Submit for Verification"}
            </button>
          </form>
        </GlassCard>
      )}
    </section>
  );
}
