import test from "node:test";
import assert from "node:assert/strict";
import { integrationTestResult, mergeSystemSettings, validateSystemSettings } from "../lib/settingsDefaults.js";

test("mergeSystemSettings tolerates malformed sections and preserves defaults", () => {
  const settings = mergeSystemSettings({
    general: "broken",
    security: { sessionTimeout: 1, lockoutAttempts: 99, passwordPolicy: "unknown" },
    academic: { passPercentage: 140, attendanceWarning: -10 },
    integrations: { paymentGateway: "Unknown" }
  });

  assert.equal(settings.general.institutionName, "ATI Jaffna");
  assert.equal(settings.security.sessionTimeout, 5);
  assert.equal(settings.security.lockoutAttempts, 20);
  assert.equal(settings.security.passwordPolicy, "strong");
  assert.equal(settings.academic.passPercentage, 100);
  assert.equal(settings.academic.attendanceWarning, 0);
  assert.equal(settings.integrations.paymentGateway, "PayHere");
});

test("validateSystemSettings rejects invalid institution email", () => {
  const result = validateSystemSettings({ general: { email: "not-an-email" } });

  assert.equal(result.issues.includes("Institution email must be valid."), true);
});

test("integrationTestResult validates integration test requests", () => {
  assert.equal(integrationTestResult("payment", "PayHere").ok, true);
  assert.equal(integrationTestResult("unknown", "PayHere").ok, false);
  assert.equal(integrationTestResult("email", "").ok, false);
});
