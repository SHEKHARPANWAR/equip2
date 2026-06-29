# Syrma SGS – Equipment Tracker (v3 — Lamp Edition)

A plain **HTML + CSS + JS** app (no build step, no Node, no React) with a
beautiful **lamp-themed login experience**. Deploy directly to GitHub Pages or
any static host.

## What's New in This Version

- **Lamp login screen** — a dark room with a hanging lamp. Pull the string, the
  lamp flickers on, and the login form fades in.
- **Real email login** — users log in with their full email address (e.g.
  `shekharpanwar@yourcompany.com`) and the password set in Supabase. No more
  `@syrmasgs.local` mapping.
- **All existing functionality preserved** — MTTR/MTBF engine, QR scanning,
  dashboards, charts, document uploads, realtime sync, and exports all work
  exactly as before.

## Files

```
index.html           ← Full app markup (lamp login + equipment dashboard)
style.css            ← App styling (sidebar, tables, charts, modals, etc.)
login-lamp.css       ← Lamp animation and login form styles
auth.js              ← Lamp interaction + Supabase Auth module
script.js            ← All app logic (MTTR/MTBF, Supabase sync, QR, charts)
supabase-schema.sql  ← Run once in Supabase SQL Editor
README.md            ← This file
```

## One-time Setup

### 1. Run the database schema

Open your Supabase project → **SQL Editor** → paste `supabase-schema.sql` → Run.
Safe to run multiple times.

### 2. Create user accounts

Users are managed entirely in the Supabase Dashboard — there is no in-app
sign-up page.

1. Supabase Dashboard → **Authentication → Users → Add user**
2. Enter a real email address (e.g. `john@yourcompany.com`)
3. Set a password
4. Tick **Auto Confirm User** → Create

The person signs in to the app with that exact email and password.

> **Note:** If you previously used the `@syrmasgs.local` format (e.g.
> `shekharpanwar@syrmasgs.local`), those accounts still work. Users just need
> to enter the full email address in the login form now.

## Deploy on GitHub Pages

1. Push all files to your repo root (or a `docs/` folder).
2. **Settings → Pages → Build and deployment → Source → Deploy from a branch**
3. Pick branch + folder → **Save**
4. Live URL: `https://<username>.github.io/<repo>/`

QR camera scanning requires HTTPS, which GitHub Pages provides automatically.

## How the Lamp Login Works

1. Page loads → dark room, lamp hanging from ceiling, pull-string visible.
2. User **clicks/taps the pull string** → string animates down and releases.
3. Lamp **flickers on** with a warm golden glow illuminating the room.
4. Login form **fades in** at the bottom of the screen.
5. User enters email + password → **Sign In**.
6. On success, the lamp screen disappears and the Equipment Tracker loads.

On logout, the room goes dark again and the process repeats.

## Cloud Data (Supabase)

Connection details are in `auth.js` and `script.js` (project `oqjotrbrwjqwdevicmec`).
The publishable key is safe to ship in client-side code — Supabase RLS policies
enforce that only signed-in users can read or write data.

Offline fallback: if Supabase is unreachable, the app uses a local browser
cache. Write actions (add machine, record failure/repair, upload document)
require connectivity to save to the shared database.

## Notes

- No `.env` file needed.
- No build step — open `index.html` directly or serve statically.
- No SQL editor, admin dashboard, or developer tools in the UI.
- Sessions persist until the user explicitly logs out.
