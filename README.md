# JurisAI

JurisAI is a dark-mode legal information assistant that helps people understand laws, rights, and procedures in plain language. It's built with Next.js and powered by the Gemini API with Google Search grounding, so answers come with real, cited sources instead of guesses.

## What it does

- **Jurisdiction-aware answers.** Pick a city, state, or country — from major Indian cities to the US, UK, Canada, and Australia — and JurisAI tailors its answers to the laws and procedures that actually apply there.
- **Grounded, sourced responses.** Every answer is backed by live Google Search grounding through Gemini, with clickable source links appended so you can verify anything important yourself rather than take the AI's word for it.
- **Document and image understanding.** Attach a PDF, text file, or image (contracts, notices, screenshots, etc.) and ask questions about it directly in the chat.
- **Multiple chats, kept simple.** Start new conversations, switch between them, and pick up where you left off — all without an account, since chat history lives only in the current browser tab and clears when the session ends.
- **Privacy-first by design.** Nothing is sent to a server-side database. There's a visible reminder never to share passwords, OTPs, or ID numbers in a chat, and an optional access password can be set to keep a deployment private.
- **Clean, readable formatting.** Responses render with proper headings, numbered steps, and bullet points instead of a wall of text, so legal explanations are actually easy to follow.

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Gemini API (with Google Search grounding)

## Getting started

Setup, environment variables, and deployment instructions live in [`SHARE_AND_DEPLOY.md`](./SHARE_AND_DEPLOY.md).

## Disclaimer

JurisAI provides general legal information, not legal advice. For anything with real stakes, consult a licensed lawyer in your jurisdiction.
