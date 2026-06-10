import assert from "node:assert/strict";
import test from "node:test";
import { authorizeDepartmentAccess, departmentBasedStaffTypes, departmentScopedRoles } from "../middleware/departmentAccess.js";

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test("authorizeDepartmentAccess allows admins without department checks", async () => {
  const middleware = authorizeDepartmentAccess(() => {
    throw new Error("admin should bypass resource lookup");
  });
  const req = { user: { id: "admin-id", role: "admin" } };
  const res = mockResponse();
  let nextCalled = false;

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test("authorizeDepartmentAccess rejects non-admin non-lecturer users", async () => {
  const middleware = authorizeDepartmentAccess(() => "ICT");
  const req = { user: { id: "student-id", role: "student" } };
  const res = mockResponse();
  let nextCalled = false;

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /Admin or faculty access required/);
});

test("department staff role and staff type are department scoped", () => {
  assert.equal(departmentScopedRoles.includes("department_staff"), true);
  assert.equal(departmentBasedStaffTypes.includes("Department Staff"), true);
});
