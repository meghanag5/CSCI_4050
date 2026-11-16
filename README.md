# Research Daily

CSCI 4050 team project: a daily feed of research papers for a topic you choose.

## Run it

Needs Node 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Where things are

- `src/app/page.tsx` — topic selection screen
- `src/app/feed/[topic]/page.tsx` — feed screen (list of papers; the Refresh button is not connected yet)
- `src/app/globals.css` — all styling
- `src/lib/papers.ts` — the topic list and the (currently empty) list of papers. The real retrieval code will fill it in.
