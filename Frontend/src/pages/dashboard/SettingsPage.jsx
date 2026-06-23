import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  Globe,
  HardDriveDownload,
  Lock,
  RefreshCw,
  Save,
  Shield,
  SlidersHorizontal,
  Upload,
  Wifi
} from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { apiFetch } from "../../lib/api";
import { useModal } from "../../contexts/ModalContext.jsx";

const defaults = {
  general: {
    institutionName: "ATI Jaffna",
    email: "info@atijaffna.edu.lk",
    phone: "+94 21 222 3456",
    address: "No. 42, Hospital Road, Jaffna",
    timezone: "Asia/Colombo",
    academicYear: "2026"
  },
  notifications: {
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    weeklyDigest: true
  },
  security: {
    passwordPolicy: "strong",
    twoFA: false,
    sessionTimeout: 30,
    lockoutAttempts: 5,
    allowStudentRegistration: true
  },
  academic: {
    gradingScale: "A-F",
    passPercentage: 40,
    semesterStart: "2026-01-15",
    semesterEnd: "2026-06-30",
    attendanceWarning: 75
  },
  integrations: {
    paymentGateway: "PayHere",
    smsGateway: "Twilio",
    emailServer: "SMTP",
    backupFrequency: "daily",
    maintenanceMode: false
  }
};

const sections = [
  { id: "general", label: "General", icon: Globe },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "academic", label: "Academic", icon: SlidersHorizontal },
  { id: "integrations", label: "Integrations", icon: Database }
];

function mergeSettings(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const objectOrEmpty = (section) => (section && typeof section === "object" && !Array.isArray(section) ? section : {});
  return {
    general: { ...defaults.general, ...objectOrEmpty(source.general) },
    notifications: { ...defaults.notifications, ...objectOrEmpty(source.notifications) },
    security: { ...defaults.security, ...objectOrEmpty(source.security) },
    academic: { ...defaults.academic, ...objectOrEmpty(source.academic) },
    integrations: { ...defaults.integrations, ...objectOrEmpty(source.integrations) }
  };
}

function readJsonStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${enabled ? "bg-emerald-400" : "bg-[color:var(--md-hover)]"}`}
      aria-pressed={enabled}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="portal-stat-label">{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, type = "text", min, max, placeholder }) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(type === "number" ? Number(event.target.value) : event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none transition focus:border-sky-400"
    />
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none transition focus:border-sky-400"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function SwitchRow({ title, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-4 py-3">
      <div>
        <p className="text-sm font-bold text-[color:var(--md-text-primary)]">{title}</p>
        <p className="text-xs text-[color:var(--md-text-secondary)]">{description}</p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const { confirm } = useModal();
  const [settings, setSettings] = useState(defaults);
  const [activeSection, setActiveSection] = useState("general");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditLog, setAuditLog] = useState(() => readJsonStorage("atiSettingsAudit", []));
  const importRef = useRef(null);

  const activeMeta = sections.find((section) => section.id === activeSection) || sections[0];
  const ActiveIcon = activeMeta.icon;

  const addAudit = (message) => {
    const entry = { id: Date.now(), message, time: new Date().toLocaleString() };
    setAuditLog((current) => {
      const next = [entry, ...current].slice(0, 8);
      localStorage.setItem("atiSettingsAudit", JSON.stringify(next));
      return next;
    });
  };

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/settings");
      const merged = mergeSettings(data);
      setSettings(merged);
      localStorage.setItem("atiAdminSettings", JSON.stringify(merged));
      setStatus("Settings loaded from server.");
    } catch (err) {
      const cached = localStorage.getItem("atiAdminSettings");
      if (cached) {
        setSettings(mergeSettings(readJsonStorage("atiAdminSettings", defaults)));
        setStatus("Loaded saved browser copy. Server settings were unavailable.");
      } else {
        setError(err?.message || "Unable to load settings.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const validation = useMemo(() => {
    const issues = [];
    if (!settings.general.institutionName.trim()) issues.push("Institution name is required.");
    if (!settings.general.email.includes("@")) issues.push("Institution email must be valid.");
    if (settings.security.sessionTimeout < 5) issues.push("Session timeout must be at least 5 minutes.");
    if (settings.security.lockoutAttempts < 1) issues.push("Lockout attempts must be at least 1.");
    if (settings.academic.passPercentage < 0 || settings.academic.passPercentage > 100) issues.push("Pass percentage must be between 0 and 100.");
    if (settings.academic.attendanceWarning < 0 || settings.academic.attendanceWarning > 100) issues.push("Attendance warning must be between 0 and 100.");
    if (settings.academic.semesterEnd < settings.academic.semesterStart) issues.push("Semester end date must be after start date.");
    return issues;
  }, [settings]);

  const updateSection = (section, key, value) => {
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value }
    }));
    setStatus("");
  };

  const saveSettings = async (label = "settings") => {
    if (validation.length) {
      setError(validation[0]);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const saved = await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify(settings)
      });
      const merged = mergeSettings(saved);
      setSettings(merged);
      localStorage.setItem("atiAdminSettings", JSON.stringify(merged));
      setStatus(`Saved ${label}.`);
      addAudit(`Saved ${label}`);
      window.dispatchEvent(new Event("ati-settings-updated"));
    } catch (err) {
      localStorage.setItem("atiAdminSettings", JSON.stringify(settings));
      setError(err?.message || "Saved browser copy only. Server save failed.");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    const confirmed = await confirm({ title: "Reset settings?", message: "Restore every system setting to its default value?", confirmLabel: "Reset defaults", tone: "warning" });
    if (!confirmed) return;
    setSaving(true);
    setError("");
    try {
      const saved = await apiFetch("/api/settings/reset", { method: "POST" });
      const merged = mergeSettings(saved);
      setSettings(merged);
      localStorage.setItem("atiAdminSettings", JSON.stringify(merged));
      setStatus("Defaults restored and saved.");
      addAudit("Reset settings to defaults");
      window.dispatchEvent(new Event("ati-settings-updated"));
    } catch (err) {
      setSettings(defaults);
      localStorage.setItem("atiAdminSettings", JSON.stringify(defaults));
      setError(err?.message || "Defaults restored in browser only. Server reset failed.");
    } finally {
      setSaving(false);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ati-admin-settings.json";
    anchor.click();
    URL.revokeObjectURL(url);
    addAudit("Exported settings JSON");
    setStatus("Settings export created.");
  };

  const createBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      settings,
      auditLog
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ati-backup-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    addAudit("Created settings backup");
    setStatus("Backup file created.");
  };

  const importJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = parsed && typeof parsed === "object" && parsed.settings ? parsed.settings : parsed;
      if (!imported || typeof imported !== "object" || Array.isArray(imported)) throw new Error("Invalid settings shape.");
      setSettings(mergeSettings(imported));
      setStatus("Settings imported. Save to apply them.");
      addAudit(`Imported ${file.name}`);
    } catch {
      setError("Invalid settings JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  const testIntegration = async (type, name) => {
    setError("");
    setStatus("");
    try {
      const result = await apiFetch("/api/settings/integrations/test", {
        method: "POST",
        body: JSON.stringify({ type, provider: name })
      });
      setStatus(result?.message || `Test successful for ${name}.`);
      addAudit(`Tested ${name}`);
    } catch (err) {
      setError(err?.message || `Unable to test ${name}.`);
    }
  };

  const clearBrowserCache = () => {
    localStorage.removeItem("atiAdminSettings");
    setStatus("Browser settings cache cleared.");
    addAudit("Cleared browser settings cache");
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[color:var(--md-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="portal-page-label">Admin</p>
          <h1 className="portal-page-title">System Settings</h1>
          <p className="portal-page-subtitle">Configure portal behavior, security, integrations, and academic defaults.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadSettings} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Reload
          </button>
          <button type="button" onClick={exportJson} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
            <Download size={16} />
            Export
          </button>
          <button type="button" onClick={() => importRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
            <Upload size={16} />
            Import
          </button>
          <input ref={importRef} type="file" accept="application/json" onChange={importJson} className="hidden" />
          <button type="button" onClick={() => saveSettings("all settings")} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-60">
            <Save size={16} />
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {(status || error || validation.length > 0) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${error || validation.length ? "border-amber-400/25 bg-amber-500/10 text-[color:var(--md-text-primary)]" : "border-emerald-400/20 bg-emerald-500/10 text-[color:var(--md-text-primary)]"}`}>
          <div className="flex items-start gap-3">
            {error || validation.length ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <div>
              <p>{error || status}</p>
              {validation.length > 0 && (
                <ul className="mt-1 space-y-1">
                  {validation.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <GlassCard className="h-fit p-3">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                type="button"
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition ${
                  activeSection === section.id ? "bg-sky-500 text-slate-950" : "text-[color:var(--md-text-primary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]"
                }`}
              >
                <section.icon size={17} />
                {section.label}
              </button>
            ))}
          </nav>
          <div className="mt-4 border-t border-[color:var(--md-border)] pt-4">
            <button type="button" onClick={createBackup} className="mb-2 flex w-full items-center gap-2 rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
              <HardDriveDownload size={16} />
              Create Backup
            </button>
            <button type="button" onClick={clearBrowserCache} className="mb-2 flex w-full items-center gap-2 rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
              <Database size={16} />
              Clear Cache
            </button>
            <button type="button" onClick={resetDefaults} className="flex w-full items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-bold text-[color:var(--md-danger)] hover:bg-red-500/20">
              <RefreshCw size={16} />
              Reset Defaults
            </button>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-5 flex flex-col gap-3 border-b border-[color:var(--md-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-400/10 text-[color:var(--md-primary)]">
                <ActiveIcon size={21} />
              </span>
              <div>
                <h2 className="classroom-section-title">{activeMeta.label} Settings</h2>
                <p className="text-xs text-[color:var(--md-text-secondary)]">Changes are saved to the admin settings API.</p>
              </div>
            </div>
            <button type="button" onClick={() => saveSettings(activeMeta.label.toLowerCase())} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-60">
              <Save size={16} />
              Save Section
            </button>
          </div>

          {activeSection === "general" && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Institution Name"><TextInput value={settings.general.institutionName} onChange={(value) => updateSection("general", "institutionName", value)} /></Field>
              <Field label="Email Address"><TextInput value={settings.general.email} onChange={(value) => updateSection("general", "email", value)} /></Field>
              <Field label="Phone Number"><TextInput value={settings.general.phone} onChange={(value) => updateSection("general", "phone", value)} /></Field>
              <Field label="Address"><TextInput value={settings.general.address} onChange={(value) => updateSection("general", "address", value)} /></Field>
              <Field label="Timezone"><SelectInput value={settings.general.timezone} onChange={(value) => updateSection("general", "timezone", value)} options={["Asia/Colombo", "UTC", "Asia/Kolkata", "Asia/Singapore"]} /></Field>
              <Field label="Academic Year"><TextInput value={settings.general.academicYear} onChange={(value) => updateSection("general", "academicYear", value)} /></Field>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="space-y-3">
              <SwitchRow title="Email Alerts" description="Send admin alerts and workflow emails." enabled={settings.notifications.emailAlerts} onChange={() => updateSection("notifications", "emailAlerts", !settings.notifications.emailAlerts)} />
              <SwitchRow title="SMS Alerts" description="Send urgent notices through the SMS gateway." enabled={settings.notifications.smsAlerts} onChange={() => updateSection("notifications", "smsAlerts", !settings.notifications.smsAlerts)} />
              <SwitchRow title="Push Notifications" description="Show live notifications in the dashboard header." enabled={settings.notifications.pushNotifications} onChange={() => updateSection("notifications", "pushNotifications", !settings.notifications.pushNotifications)} />
              <SwitchRow title="Weekly Digest" description="Send a weekly summary of records and messages." enabled={settings.notifications.weeklyDigest} onChange={() => updateSection("notifications", "weeklyDigest", !settings.notifications.weeklyDigest)} />
            </div>
          )}

          {activeSection === "security" && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Password Policy"><SelectInput value={settings.security.passwordPolicy} onChange={(value) => updateSection("security", "passwordPolicy", value)} options={["weak", "medium", "strong"]} /></Field>
              <Field label="Session Timeout (minutes)"><TextInput type="number" min="5" value={settings.security.sessionTimeout} onChange={(value) => updateSection("security", "sessionTimeout", value)} /></Field>
              <Field label="Lockout Attempts"><TextInput type="number" min="1" value={settings.security.lockoutAttempts} onChange={(value) => updateSection("security", "lockoutAttempts", value)} /></Field>
              <div className="space-y-3 md:col-span-2">
                <SwitchRow title="Two-Factor Authentication" description="Require extra verification for admin accounts." enabled={settings.security.twoFA} onChange={() => updateSection("security", "twoFA", !settings.security.twoFA)} />
                <SwitchRow title="Student Self Registration" description="Allow public users to create student accounts." enabled={settings.security.allowStudentRegistration} onChange={() => updateSection("security", "allowStudentRegistration", !settings.security.allowStudentRegistration)} />
              </div>
            </div>
          )}

          {activeSection === "academic" && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Grading Scale"><SelectInput value={settings.academic.gradingScale} onChange={(value) => updateSection("academic", "gradingScale", value)} options={["A-F", "A+-F", "percentage"]} /></Field>
              <Field label="Pass Percentage"><TextInput type="number" min="0" max="100" value={settings.academic.passPercentage} onChange={(value) => updateSection("academic", "passPercentage", value)} /></Field>
              <Field label="Semester Start"><TextInput type="date" value={settings.academic.semesterStart} onChange={(value) => updateSection("academic", "semesterStart", value)} /></Field>
              <Field label="Semester End"><TextInput type="date" value={settings.academic.semesterEnd} onChange={(value) => updateSection("academic", "semesterEnd", value)} /></Field>
              <Field label="Attendance Warning %"><TextInput type="number" min="0" max="100" value={settings.academic.attendanceWarning} onChange={(value) => updateSection("academic", "attendanceWarning", value)} /></Field>
            </div>
          )}

          {activeSection === "integrations" && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Payment Gateway"><SelectInput value={settings.integrations.paymentGateway} onChange={(value) => updateSection("integrations", "paymentGateway", value)} options={["PayHere", "Stripe", "PayPal"]} /></Field>
                <Field label="SMS Gateway"><SelectInput value={settings.integrations.smsGateway} onChange={(value) => updateSection("integrations", "smsGateway", value)} options={["Twilio", "Vonage", "AWS SNS"]} /></Field>
                <Field label="Email Server"><SelectInput value={settings.integrations.emailServer} onChange={(value) => updateSection("integrations", "emailServer", value)} options={["SMTP", "SendGrid", "Mailgun"]} /></Field>
                <Field label="Backup Frequency"><SelectInput value={settings.integrations.backupFrequency} onChange={(value) => updateSection("integrations", "backupFrequency", value)} options={["hourly", "daily", "weekly", "manual"]} /></Field>
              </div>
              <SwitchRow title="Maintenance Mode" description="Show admins that the public portal is under maintenance." enabled={settings.integrations.maintenanceMode} onChange={() => updateSection("integrations", "maintenanceMode", !settings.integrations.maintenanceMode)} />
              <div className="grid gap-3 sm:grid-cols-3">
                <button type="button" onClick={() => testIntegration("payment", settings.integrations.paymentGateway)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
                  <Wifi size={16} />
                  Test Payment
                </button>
                <button type="button" onClick={() => testIntegration("sms", settings.integrations.smsGateway)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
                  <Wifi size={16} />
                  Test SMS
                </button>
                <button type="button" onClick={() => testIntegration("email", settings.integrations.emailServer)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
                  <Wifi size={16} />
                  Test Email
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="classroom-section-title">Configuration Summary</h2>
            <FileJson size={20} className="text-[color:var(--md-text-secondary)]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Portal", settings.general.institutionName],
              ["Notifications", settings.notifications.emailAlerts ? "Email enabled" : "Email disabled"],
              ["Security", `${settings.security.passwordPolicy} policy`],
              ["Session", `${settings.security.sessionTimeout} minutes`],
              ["Semester", `${settings.academic.semesterStart} to ${settings.academic.semesterEnd}`],
              ["Maintenance", settings.integrations.maintenanceMode ? "Enabled" : "Disabled"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">{label}</p>
                <p className="mt-1 text-sm font-bold text-[color:var(--md-text-primary)]">{value}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="classroom-section-title">Audit Log</h2>
            <Activity size={20} className="text-[color:var(--md-text-secondary)]" />
          </div>
          <div className="space-y-2">
            {auditLog.length === 0 ? (
              <p className="rounded-lg bg-[color:var(--md-hover)] px-4 py-6 text-center text-sm text-[color:var(--md-text-secondary)]">No settings activity yet.</p>
            ) : (
              auditLog.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-4 py-3">
                  <p className="text-sm font-bold text-[color:var(--md-text-primary)]">{entry.message}</p>
                  <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">{entry.time}</p>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
