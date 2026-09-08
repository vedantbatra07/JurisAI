# JurisAI

JurisAI is a dark-mode legal information assistant built with Next.js and the Gemini API.

## Run locally

1. Install Node.js 22.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env.local`, add a fresh Gemini authorization key, and set an access password for private/demo deployments:

   ```env
   GEMINI_API_KEY=your_own_gemini_key_here
   JURISAI_ACCESS_PASSWORD=use_your_own_long_random_password
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000`.

## Create the GitHub repository

Run these commands from this project folder:

```bash
git init
git add .
git commit -m "Initial JurisAI release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jurisai.git
git push -u origin main
```

Create the empty `jurisai` repository on GitHub before running the last two commands. Do not add a GitHub README, license, or `.gitignore` when creating it because this project already contains those files.

If you use GitHub CLI instead:

```bash
git init
git add .
git commit -m "Initial JurisAI release"
gh repo create jurisai --private --source=. --remote=origin --push
```

## Deploy on Vercel

1. Import the GitHub repository at `https://vercel.com/new`.
2. Keep the detected framework as Next.js.
3. Create your own Gemini API key in Google AI Studio. Never reuse or share another person's key.
4. Add your own `GEMINI_API_KEY` under Project Settings → Environment Variables as a Secret.
5. Apply it to Production and Preview.
6. Deploy. Redeploy after adding or changing the secret.

The backend is the Next.js route handler at `app/api/chat/route.ts`; Vercel deploys it as a Function automatically. The API key is read only on the server and must never use a `NEXT_PUBLIC_` prefix.

## Important limits

- Attachments are limited to 3 MB total to stay below Vercel Function request limits after base64 encoding.
- Chat history is stored in session storage and is removed when the browser tab/session closes.
- The API applies a per-instance request limit. For high-traffic public deployments, also enable a distributed platform/WAF rate limit.
- Set `JURISAI_ACCESS_PASSWORD` for private/demo deployments. If omitted, the site remains public.
- Legal responses use Gemini Google Search grounding and append available source links; users should still verify consequential information.


## Quality checks

Run the full validation suite before deployment:

```bash
npm run check
```

This runs ESLint, the Node security tests, and a production Next.js build.
