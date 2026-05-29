import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import GlassCard from "../components/GlassCard.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

const portalPathForRole = (role) => {
  const normalized = String(role || "student").toLowerCase();
  if (normalized === "admin") return "/admin";
  if (normalized === "lecturer") return "/faculty";
  return "/student";
};

const hndProgrammes = [
  "Higher National Diploma in Accountancy - (HNDA)",
  "Higher National Diploma in English",
  "Higher National Diploma in Engineering - Civil",
  "Higher National Diploma in Engineering - Electrical",
  "Higher National Diploma in Management - (HNDM)",
  "Higher National Diploma in Information Technology - (HNDIT)",
  "Higher National Diploma in Quantity Surveying"
];

const modeOptions = ["Full-time", "Part-time"];
const hnditProgramme = "Higher National Diploma in Information Technology - (HNDIT)";
const hnditAcademicStages = [
  "First year Full Time",
  "Second year Full Time",
  "First year Part Time",
  "Second year Part Time"
];

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  studentId: "",
  nic: "",
  department: "",
  program: "",
  academicStage: "",
  studyMode: "Full-time",
  phone: "",
  guardianName: "",
  guardianPhone: ""
};

function FieldShell({ label, icon: Icon, children }) {
  return (
    <label className="block text-sm font-semibold text-clay-text">
      {label}
      <span className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[var(--clay-inset)] focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10">
        <Icon size={18} className="shrink-0 text-clay-accent" />
        {children}
      </span>
    </label>
  );
}

const controlClass = "min-w-0 flex-1 bg-transparent text-clay-text outline-none placeholder:text-slate-400";

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const setField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "department") {
        next.program = value;
        next.academicStage = value === hnditProgramme ? next.academicStage : "";
      }
      if (field === "academicStage") {
        next.studyMode = value.includes("Part Time") ? "Part-time" : "Full-time";
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registrationPayload } = form;
      const data = await register(registrationPayload);
      setSuccess(data.message || "Registration successful.");
      setForm(initialForm);
      if (data.token) {
        navigate(portalPathForRole(data?.user?.role), { replace: true });
      }
    } catch (err) {
      setError(err?.message || "Unable to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-section min-h-screen bg-gradient-to-b from-[#f7fbff] via-[#f0f4f8] to-[#e8edf2] pt-32">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Register"
          title="Create your ATI portal account"
          text="Build a complete student profile with academic pathway, department, intake, and emergency contact details."
        />
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <GlassCard className="h-full">
            <h3 className="text-xl font-black text-clay-text">Student portal benefits</h3>
            <div className="mt-5 grow space-y-3 text-sm text-clay-muted">
              {[
                "Department and programme mapped at signup",
                "Student profile appears in admin records",
                "Guardian contact ready for campus communication",
                "Attendance, grades, LMS, and fees linked to one account"
              ].map((item) => (
                <p key={item} className="flex gap-2">
                  <CheckCircle2 className="shrink-0 text-clay-accent" size={18} />
                  {item}
                </p>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="h-full">
            <h3 className="text-xl font-black text-clay-text">Request access</h3>
            <p className="mt-2 text-sm leading-6 text-clay-muted">Create an active student account with academic details.</p>
            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell label="Full name" icon={UserRound}>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    required
                    placeholder="Your full name"
                    className={controlClass}
                  />
                </FieldShell>

                <FieldShell label="Student ID" icon={ShieldCheck}>
                  <input
                    type="text"
                    value={form.studentId}
                    onChange={(event) => setField("studentId", event.target.value)}
                    placeholder="ATI/ST/2026/001"
                    className={controlClass}
                  />
                </FieldShell>

                <FieldShell label="NIC" icon={ShieldCheck}>
                  <input
                    type="text"
                    value={form.nic}
                    onChange={(event) => setField("nic", event.target.value)}
                    required
                    placeholder="200012345678 or 901234567V"
                    className={controlClass}
                  />
                </FieldShell>

                <FieldShell label="Email address" icon={Mail}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setField("email", event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@atijaffna.edu.lk"
                    className={controlClass}
                  />
                </FieldShell>

                <FieldShell label="Phone number" icon={Phone}>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    placeholder="+94 77 123 4567"
                    className={controlClass}
                  />
                </FieldShell>

                <FieldShell label="Department / HND programme" icon={GraduationCap}>
                  <select
                    value={form.department}
                    onChange={(event) => setField("department", event.target.value)}
                    required
                    className={controlClass}
                  >
                    <option value="">Select department / HND programme</option>
                    {hndProgrammes.map((programme) => (
                      <option key={programme} value={programme}>
                        {programme}
                      </option>
                    ))}
                  </select>
                </FieldShell>

                <FieldShell label="Study mode" icon={BookOpen}>
                  <select
                    value={form.studyMode}
                    onChange={(event) => setField("studyMode", event.target.value)}
                    className={controlClass}
                  >
                    {modeOptions.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </FieldShell>

                {form.department === hnditProgramme && (
                  <FieldShell label="HNDIT student group" icon={BookOpen}>
                    <select
                      value={form.academicStage}
                      onChange={(event) => setField("academicStage", event.target.value)}
                      required
                      className={controlClass}
                    >
                      <option value="">Select year and study type</option>
                      {hnditAcademicStages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </FieldShell>
                )}

                <FieldShell label="Guardian name" icon={UsersRound}>
                  <input
                    type="text"
                    value={form.guardianName}
                    onChange={(event) => setField("guardianName", event.target.value)}
                    placeholder="Parent or guardian"
                    className={controlClass}
                  />
                </FieldShell>

                <FieldShell label="Guardian phone" icon={Phone}>
                  <input
                    type="tel"
                    value={form.guardianPhone}
                    onChange={(event) => setField("guardianPhone", event.target.value)}
                    placeholder="+94 77 765 4321"
                    className={controlClass}
                  />
                </FieldShell>

                <div className="md:col-span-2">
                  <FieldShell label="Password" icon={LockKeyhole}>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) => setField("password", event.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      className={controlClass}
                    />
                  </FieldShell>
                </div>

                <div className="md:col-span-2">
                  <FieldShell label="Confirm password" icon={LockKeyhole}>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={(event) => setField("confirmPassword", event.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      className={controlClass}
                    />
                  </FieldShell>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="clay-btn-primary w-full gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Creating account..." : "Submit registration"}
                {!loading && <ArrowRight size={17} />}
              </button>

              <div className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-sm text-clay-muted sm:flex-row sm:items-center sm:justify-between">
                <p>Already have an account?</p>
                <Link to="/login" className="font-bold text-clay-accent transition hover:text-blue-700">
                  Sign in
                </Link>
              </div>
            </form>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
