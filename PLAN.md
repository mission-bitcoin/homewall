# HomeWall — Scope & Plan

A single-user, single-wall climbing app. Replaces the paid tiers of Retro Flash / Stōkt
for one home wall. No accounts, no cloud, no server required.

## 1. Locked decisions

| Decision | Choice |
| --- | --- |
| Storage | **Client-only PWA** — IndexedDB (Dexie) on the device. No backend. |
| Tracking | **Library only** — create/save/edit/browse/filter climbs. No send/attempt logging. |
| Leaving the device | **Private + JSON export/import** for backup / moving devices. |
| Auth | None. Opens straight to the current wall. |
| Walls / users / locations | One wall, one user, one location. |

## 2. Non-goals (explicitly out of scope)

- Multiple walls, gyms, or locations; multi-user accounts; social features.
- AI/automatic hold detection — circles are placed manually.
- LED hardware integration.
- Send/attempt/session statistics (revisit later if wanted).
- Native app / APK — browser PWA is the deliverable.

## 3. Tech stack

- **React + TypeScript + Vite** — already scaffolded in this directory.
- **Dexie** (IndexedDB wrapper) + `dexie-react-hooks` for reactive queries.
- **react-router-dom** for a small number of routes.
- **vite-plugin-pwa** — installable, offline app shell.
- **SVG overlay** on top of the wall photo (crisp circles at any zoom; positions stored
  in normalised 0–1 coordinates so they scale with the image).
- No CSS framework — a small hand-written stylesheet keeps it lean.

## 4. Data model

```
Wall        { id, name, createdAt }                     // exactly one, seeded
WallRevision{ id, wallId, imageBlob, width, height,     // an immutable photo version
              label, note, createdAt }
Climb       { id, revisionId, name, grade, notes,       // pins to ONE revision, forever
              holds: Hold[], createdAt, updatedAt }
Hold        { x, y, r, role }                           // x,y,r normalised 0–1 (r vs width)
Role        = 'start' | 'hand' | 'foot' | 'handfoot' | 'finish'
```

Key rule: a `Climb` references the `revisionId` it was created on. Adding a new wall photo
creates a **new** revision; old climbs keep pointing at the old revision and therefore keep
the old photo. New climbs use the current (latest) revision.

## 5. Features (MVP) with acceptance criteria

### F1 — Wall photo
- Take a photo with the phone camera or pick an existing image.
- Photo is downscaled (max ~2048 px long edge) before storing as a Blob.
- "Update wall photo" creates a new revision; history of revisions is retained.
- **Done when:** the wall shows the current photo, and a second photo can be added without
  affecting existing climbs.

### F2 — Hold selection overlay (the core interaction)
- Tap the photo to drop a circle; drag to move; pinch (or a size handle/slider) to resize.
- Zoom + pan the photo independently (pinch/two-finger) so small holds can be hit accurately.
- Preset role colours: **start** (green, 1–2, always hand), **finish** (red, 1–2, always
  hand), **hand** (blue), **foot** (yellow), **handfoot** (purple).
- Enforce max 1–2 starts and 1–2 finishes; a hold may be both hand and foot.
- **Done when:** a climb with 2 starts, several mid holds of each type, and 2 finishes can be
  laid out accurately on a zoomed photo.

### F3 — Climb CRUD
- Create, save, edit, delete a climb. Fields: name, V grade, notes/comments, holds.
- **Done when:** a climb round-trips through save → edit → reload unchanged.

### F4 — Browse / search / filter
- List all climbs; search by name; filter by V grade (exact or range); sort by grade/date/name.
- Show each climb's hold overlay on its own revision photo as a thumbnail/preview.
- **Done when:** searching a name and filtering a grade both narrow the list correctly.

### F5 — View / "climbing mode"
- Open a climb full-screen on its revision photo with holds highlighted and a legend.
- **Done when:** the full-screen view matches the saved climb.

### F6 — Backup
- Export the whole library (wall, revisions, climbs) to a single JSON file (images inlined).
- Import that file to restore/merge.
- **Done when:** export → wipe → import restores identical data.

## 6. Interaction design notes

- **Gesture conflict:** pinch-to-zoom (whole photo) and pinch-to-resize (one circle) can't
  both own a two-finger gesture. Resolution: pinch/pan always zooms the *photo*; a selected
  circle is resized by dragging its edge handle or via a size slider. This is the "something
  equivalent" to pinch and is far less error-prone on a phone.
- Store coordinates normalised against the image so nothing drifts when the photo is
  re-rendered at a different size.
- Thumbnails render by re-drawing the stored overlay over the stored revision image.

## 7. Running it / phone access

- Dev/laptop: `npm run dev`.
- Phone options (data never leaves the device in all cases):
  1. **Tailscale** — serve the built files from ubuntu-ai over the tailnet and open the tailnet
     URL on the phone. Private, and avoids the IoT-Wi-Fi AP-isolation problem with normal LAN.
  2. **Free static host** (e.g. GitHub Pages / Netlify) — app shell only; all data stays in
     IndexedDB. Simplest URL for the phone.
  - A plain LAN server on ubuntu-ai will likely *not* be reachable from the phone (IoT SSID +
    AP isolation), so it is not the recommended path.
- Once installed, the PWA works fully offline.

## 8. Milestones

1. **M1 — Skeleton:** routes, DB layer, seed wall, PWA manifest. (in progress)
2. **M2 — Wall photo:** capture/upload, downscale, revisions, viewer with zoom/pan.
3. **M3 — Hold editor:** place/move/resize/colour holds, start/finish constraints.
4. **M4 — Climb CRUD + browse/filter.**
5. **M5 — Climbing view + legend.**
6. **M6 — Export/import + polish + install on phone.**

## 9. Assumptions (correct any)

- Grade scale: **V only**, integer 0–17, filter by range. (Font/range grades easy to add.)
- One wall named "Home Wall"; renameable.
- Holds are stored **per climb** (simplest), not as a shared wall hold-set.
- Photo metadata (EXIF) is ignored; orientation is normalised on import.
- English only; no theming beyond a clean dark UI.

## 10. Risks

- Large photos in IndexedDB: mitigated by downscaling and storing one Blob per revision.
- Browser storage eviction: mitigated by export reminders + `navigator.storage.persist()`.
- Two-finger gesture conflicts on iOS Safari: mitigated by the handle/slider resize approach.
