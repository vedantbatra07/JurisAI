# Share and deploy JurisAI

This copy contains source code only. It contains no private API keys, passwords, deployment tokens, or `.env.local` file.

## Each person needs their own accounts

- A GitHub account for their own repository.
- A Vercel account for their own deployment.
- Their own Gemini API key from https://ai.google.dev/gemini-api/docs/api-key.

Do not send API keys through chat, email, commits, screenshots, or the ZIP. Add them only to a local `.env.local` file or Vercel's Environment Variables settings.

## Local setup

1. Extract the ZIP and open the `jurisai-shareable` folder.
2. Install Node.js 22 or later.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Replace the placeholder with your own Gemini key:

   ```env
   GEMINI_API_KEY=your_own_gemini_key_here
   GEMINI_MODEL=gemini-3.6-flash
   JURISAI_ACCESS_PASSWORD=choose_your_own_long_random_password
   ```

6. Run `npm run dev` and open http://localhost:3000.

The access password is optional. Keep it for a private demo; remove that variable if the site should be public.

## Publish from a new GitHub repository

Create an empty repository, then run these commands in the extracted project folder:

```bash
git init
git add .
git commit -m "Initial JurisAI release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

The included `.gitignore` blocks `.env.local` and other `.env` files from being committed. Before pushing, run `git status` and confirm that `.env.local` is not listed.

## Deploy on Vercel

1. Import the new GitHub repository into Vercel.
2. Add `GEMINI_API_KEY` in Project Settings → Environment Variables.
3. Optionally add `GEMINI_MODEL` and `JURISAI_ACCESS_PASSWORD`.
4. Deploy, then test one legal question.

If a key is ever exposed, revoke it in Google AI Studio immediately and create a new one.
