# SGE Atlântida — Deployment Guide for Cline

You are helping me deploy my Next.js 15 / Prisma 6 / PostgreSQL project called SGE Atlântida to Vercel + Neon.

Walk me through each phase in order. For each step, ask me for any information you need before proceeding. Do not skip ahead. Confirm each phase is done before moving to the next.

---

## Phase 1 — GitHub

**Goal:** Get the project code onto GitHub so Vercel can access it.

Ask me:
- Do I already have a GitHub account? If not, tell me to go to github.com and create one first.
- Do I already have a GitHub repository for this project? If yes, ask me for the repo URL. If no, help me create one.
- Is my `.env` file listed in `.gitignore`? Check the `.gitignore` file in my project root and confirm `.env`, `.env.local`, and `.env*.local` are all present. If not, add them.

Then:
1. Run `git init` (skip if already a git repo — check for `.git` folder).
2. Run `git add .`
3. Run `git commit -m "Initial commit"` (or a relevant message if commits already exist).
4. Run `git branch -M main`
5. Ask me for my GitHub username and repo name, then run:
   `git remote add origin https://github.com/MYUSERNAME/MYREPO.git`
   (skip if remote already exists)
6. Run `git push -u origin main`

Confirm the push succeeded before moving on.

---

## Phase 2 — Neon (Production Database)

**Goal:** Create a production PostgreSQL database on Neon.

Ask me:
- Do I already have a Neon account? If not, tell me to go to neon.tech and sign up (free, can use GitHub login).
- Have I already created a Neon project for SGE Atlântida? If yes, ask me to paste both the **pooled** and **direct** connection strings. If no, tell me to create a project on the Neon dashboard and come back with both strings.

Ask me to paste:
- `NEON_POOLED_URL` — the pooled connection string (used at runtime by the app)
- `NEON_DIRECT_URL` — the direct/non-pooling connection string (used by Prisma migrations)

Both look like: `postgresql://user:password@host/dbname?sslmode=require`
The direct one does NOT contain `pgbouncer=true`.

Store these — you'll need them in later phases.

---

## Phase 3 — Run Migrations Against Production

**Goal:** Apply all Prisma migrations to the Neon database so the schema exists.

Steps:
1. Temporarily set `DATABASE_URL` in the environment to `NEON_DIRECT_URL` (the direct one).
2. Run: `npx prisma migrate deploy`
3. Confirm it says "X migrations applied" or "No pending migrations" — both are fine.
4. Ask me: Do I have a seed script (`prisma/seed.ts` or similar)? If yes, run `npx prisma db seed`. If no, skip.
5. Unset / revert the temporary DATABASE_URL change — do not leave the production URL hardcoded anywhere in files.

---

## Phase 4 — Collect All Environment Variables

**Goal:** Gather every environment variable the app needs before we touch Vercel.

Read my `.env` file and list every variable in it. Then ask me to confirm or provide the production values for each one.

The critical ones to flag specifically:

| Variable | What to set in production |
|---|---|
| `DATABASE_URL` | Use `NEON_POOLED_URL` (the pooled one) |
| `DIRECT_URL` | Use `NEON_DIRECT_URL` (only if schema.prisma uses `directUrl`) |
| `NEXTAUTH_SECRET` | A new random string — run `openssl rand -base64 32` to generate one |
| `NEXTAUTH_URL` | Leave blank for now — we fill this after the first Vercel deploy |

For all other variables (Multicaixa keys, app config, etc.), ask me what the production value should be.

Compile the full list and confirm it with me before proceeding.

---

## Phase 5 — Deploy to Vercel

**Goal:** Connect the GitHub repo to Vercel and trigger the first deploy.

Ask me:
- Do I already have a Vercel account? If not, tell me to go to vercel.com and sign up using "Continue with GitHub".
- Have I already imported this project on Vercel? If yes, go to the environment variables settings. If no, tell me to:
  1. Click "Add New..." → "Project" on the Vercel dashboard
  2. Import the GitHub repo
  3. On the configure screen, scroll to "Environment Variables" and add all variables from Phase 4 (except NEXTAUTH_URL — leave it empty for now)
  4. Click Deploy

Wait for me to confirm the deploy finished and give me the Vercel URL it assigned (looks like `https://sge-atlantida-xyz.vercel.app`).

---

## Phase 6 — Fix NEXTAUTH_URL

**Goal:** Set NEXTAUTH_URL to the real live URL so authentication works.

Ask me for the Vercel URL from Phase 5.

Then tell me to:
1. Go to my Vercel project → Settings → Environment Variables
2. Add (or update) `NEXTAUTH_URL` with the value: `https://my-vercel-url.vercel.app`
3. Go to the Deployments tab → find the latest deployment → click "..." → Redeploy

Wait for me to confirm the redeploy finished.

---

## Phase 7 — Verify the Live App

**Goal:** Make sure everything works before the defense.

Walk me through testing each of the following. Ask me to confirm each one passes:

- [ ] Login works for all 5 roles: admin, student, orientador, recepcionista, gestor
- [ ] Each role lands on the correct dashboard and cannot access other roles' routes
- [ ] PDF generation works: generate a Declaração Académica and a Certificado, download and open them
- [ ] Student workflow: receptionist creates a student, disciplines are enrolled, grades are added
- [ ] Year progression / re-enrollment logic triggers correctly
- [ ] No red 500 errors in the browser console (F12 → Console tab) while navigating
- [ ] App is usable on mobile (open the URL on your phone)

If any check fails, stop and help me debug it before continuing.

---

## Phase 8 — Future Updates

**Goal:** Explain how to push changes after this.

Tell me:
- After this, every `git push` to `main` will automatically trigger a new Vercel deploy. No manual steps needed.
- If I ever add a new Prisma migration locally, I must run `npx prisma migrate deploy` (with production DATABASE_URL) before or as part of the deploy to avoid schema mismatches.
- If I add new environment variables, I add them in Vercel → Settings → Environment Variables, then redeploy.

---

## Notes for Cline

- My project stack: Next.js 15, TypeScript, Prisma 6, PostgreSQL, NextAuth.js, Tailwind CSS, `@react-pdf/renderer`, Vercel hosting, Neon database.
- This is my first time deploying. Be explicit. Do not assume I know where to find things.
- If something fails, show me the exact error and help me fix it before moving on.
- Do not proceed to the next phase until the current one is confirmed complete.
