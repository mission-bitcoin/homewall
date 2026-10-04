# HomeWall

A single-user, single-wall climbing app for a home wall. Create climbs by
circling holds on a photo of your wall, then browse and filter them by name and
V grade.

It replaces the paid tiers of Retro Flash / Stōkt for a single home wall.

## What it is

- **Client-only.** No accounts, no server, no cloud. Everything lives in your
  browser's IndexedDB on the device you use.
- **One wall, one user.** No multi-wall, multi-gym or multi-user features.
- **Installable PWA.** Works offline once installed.

## Features

- **Wall photo** with **immutable revisions** — updating the wall photo adds a
  new revision, and every climb keeps the photo it was set on.
- **Hold editor** — tap to place, drag to move, zoom/pan the photo, resize via
  the edge handle or a size slider. Role colours: start, hand, foot, hand+foot,
  finish. A climb may have 1–2 starts and 1–2 finishes.
- **Climbs** — name, optional V grade, notes, holds. Create, edit, delete.
- **Browse** — search by name, filter by V-grade range, sort by newest/grade/name.
- **Climbing view** — full-screen photo with the climb's holds and a legend.
- **Backup** — export/import the whole library as a single JSON file (photos
  inlined) to move devices or keep a copy.

## Development

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
```

## How data works

The server (wherever the files are hosted) only serves the app. **Your library
lives in the browser you open it in.** Opening the app on two devices gives two
separate libraries — use **Export backup** / **Import backup** to move between
them.

Because browsers can evict storage, export a backup now and then.

## Deployment

The app is a static bundle in `dist/` and is served from a sub-path without
modification (relative asset paths + hash routing).

- **GitHub Pages** — pushed to `main`, built and deployed by
  `.github/workflows/deploy-pages.yml`.
- It also drops onto any static host (Netlify, Cloudflare Pages, etc.).

### After deploying, hard-refresh

The service worker will happily serve the previous bundle. After a deploy,
force a refresh (`Cmd/Ctrl+Shift+R`) or clear site data for the domain.

## Licence

MIT — see [LICENSE](./LICENSE).
