import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeRequestData } from "../middleware/security.js";

test("sanitizeRequestData removes Mongo operator and dotted keys from body, query, and params", () => {
  const req = {
    body: { name: "Student", $where: "malicious", nested: { "profile.role": "admin", ok: true } },
    query: { "$ne": "x", status: "active", nested: { "$gt": "1" } },
    params: { id: "abc", "user.role": "admin" }
  };

  sanitizeRequestData()(req, {}, () => {});

  assert.deepEqual(req.body, { name: "Student", nested: { ok: true } });
  assert.deepEqual(req.query, { status: "active", nested: {} });
  assert.deepEqual(req.params, { id: "abc" });
});
