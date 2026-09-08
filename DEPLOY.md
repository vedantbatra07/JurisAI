# Deploying JurisAI

Notes for running this locally and putting it live.

## Local dev

1. Node.js 22+.
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill in:

   ```env
   GEMINI_API_KEY=your_gemini_key
   GEMINI_MODEL=gemini-3.6-flash
   JURISAI_ACCESS_PASSWORD=optional_password
   ```

4. `npm run dev`, then open http://localhost:3000.

`JURISAI_ACCESS_PASSWORD` is optional — set it if I want to gate access, leave it out otherwise.

## Deploying to Vercel

1. Import this repo into Vercel.
2. Add `GEMINI_API_KEY` under Project Settings → Environment Variables.
3. Add `GEMINI_MODEL` and `JURISAI_ACCESS_PASSWORD` if using them.
4. Deploy.
5. Point my domain at it under Project Settings → Domains.

If the key ever leaks, revoke it in Google AI Studio and swap in a new one, then redeploy.
