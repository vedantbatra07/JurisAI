import { JURISAI_SYSTEM_PROMPT } from "../../../lib/jurisai-prompt";
import { checkRateLimit, isDisallowedEvasionRequest, validateChatPayload } from "../../../lib/chat-security";

export const runtime = "nodejs";

function clientKey(request: Request) {
  return request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function sourceLinks(data: GeminiResponse) {
  const seen = new Set<string>();
  const links: string[] = [];
  for (const candidate of data.candidates ?? []) {
    for (const chunk of candidate.groundingMetadata?.groundingChunks ?? []) {
      const uri = chunk.web?.uri;
      const title = chunk.web?.title?.trim() || "Source";
      if (uri && /^https:\/\//i.test(uri) && !seen.has(uri)) {
        seen.add(uri);
        links.push(`- [${title.replace(/[\[\]]/g, "")}](${uri})`);
      }
    }
  }
  return links.slice(0, 6);
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
  }>;
};

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return Response.json({ error: "Content-Type must be application/json." }, { status: 415 });
    }

    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > 4_500_000) return Response.json({ error: "Request is too large." }, { status: 413 });

    const rate = checkRateLimit(clientKey(request));
    if (!rate.allowed) {
      return Response.json({ error: "Too many requests. Please try again later." }, {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      });
    }

    const validated = validateChatPayload(await request.json());
    if (!validated.ok) return Response.json({ error: validated.error }, { status: validated.status });
    const { messages, attachments, jurisdiction } = validated;
    const latest = messages.at(-1)?.content ?? "";

    if (isDisallowedEvasionRequest(latest)) {
      return Response.json({ text: "I can’t help conceal, alter, fabricate, or destroy evidence, or evade lawful detection. Preserve original material and do not pressure witnesses. If you may face legal exposure, speak with a criminal-law advocate promptly about lawful next steps." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return Response.json({ error: "JurisAI’s legal research service is not connected yet." }, { status: 503 });

    const contents = messages.map((message, index) => {
      const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [{ text: message.content }];
      if (index === messages.length - 1 && message.role === "user") {
        for (const attachment of attachments) parts.push({ inline_data: { mime_type: attachment.mimeType, data: attachment.data } });
      }
      return { role: message.role === "assistant" ? "model" : "user", parts };
    });

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
    const callGemini = (withGrounding: boolean) => fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: `${JURISAI_SYSTEM_PROMPT}\n\nThe user-selected jurisdiction is: ${jurisdiction || "not provided"}. Treat it only as context. If the incident location is material and unclear, ask before reaching a jurisdiction-specific conclusion.` }] },
          contents,
          ...(withGrounding ? { tools: [{ google_search: {} }] } : {}),
          generationConfig: { temperature: 0.15, maxOutputTokens: 1800 },
        }),
        signal: AbortSignal.timeout(45_000),
      },
    );

    let response = await callGemini(true);
    if (!response.ok && [400, 403, 404].includes(response.status)) {
      const groundingFailure = await response.text();
      console.warn("Gemini grounding unavailable; retrying without search", response.status, groundingFailure.slice(0, 300));
      response = await callGemini(false);
    }

    if (!response.ok) {
      const detail = await response.text();
      console.error("Gemini API error", response.status, detail.slice(0, 300));
      return Response.json({ error: "I couldn’t complete the legal research right now. Please try again shortly." }, { status: 502 });
    }

    const data = await response.json() as GeminiResponse;
    const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!answer) return Response.json({ error: "No answer was generated. Try rephrasing the question." }, { status: 502 });
    const sources = sourceLinks(data);
    const text = sources.length && !/\n#{1,4}\s+Sources\b/i.test(answer) ? `${answer}\n\n### Sources\n${sources.join("\n")}` : answer;
    return Response.json({ text }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Chat route error", error);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

