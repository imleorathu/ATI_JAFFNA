import assert from "node:assert/strict";
import test from "node:test";
import { contactIsVisibleToScope, getContactAudience, normalizeContactAudience } from "../controllers/contactController.js";

test("contact audience defaults old contacts to admin and old complaints to department", () => {
  assert.equal(getContactAudience({ type: "contact" }), "admin");
  assert.equal(getContactAudience({ type: "complaint" }), "department");
  assert.equal(getContactAudience({ type: "complaint", audience: "admin" }), "admin");
  assert.equal(normalizeContactAudience("unknown", "department"), "department");
});

test("admin sees only admin-targeted messages", () => {
  assert.equal(contactIsVisibleToScope({ audience: "admin", type: "complaint" }, { role: "admin" }), true);
  assert.equal(contactIsVisibleToScope({ audience: "department", type: "complaint" }, { role: "admin" }), false);
  assert.equal(contactIsVisibleToScope({ type: "complaint" }, { role: "admin" }), false);
});

test("department staff see only department-targeted messages from their department", () => {
  const scope = { role: "lecturer", department: "ICT" };

  assert.equal(contactIsVisibleToScope({ audience: "department", department: "ICT" }, scope), true);
  assert.equal(contactIsVisibleToScope({ type: "complaint", department: "ICT" }, scope), true);
  assert.equal(contactIsVisibleToScope({ audience: "department", department: "Accountancy" }, scope), false);
  assert.equal(contactIsVisibleToScope({ audience: "admin", department: "ICT" }, scope), false);
});

test("department_staff role uses the same department-only visibility", () => {
  const scope = { role: "department_staff", department: "ICT" };

  assert.equal(contactIsVisibleToScope({ audience: "department", department: "ICT" }, scope), true);
  assert.equal(contactIsVisibleToScope({ audience: "admin", department: "ICT" }, scope), false);
  assert.equal(contactIsVisibleToScope({ audience: "department", department: "Management" }, scope), false);
});

test("students see only their own sent messages", () => {
  const scope = { role: "student", studentId: "student-a" };

  assert.equal(contactIsVisibleToScope({ audience: "admin", student: "student-a" }, scope), true);
  assert.equal(contactIsVisibleToScope({ audience: "department", student: "student-a" }, scope), true);
  assert.equal(contactIsVisibleToScope({ audience: "admin", student: "student-b" }, scope), false);
});
