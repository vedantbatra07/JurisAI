# JurisAI

JurisAI is a dark-mode chat assistant for legal questions. Set your jurisdiction, ask something in plain English, and it answers using Gemini with Google Search grounding turned on, so it cites real sources instead of just making things up.

You can attach a PDF, an image, or a text file if you want to ask about a specific document — a notice, a contract, whatever. No account or login, chats just live in the browser tab you're using and disappear when you close it.

It covers most major Indian cities plus the US, UK, Canada, and Australia as jurisdiction options, since the right answer to a lot of legal questions depends heavily on where you actually are.

There's an optional password you can set if you're deploying this somewhere and don't want it fully public.

Built with Next.js, TypeScript, Tailwind, and shadcn/ui.

## Setup / deployment

See [`SHARE_AND_DEPLOY.md`](./SHARE_AND_DEPLOY.md) for that.

## Disclaimer

This gives general legal information, not legal advice. Talk to an actual lawyer for anything that matters.
