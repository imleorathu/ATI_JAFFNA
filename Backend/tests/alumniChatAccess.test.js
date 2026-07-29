import assert from "node:assert/strict";
import test from "node:test";
import {
  alumniConversationListFilter,
  hasAlumniConversationAccess,
} from "../services/alumniChatAccessService.js";

const user = (id, department) => ({ user: { _id: id }, department });

test("All Alumni chat is available to every approved alumni scope", () => {
  assert.equal(
    hasAlumniConversationAccess(
      { type: "global", members: [] },
      user("alumni-a", "HNDIT"),
    ),
    true,
  );
  assert.equal(
    hasAlumniConversationAccess(
      { type: "global", members: [] },
      user("alumni-b", "HNDA"),
    ),
    true,
  );
});

test("department chat is available only to alumni in that exact department", () => {
  const conversation = { type: "department", department: "HNDIT", members: [] };
  assert.equal(
    hasAlumniConversationAccess(conversation, user("alumni-a", "HNDIT")),
    true,
  );
  assert.equal(
    hasAlumniConversationAccess(conversation, user("alumni-b", "HNDA")),
    false,
  );
  assert.equal(
    hasAlumniConversationAccess(conversation, user("alumni-c", "")),
    false,
  );
});

test("direct chat is available only to its two participants", () => {
  const conversation = {
    type: "direct",
    members: [{ _id: "alumni-a" }, { _id: "alumni-b" }],
  };
  assert.equal(
    hasAlumniConversationAccess(conversation, user("alumni-a", "HNDIT")),
    true,
  );
  assert.equal(
    hasAlumniConversationAccess(conversation, user("alumni-c", "HNDIT")),
    false,
  );
});

test("custom group chat is available only to listed members", () => {
  const conversation = {
    type: "custom",
    members: ["alumni-a", "alumni-b", "alumni-c"],
  };
  assert.equal(
    hasAlumniConversationAccess(conversation, user("alumni-c", "HNDA")),
    true,
  );
  assert.equal(
    hasAlumniConversationAccess(conversation, user("alumni-d", "HNDA")),
    false,
  );
});

test("conversation list query restricts member chats by type and department chats by department", () => {
  assert.deepEqual(alumniConversationListFilter(user("alumni-a", "HNDIT")), {
    $or: [
      { type: "global" },
      { type: "department", department: "HNDIT" },
      {
        type: { $in: ["direct", "custom"] },
        members: "alumni-a",
      },
    ],
  });
});
