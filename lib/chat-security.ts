export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ChatAttachment = { name: string; mimeType: string; data: string };

export const MAX_MESSAGE_LENGTH = 6_000;
export const MAX_HISTORY_MESSAGES = 12;
export const MAX_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;

const allowedTypes = new Set([
  "application/pdf", "text/plain", "text/markdown", "text/csv", "application/json",
  "image/png", "image/jpeg", "image/webp",
]);

const wrongdoingActions = /\b(?:destroy|conceal|hide|tamper|alter|erase|delete|shred|fabricate|forge|plant|wipe|dispose|disappear|cover\s*up)\b/i;
const wrongdoingTargets = /\b(?:evidence|proof|record(?:s)?|log(?:s)?|message(?:s)?|document(?:s)?|footage|weapon|witness(?:es)?|fingerprints?|trace(?:s)?)\b/i;
const evasionIntent = /\b(?:avoid|evade|bypass|escape|mislead|deceive|without (?:being )?(?:caught|detected)|get away with)\b/i;
const detectionTargets = /\b(?:police|law enforcement|investigator(?:s)?|detection|arrest|prosecution|forensic(?:s)?)\b/i;

export function isDisallowedEvasionRequest(text: string) {
  return (wrongdoingActions.test(text) && wrongdoingTargets.test(text)) ||
    (evasionIntent.test(text) && detectionTargets.test(text));
}

function decodedByteLength(data: string) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 !== 0) return -1;
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return (data.length / 4) * 3 - padding;
}

export function validateChatPayload(value: unknown):
  | { ok: true; messages: ChatMessage[]; attachments: ChatAttachment[]; jurisdiction: string }
  | { ok: false; status: number; error: string } {
  if (!value || typeof value !== "object") return { ok: false, status: 400, error: "Invalid request body." };
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_HISTORY_MESSAGES) {
    return { ok: false, status: 400, error: `Provide between 1 and ${MAX_HISTORY_MESSAGES} messages.` };
  }
  const messages: ChatMessage[] = [];
  for (const item of body.messages) {
    if (!item || typeof item !== "object") return { ok: false, status: 400, error: "Invalid message." };
    const message = item as Record<string, unknown>;
    if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string" || message.content.length > MAX_MESSAGE_LENGTH) {
      return { ok: false, status: 400, error: "Invalid message role or content." };
    }
    messages.push({ role: message.role, content: message.content });
  }
  const latest = messages.at(-1)?.content.trim() ?? "";
  if (!latest || messages.at(-1)?.role !== "user") return { ok: false, status: 400, error: "The final message must be a legal question." };

  const rawAttachments = body.attachments === undefined ? [] : body.attachments;
  if (!Array.isArray(rawAttachments) || rawAttachments.length > MAX_ATTACHMENTS) return { ok: false, status: 400, error: `Attach no more than ${MAX_ATTACHMENTS} files.` };
  const attachments: ChatAttachment[] = [];
  let totalBytes = 0;
  for (const item of rawAttachments) {
    if (!item || typeof item !== "object") return { ok: false, status: 400, error: "Invalid attachment." };
    const file = item as Record<string, unknown>;
    if (typeof file.name !== "string" || file.name.length < 1 || file.name.length > 180 || /[\\/\0]/.test(file.name) ||
        typeof file.mimeType !== "string" || !allowedTypes.has(file.mimeType) || typeof file.data !== "string") {
      return { ok: false, status: 400, error: "Unsupported or malformed attachment." };
    }
    const bytes = decodedByteLength(file.data);
    if (bytes < 0) return { ok: false, status: 400, error: "Attachment data is not valid base64." };
    totalBytes += bytes;
    attachments.push({ name: file.name, mimeType: file.mimeType, data: file.data });
  }
  if (totalBytes > MAX_ATTACHMENT_BYTES) return { ok: false, status: 413, error: "Attachments must total no more than 3 MB." };
  const jurisdiction = typeof body.jurisdiction === "string" ? body.jurisdiction.trim().slice(0, 120) : "";
  return { ok: true, messages, attachments, jurisdiction };
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, now = Date.now(), limit = 20, windowMs = 15 * 60_000) {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  current.count += 1;
  return { allowed: true, remaining: limit - current.count, retryAfterSeconds: 0 };
}

export function resetRateLimitsForTests() { buckets.clear(); }

