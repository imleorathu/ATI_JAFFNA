import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import GlassCard from "../components/GlassCard.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

const portalPathForRole = (role) => {
  const normalized = String(role || "student").toLowerCase();
  if (normalized === "admin") return "/admin";
  if (normalized === "faculty" || normalized === "lecturer") return "/faculty";
  if (normalized === "parent") return "/parent";
  return "/student";
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);
      if (data?.user?.mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }
      navigate(portalPathForRole(data?.user?.role), { replace: true });
    } catch (err) {
      setError(err?.message || "Unable to login. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-section min-h-screen bg-gradient-to-b from-[#f7fbff] via-[#f0f4f8] to-[#e8edf2] pt-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Login" title="Sign in to your ATI Jaffna workspace" text="Access your dashboard, academic records, notices, and learning tools." />
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <GlassCard className="h-full">
            <h3 className="text-xl font-black text-clay-text">Portal access</h3>
            <div className="mt-5 grow space-y-3 text-sm text-clay-muted">
              {["Role-based dashboard routing", "Academic records and payments", "Campus notices and LMS tools"].map((item) => (
                <p key={item} className="flex gap-2">
                  <CheckCircle2 className="shrink-0 text-clay-accent" size={18} />
                  {item}
                </p>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="h-full">
            <h3 className="text-xl font-black text-clay-text">Welcome back</h3>
            <p className="mt-2 text-sm leading-6 text-clay-muted">Sign in once and we will open the right dashboard for your account.</p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <label className="block text-sm font-semibold text-clay-text">
              Email address
              <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[var(--clay-inset)] focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10">
                <Mail size={18} className="text-clay-accent" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="min-w-0 flex-1 bg-transparent text-clay-text outline-none placeholder:text-slate-400"
                  placeholder="you@atijaffna.edu.lk"
                />
              </span>
            </label>

            <label className="block text-sm font-semibold text-clay-text">
              Password
              <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[var(--clay-inset)] focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10">
                <LockKeyhole size={18} className="text-clay-accent" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  className="min-w-0 flex-1 bg-transparent text-clay-text outline-none placeholder:text-slate-400"
                  placeholder="Enter password"
                />
              </span>
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="clay-btn-primary w-full gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={17} />}
            </button>

            <div className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-sm text-clay-muted sm:flex-row sm:items-center sm:justify-between">
              <p>New to ATI Jaffna?</p>
              <Link to="/register" className="font-bold text-clay-accent transition hover:text-blue-700">
                Create an account
              </Link>
            </div>
          </form>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
