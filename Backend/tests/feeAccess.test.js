import test from "node:test";
import assert from "node:assert/strict";
import { assertDepartmentAccess, assertStudentAccess } from "../middleware/feeAccess.js";

test("department staff cannot access another department fee record", () => {
  const req = {
    user: { role: "department_staff" },
    feeScope: { departmentId: "Information Technology" }
  };

  assert.equal(assertDepartmentAccess(req, "Information Technology"), true);
  assert.equal(assertDepartmentAccess(req, "Accountancy"), false);
});

test("lecturer aliases are treated as department-scoped staff", () => {
  const req = {
    user: { role: "lecturer" },
    feeScope: { departmentId: "Management" }
  };

  assert.equal(assertDepartmentAccess(req, "Management"), true);
  assert.equal(assertDepartmentAccess(req, "English"), false);
});

test("admin and finance roles can access institution-wide fee records", () => {
  assert.equal(assertDepartmentAccess({ user: { role: "admin" }, feeScope: {} }, "Any Department"), true);
  assert.equal(assertDepartmentAccess({ user: { role: "finance_officer" }, feeScope: {} }, "Any Department"), true);
});

test("student access is limited to the logged-in student record", () => {
  const req = {
    user: { role: "student" },
    feeScope: { student: { _id: "student-a" } }
  };

  assert.equal(assertStudentAccess(req, "student-a"), true);
  assert.equal(assertStudentAccess(req, "student-b"), false);
});
