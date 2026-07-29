import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import OrganizationBrand from "../components/OrganizationBrand.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";

const portalPathForRole = (role) => {
  const normalized = String(role || "student").toLowerCase();
  if (normalized === "admin") return "/admin";
  if (normalized === "alumni") return "/alumni";
  if (normalized === "finance_officer" || normalized === "finance") return "/finance";
  if (normalized === "department_staff") return "/faculty";
  if (normalized === "faculty" || normalized === "lecturer" || normalized === "staff") return "/faculty";
  return "/student";
};

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

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(identifier, password);
      if (data?.user?.mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }
      const role = String(data?.user?.role || "").toLowerCase();
      if (role === "student") {
        navigate("/", { replace: true });
      } else {
        navigate(portalPathForRole(role), { replace: true });
      }
    } catch (err) {
      setError(err?.message || "Unable to login. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-page-shell">
      <motion.div className="login-page-orb login-page-orb-one" animate={{ x: [0, 18, 0], y: [0, -12, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="login-page-orb login-page-orb-two" animate={{ x: [0, -16, 0], y: [0, 14, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="login-card" variants={cardEntrance} initial="hidden" animate="visible">
        <motion.aside className="login-brand-panel" custom={-1} variants={panelEntrance}>
          <div>
            <OrganizationBrand variant="login" />
            <p className="login-eyebrow">
              <Sparkles size={15} />
              {t("auth.official")}
            </p>
            <h1>{t("auth.loginTitle")}</h1>
            <p className="login-brand-copy">{t("auth.loginText")}</p>
          </div>

          <div className="login-security-note">
            <ShieldCheck size={19} />
            <span>Secure access for ATI Jaffna students, alumni, and staff.</span>
          </div>
        </motion.aside>

        <motion.div className="login-form-panel" custom={1} variants={panelEntrance}>
          <div className="login-form-heading">
            <p>{t("nav.login")}</p>
            <h2>{t("auth.welcome")}</h2>
            <span>{t("auth.welcomeText")}</span>
          </div>

          <motion.form onSubmit={handleSubmit} className="login-form" variants={formEntrance}>
            <motion.div variants={fieldEntrance}>
              <label className="login-field">
                <span>Email, Student ID, or Alumni Registration Number</span>
                <div className="login-input-wrap">
                  <Mail size={18} />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    required
                    autoComplete="username"
                    placeholder="Email or ATI registration number"
                  />
                </div>
              </label>
            </motion.div>

            <motion.div variants={fieldEntrance}>
              <label className="login-field">
                <span>{t("auth.password")}</span>
                <div className="login-input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder={t("auth.passwordPlaceholder")}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            </motion.div>

            {error && (
              <motion.div variants={fieldEntrance} className="login-error">
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="login-submit-button"
              variants={fieldEntrance}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.985 }}
            >
              {loading ? t("auth.signingIn") : t("auth.signIn")}
              {!loading && <ArrowRight size={17} />}
            </motion.button>

            <motion.div className="login-register-row" variants={fieldEntrance}>
              <p>{t("auth.newUser")}</p>
              <Link to="/register">
                {t("auth.createAccount")}
              </Link>
            </motion.div>
            <motion.div className="login-register-row" variants={fieldEntrance}>
              <p>Are you an Alumni?</p>
              <Link to="/alumni/register">Create an alumni account</Link>
            </motion.div>
          </motion.form>
        </motion.div>
      </motion.div>
    </section>
  );
}
