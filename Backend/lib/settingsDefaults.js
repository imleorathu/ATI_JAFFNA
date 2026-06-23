const defaultSystemSettings = Object.freeze({
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
});

const allowed = Object.freeze({
  passwordPolicy: new Set(["weak", "medium", "strong"]),
  gradingScale: new Set(["A-F", "A+-F", "percentage"]),
  timezone: new Set(["Asia/Colombo", "UTC", "Asia/Kolkata", "Asia/Singapore"]),
  paymentGateway: new Set(["PayHere", "Stripe", "PayPal"]),
  smsGateway: new Set(["Twilio", "Vonage", "AWS SNS"]),
  emailServer: new Set(["SMTP", "SendGrid", "Mailgun"]),
  backupFrequency: new Set(["hourly", "daily", "weekly", "manual"])
});

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringValue(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function booleanValue(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function enumValue(value, options, fallback) {
  return options.has(value) ? value : fallback;
}

function mergeSystemSettings(value = {}) {
  const source = plainObject(value);
  const general = plainObject(source.general);
  const notifications = plainObject(source.notifications);
  const security = plainObject(source.security);
  const academic = plainObject(source.academic);
  const integrations = plainObject(source.integrations);

  return {
    general: {
      institutionName: stringValue(general.institutionName, defaultSystemSettings.general.institutionName) || defaultSystemSettings.general.institutionName,
      email: stringValue(general.email, defaultSystemSettings.general.email),
      phone: stringValue(general.phone, defaultSystemSettings.general.phone),
      address: stringValue(general.address, defaultSystemSettings.general.address),
      timezone: enumValue(general.timezone, allowed.timezone, defaultSystemSettings.general.timezone),
      academicYear: stringValue(general.academicYear, defaultSystemSettings.general.academicYear)
    },
    notifications: {
      emailAlerts: booleanValue(notifications.emailAlerts, defaultSystemSettings.notifications.emailAlerts),
      smsAlerts: booleanValue(notifications.smsAlerts, defaultSystemSettings.notifications.smsAlerts),
      pushNotifications: booleanValue(notifications.pushNotifications, defaultSystemSettings.notifications.pushNotifications),
      weeklyDigest: booleanValue(notifications.weeklyDigest, defaultSystemSettings.notifications.weeklyDigest)
    },
    security: {
      passwordPolicy: enumValue(security.passwordPolicy, allowed.passwordPolicy, defaultSystemSettings.security.passwordPolicy),
      twoFA: booleanValue(security.twoFA, defaultSystemSettings.security.twoFA),
      sessionTimeout: numberValue(security.sessionTimeout, defaultSystemSettings.security.sessionTimeout, 5, 1440),
      lockoutAttempts: numberValue(security.lockoutAttempts, defaultSystemSettings.security.lockoutAttempts, 1, 20),
      allowStudentRegistration: booleanValue(security.allowStudentRegistration, defaultSystemSettings.security.allowStudentRegistration)
    },
    academic: {
      gradingScale: enumValue(academic.gradingScale, allowed.gradingScale, defaultSystemSettings.academic.gradingScale),
      passPercentage: numberValue(academic.passPercentage, defaultSystemSettings.academic.passPercentage, 0, 100),
      semesterStart: stringValue(academic.semesterStart, defaultSystemSettings.academic.semesterStart),
      semesterEnd: stringValue(academic.semesterEnd, defaultSystemSettings.academic.semesterEnd),
      attendanceWarning: numberValue(academic.attendanceWarning, defaultSystemSettings.academic.attendanceWarning, 0, 100)
    },
    integrations: {
      paymentGateway: enumValue(integrations.paymentGateway, allowed.paymentGateway, defaultSystemSettings.integrations.paymentGateway),
      smsGateway: enumValue(integrations.smsGateway, allowed.smsGateway, defaultSystemSettings.integrations.smsGateway),
      emailServer: enumValue(integrations.emailServer, allowed.emailServer, defaultSystemSettings.integrations.emailServer),
      backupFrequency: enumValue(integrations.backupFrequency, allowed.backupFrequency, defaultSystemSettings.integrations.backupFrequency),
      maintenanceMode: booleanValue(integrations.maintenanceMode, defaultSystemSettings.integrations.maintenanceMode)
    }
  };
}

function validateSystemSettings(settings = {}) {
  const merged = mergeSystemSettings(settings);
  const issues = [];

  if (!merged.general.institutionName) issues.push("Institution name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merged.general.email)) issues.push("Institution email must be valid.");
  if (new Date(merged.academic.semesterEnd) < new Date(merged.academic.semesterStart)) issues.push("Semester end date must be after start date.");

  return { settings: merged, issues };
}

function integrationTestResult(type, provider) {
  const knownTypes = new Set(["payment", "sms", "email"]);
  if (!knownTypes.has(type)) return { ok: false, message: "Unknown integration type." };
  if (!provider || typeof provider !== "string") return { ok: false, message: "Integration provider is not configured." };
  return {
    ok: true,
    message: `${provider} configuration is present. Live credential verification is not enabled in this local portal build.`
  };
}

export { defaultSystemSettings, integrationTestResult, mergeSystemSettings, validateSystemSettings };
