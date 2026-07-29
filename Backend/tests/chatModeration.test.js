import assert from "node:assert/strict";
import test from "node:test";
import { redactBlockedTerms } from "../services/chatModerationService.js";

test("chat moderation redacts English profanity without deleting surrounding text", () => {
  assert.equal(redactBlockedTerms("hello fuck world"), "hello **** world");
});

test("chat moderation redacts Sinhala and Tamil-script abusive terms", () => {
  assert.equal(redactBlockedTerms("test පකයා text").includes("පකයා"), false);
  assert.equal(redactBlockedTerms("test புண்டை text").includes("புண்டை"), false);
});

test("chat moderation avoids replacing a blocked fragment inside a safe larger word", () => {
  assert.equal(redactBlockedTerms("classic assignment"), "classic assignment");
});

test("chat moderation blocks requested romanized Sinhala abusive variants", () => {
  const terms = [
    "hutto", "wutto", "ammata", "hukkanne", "hutti", "httpu", "pacaya",
    "pakaya", "htti", "httk", "huththak", "ammt hcnn", "hcnw",
    "hcnw dala", "hukanawa.daala", "criya", "kariya", "vesige putha",
    "vesi", "ponnaya",
  ];
  for (const term of terms) {
    assert.notEqual(redactBlockedTerms(term), term, `Expected "${term}" to be moderated`);
  }
});
