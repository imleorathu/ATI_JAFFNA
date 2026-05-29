import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LockKeyhole } from "lucide-react";
import GlassCard from "../components/GlassCard.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

const portalPathForRole = (role) => {
  const normalized = String(role || "student").toLowerCase();
  if (normalized === "admin") return "/admin";
  if (normalized === "lecturer" || normalized === "faculty") return "/faculty";
  return "/student";
};

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { changePassword, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await changePassword(currentPassword, newPassword, confirmPassword);
      navigate(portalPathForRole(data?.user?.role || user?.role), { replace: true });
    } catch (err) {
      setError(err?.message || "Unable to change password.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "min-w-0 flex-1 bg-transparent text-clay-text outline-none placeholder:text-slate-400";

  return (
    <section className="page-section min-h-screen bg-gradient-to-b from-[#f7fbff] via-[#f0f4f8] to-[#e8edf2] pt-32">
      <div className="mx-auto max-w-3xl">
        <SectionHeader eyebrow="Security" title="Change your default password" text="Imported student accounts must set a new password before opening the portal." />
        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            {[
              ["Current password", currentPassword, setCurrentPassword, "Enter Student ID password"],
              ["New password", newPassword, setNewPassword, "Minimum 8 characters"],
              ["Confirm new password", confirmPassword, setConfirmPassword, "Re-enter new password"]
            ].map(([label, value, setter, placeholder]) => (
              <label key={label} className="block text-sm font-semibold text-clay-text">
                {label}
                <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[var(--clay-inset)] focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10">
                  <LockKeyhole size={18} className="text-clay-accent" />
                  <input type="password" required minLength={8} value={value} onChange={(event) => setter(event.target.value)} placeholder={placeholder} className={inputClass} />
                </span>
              </label>
            ))}

            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

            <button type="submit" disabled={loading} className="clay-btn-primary w-full gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? "Updating password..." : "Change password"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>
        </GlassCard>
      </div>
    </section>
  );
}
