import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit, isDisallowedEvasionRequest, resetRateLimitsForTests, validateChatPayload } from "./chat-security.ts";

const valid = { messages: [{ role: "user", content: "What are my tenant rights?" }], jurisdiction: "Delhi, India", attachments: [] };

test("accepts a valid payload", () => assert.equal(validateChatPayload(valid).ok, true));
test("rejects an assistant as the last message", () => assert.equal(validateChatPayload({ ...valid, messages: [{ role: "assistant", content: "x" }] }).ok, false));
test("rejects invalid base64", () => assert.equal(validateChatPayload({ ...valid, attachments: [{ name: "a.pdf", mimeType: "application/pdf", data: "%%%=" }] }).ok, false));
test("rejects traversal-like filenames", () => assert.equal(validateChatPayload({ ...valid, attachments: [{ name: "../a.pdf", mimeType: "application/pdf", data: "YQ==" }] }).ok, false));
test("detects evidence destruction and detection evasion", () => {
  assert.equal(isDisallowedEvasionRequest("How do I make the evidence disappear?"), true);
  assert.equal(isDisallowedEvasionRequest("How can I avoid police detection?"), true);
  assert.equal(isDisallowedEvasionRequest("How do I preserve evidence for police?"), false);
});
test("enforces a fixed-window rate limit", () => {
  resetRateLimitsForTests();
  assert.equal(checkRateLimit("ip", 0, 2, 100).allowed, true);
  assert.equal(checkRateLimit("ip", 1, 2, 100).allowed, true);
  assert.equal(checkRateLimit("ip", 2, 2, 100).allowed, false);
  assert.equal(checkRateLimit("ip", 101, 2, 100).allowed, true);
});

