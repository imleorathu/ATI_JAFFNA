import test from "node:test";
import assert from "node:assert/strict";
import { visibleNoticeAudienceFilter } from "../controllers/noticeController.js";

function allowedAudiencesFor(user) {
  const filter = visibleNoticeAudienceFilter(user);
  return filter.$or?.[0]?.audience?.$in || "all";
}

test("public visitors only see all-visitors notices", () => {
  assert.deepEqual(allowedAudiencesFor(null), ["all"]);
});

test("students see all-visitors and student notices", () => {
  assert.deepEqual(allowedAudiencesFor({ role: "student" }), ["all", "students"]);
});

test("lecturers see all-visitors and lecturer notices", () => {
  assert.deepEqual(allowedAudiencesFor({ role: "lecturer" }), ["all", "lecturers"]);
});

test("faculty aliases see all-visitors and lecturer notices", () => {
  assert.deepEqual(allowedAudiencesFor({ role: "faculty" }), ["all", "lecturers"]);
  assert.deepEqual(allowedAudiencesFor({ role: "department_staff" }), ["all", "lecturers"]);
});

test("admins see all-visitors and admin notices only", () => {
  assert.deepEqual(allowedAudiencesFor({ role: "admin" }), ["all", "admins"]);
});
