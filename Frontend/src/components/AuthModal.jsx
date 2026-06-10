import { useState } from "react";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppModal from "./AppModal.jsx";
import OrganizationBrand from "./OrganizationBrand.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

const portalPathForRole = (role) => {
  const normalized = String(role || "student").toLowerCase();
  if (normalized === "admin") return "/admin";
  if (normalized === "finance_officer" || normalized === "finance") return "/finance";
  if (normalized === "department_staff") return "/faculty";
  if (normalized === "faculty" || normalized === "lecturer" || normalized === "staff") return "/faculty";
  return "/student";
};

export default function AuthModal({ open, onClose, initialView = "login" }) {
  const [view, setView] = useState(initialView);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const close = () => {
    setError("");
    onClose?.();
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login(identifier, password);
      close();
      navigate(data?.user?.mustChangePassword ? "/change-password" : portalPathForRole(data?.user?.role));
    } catch (err) {
      setError(err?.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal open={open} onClose={close} size="auth" hideClose>
      <div className="auth-popup">
        <aside className="auth-popup-brand">
          <OrganizationBrand variant="login" />
          <div>
            <p className="auth-popup-eyebrow"><ShieldCheck size={15} /> Secure ATI Jaffna portal</p>
            <h2>Welcome to your academic workspace.</h2>
            <p>Access records, learning tools, notices, and department services from one account.</p>
          </div>
        </aside>

        <div className="auth-popup-content">
          <button type="button" className="app-modal-close auth-popup-close" onClick={close} aria-label="Close popup"><X size={17} /></button>
          <div className="auth-popup-tabs">
            <button type="button" className={view === "login" ? "active" : ""} onClick={() => setView("login")}>Login</button>
            <button type="button" className={view === "register" ? "active" : ""} onClick={() => setView("register")}>Registration</button>
          </div>

          {view === "login" ? (
            <form className="auth-popup-form" onSubmit={submitLogin}>
              <div>
                <h3>Sign in</h3>
                <p>Use your email or ATI Student ID.</p>
              </div>
              <label>
                <span>Email or Student ID</span>
                <div className="auth-popup-input"><Mail size={17} /><input required value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" /></div>
              </label>
              <label>
                <span>Password</span>
                <div className="auth-popup-input"><LockKeyhole size={17} /><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></div>
              </label>
              {error && <p className="auth-popup-error">{error}</p>}
              <button type="submit" className="app-modal-button app-modal-button-primary auth-popup-submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"} {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          ) : (
            <div className="auth-popup-register">
              <span className="auth-popup-register-icon"><UserPlus size={24} /></span>
              <h3>Create a student account</h3>
              <p>Registration includes your Student ID, NIC, programme, study mode, and guardian contact so your account is correctly saved in MongoDB.</p>
              <button type="button" className="app-modal-button app-modal-button-primary" onClick={() => { close(); navigate("/register"); }}>
                Open registration form <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </AppModal>
  );
}
