# Research Daily

CSCI 4050 team project: a daily feed of research papers for a topic you choose.

## Run it

Needs Node 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

### Your `.env.local`

Copy `.env.example` to `.env.local` and fill it in. It is git-ignored, so secrets never reach GitHub.

| Variable | What it is |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `MONGODB_DB` | Database name, e.g. `research_daily` |
| `OPENALEX_API_KEY` | Free key from https://openalex.org/settings/api |
| `GMAIL_USER` | Gmail address the digests are sent from |
| `GMAIL_APP_PASSWORD` | A Gmail App Password (needs 2-step verification on): https://myaccount.google.com/apppasswords |
| `CRON_SECRET` | Any long random string; protects the scheduled email job (`openssl rand -hex 24`) |

## Where things are

- `src/app/page.tsx` — topic selection screen
- `src/app/feed/[topic]/page.tsx` — feed screen (list of papers, search, date range, ☆ Save)
- `src/app/globals.css` — all styling
- `src/lib/papers.ts` — the topic list
- `src/lib/research.ts` — fetches papers from OpenAlex, stores them in MongoDB, caches each query for an hour

### Accounts, favorites, boards, email

- `src/lib/auth.ts` — accounts and sessions. Passwords are hashed with scrypt; sessions live in MongoDB (30 days) behind an httpOnly cookie.
- `src/app/login/page.tsx` — log in / create account
- `src/app/profile/` — saved papers, subject boards, and email digest settings
- `src/app/api/auth/*` — `signup`, `login`, `logout`, `me`
- `src/app/api/favorites` — save or remove a paper (★ Save on any feed)
- `src/app/api/boards` — subject boards: a topic narrowed by your own keywords. A board opens the normal feed with its keywords filled in.
- `src/lib/digest.ts` — builds and sends the email: up to 5 new papers per followed topic or board, never repeating a paper
- `src/app/api/digest/settings` — on/off, daily or weekly, which topics and boards
- `src/app/api/digest/test` — "Send me one now" button on the profile page
- `src/app/api/digest/send` — the scheduled job that emails everyone who is due. `vercel.json` runs it daily at 12:00 UTC on Vercel. To run it by hand: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/digest/send`

### MongoDB collections

`papers`, `research_cache`, `users` (profile, favorites, boards, digest settings), `sessions`
