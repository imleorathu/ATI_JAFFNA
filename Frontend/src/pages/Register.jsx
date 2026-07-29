import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import OrganizationBrand from "../components/OrganizationBrand.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";

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
const studyYearOptions = [
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
  academicYear: "",
  academicStage: "",
  studyMode: "Full-time",
  phone: "",
  guardianName: "",
  guardianPhone: ""
};

function FieldShell({ label, icon: Icon, children }) {
  const { translate } = useLanguage();
  return (
    <label className="register-field">
      <span>{translate(label)}</span>
      <div className="register-input-wrap">
        <Icon size={18} />
        {children}
      </div>
    </label>
  );
}

const controlClass = "register-control";

const cardEntrance = {
  hidden: { opacity: 0, y: 28, scale: 0.975 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 19, mass: 0.85, staggerChildren: 0.08 }
  }
};

const panelEntrance = {
  hidden: (direction) => ({ opacity: 0, x: direction * 30 }),
  visible: { opacity: 1, x: 0, transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] } }
};

const formEntrance = {
  hidden: {},
  visible: { transition: { delayChildren: 0.16, staggerChildren: 0.045 } }
};

const fieldEntrance = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } }
};

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t, translate } = useLanguage();

  const setField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "department") {
        next.program = value;
      }
      if (field === "studyMode") {
        const incompatibleStage = value === "Full-time" ? "Part Time" : "Full Time";
        if (next.academicStage.includes(incompatibleStage)) {
          next.academicStage = studyYearOptions.find((stage) => stage.includes(value === "Full-time" ? "Full Time" : "Part Time")) || "";
        }
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
    <section className="register-page-shell">
      <motion.div className="login-page-orb login-page-orb-one" animate={{ x: [0, 18, 0], y: [0, -12, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="login-page-orb login-page-orb-two" animate={{ x: [0, -16, 0], y: [0, 14, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="register-card" variants={cardEntrance} initial="hidden" animate="visible">
        <motion.aside className="register-brand-panel" custom={-1} variants={panelEntrance}>
          <div>
            <OrganizationBrand variant="login" />
            <p className="login-eyebrow">
              <Sparkles size={15} />
              {t("auth.official")}
            </p>
            <h1>{t("auth.registerTitle")}</h1>
            <p className="login-brand-copy">{t("auth.registerText")}</p>
          </div>

          <div className="login-security-note">
            <ShieldCheck size={19} />
            <span>Create one secure account for ATI Jaffna portal access.</span>
          </div>
        </motion.aside>

        <motion.div className="register-form-panel" custom={1} variants={panelEntrance}>
          <div className="login-form-heading">
            <p>{t("nav.register")}</p>
            <h2>{t("auth.requestAccess")}</h2>
            <span>{t("auth.requestAccessText")}</span>
          </div>
          <motion.form onSubmit={handleSubmit} className="register-form" variants={formEntrance}>
              <motion.div className="register-form-grid" variants={formEntrance}>
                <motion.div variants={fieldEntrance}><FieldShell label="Full name" icon={UserRound}>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    required
                    placeholder="Your full name"
                    className={controlClass}
                  />
                </FieldShell></motion.div>

                <motion.div variants={fieldEntrance}><FieldShell label="Student ID" icon={ShieldCheck}>
                  <input
                    type="text"
                    value={form.studentId}
                    onChange={(event) => setField("studentId", event.target.value)}
                    required
                    placeholder="ATI/ST/2026/001"
                    className={controlClass}
                  />
                </FieldShell></motion.div>

                <motion.div variants={fieldEntrance}><FieldShell label="NIC" icon={ShieldCheck}>
                  <input
                    type="text"
                    value={form.nic}
                    onChange={(event) => setField("nic", event.target.value)}
                    required
                    placeholder="200012345678 or 901234567V"
                    className={controlClass}
                  />
                </FieldShell></motion.div>

                <motion.div variants={fieldEntrance}><FieldShell label="Email address" icon={Mail}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setField("email", event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@atijaffna.edu.lk"
                    className={controlClass}
                  />
                </FieldShell></motion.div>

                <motion.div variants={fieldEntrance}><FieldShell label="Phone number" icon={Phone}>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    placeholder="+94 77 123 4567"
                    className={controlClass}
                  />
                </FieldShell></motion.div>

                <motion.div variants={fieldEntrance} className="register-field-wide"><FieldShell label="Department / HND programme" icon={GraduationCap}>
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
                </FieldShell></motion.div>

                <motion.div variants={fieldEntrance}><FieldShell label="Study mode" icon={BookOpen}>
                  <select
                    value={form.studyMode}
                    onChange={(event) => setField("studyMode", event.target.value)}
                    required
                    className={controlClass}
                  >
                    {modeOptions.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode === "Full-time" ? "Full Time" : "Part Time"}
                      </option>
                    ))}
                  </select>
                </FieldShell></motion.div>

                <motion.div variants={fieldEntrance}><FieldShell label="Academic year" icon={GraduationCap}>
                  <input
                    type="text"
                    value={form.academicYear}
                    onChange={(event) => setField("academicYear", event.target.value)}
                    required
                    placeholder="2025/2026"
                    className={controlClass}
                  />
                </FieldShell></motion.div>

                <motion.div variants={fieldEntrance}><FieldShell label="Current study year" icon={BookOpen}>
                  <select
                    value={form.academicStage}
                    onChange={(event) => setField("academicStage", event.target.value)}
                    required
                    className={controlClass}
                  >
                    <option value="">Select study year</option>
                    {studyYearOptions.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </FieldShell></motion.div>

                <motion.div variants={fieldEntrance}><FieldShell label="Guardian name" icon={UsersRound}>
                  <input
                    type="text"
                    value={form.guardianName}
                    onChange={(event) => setField("guardianName", event.target.value)}
                    placeholder="Parent or guardian"
                    className={controlClass}
                  />
                </FieldShell></motion.div>

                <motion.div variants={fieldEntrance}><FieldShell label="Guardian phone" icon={Phone}>
                  <input
                    type="tel"
                    value={form.guardianPhone}
                    onChange={(event) => setField("guardianPhone", event.target.value)}
                    placeholder="+94 77 765 4321"
                    className={controlClass}
                  />
                </FieldShell></motion.div>

                <motion.div className="md:col-span-2" variants={fieldEntrance}>
                  <FieldShell label="Password" icon={LockKeyhole}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) => setField("password", event.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      className={controlClass}
                    />
                    <button
                      type="button"
                      className="register-password-toggle"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </FieldShell>
                </motion.div>

                <motion.div className="md:col-span-2" variants={fieldEntrance}>
                  <FieldShell label="Confirm password" icon={LockKeyhole}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(event) => setField("confirmPassword", event.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Re-enter password"
                      className={controlClass}
                    />
                    <button
                      type="button"
                      className="register-password-toggle"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </FieldShell>
                </motion.div>
              </motion.div>

              {error && (
                <div className="register-message register-message-error">
                  {error}
                </div>
              )}
              {success && (
                <div className="register-message register-message-success">
                  {success}
                </div>
              )}

              <motion.button type="submit" disabled={loading} className="login-submit-button" variants={fieldEntrance} whileHover={{ y: -2 }} whileTap={{ scale: 0.985 }}>
                {loading ? t("auth.creatingAccount") : t("auth.submitRegistration")}
                {!loading && <ArrowRight size={17} />}
              </motion.button>

              <motion.div className="login-register-row" variants={fieldEntrance}>
                <p>{t("auth.hasAccount")}</p>
                <Link to="/login">
                  {t("auth.signIn")}
                </Link>
              </motion.div>
          </motion.form>
        </motion.div>
      </motion.div>
    </section>
  );
}
