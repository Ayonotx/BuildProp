<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BuildProp — Build & Runtime Notes

## Editions (3 separate installers)

| Edition   | Env file               | AI_MODE | AI bundled | Port | Installer |
|-----------|------------------------|---------|------------|------|-----------|
| Standard  | `electron/.env.standard` | disabled | no  | 3456 | `dist/standard/BuildProp Setup 1.0.0.exe` (~134 MB) |
| Premium   | `electron/.env.premium`  | hybrid  | yes | 3456 | `dist/premium/BuildProp Setup 1.0.0.exe` (~1,367 MB) |
| Demo      | `electron/.env.demo`     | hybrid  | yes | 3460 | `dist/demo/BuildProp Demo Setup 1.0.0.exe` (~1,367 MB) |

- `AI_MODE=hybrid` → Groq (cloud) primary, bundled Ollama (port `11435`) fallback.
- `NEXT_PUBLIC_AI_ENABLED` gates the AI widget/chat at compile time (`false` for Standard).
- `NEXT_PUBLIC_DEMO_MODE=true` / `DEMO_MODE=true` enable demo-only features (badge, demo login, `/api/demo/reset`).
- `BUILDPROP_PORT` separates ports so Premium + Demo can run simultaneously. Wrapper listens on PORT, server on `PORT + 1`. Keep the gap: Premium 3456→3457, Demo 3460→3461.

## Build scripts (run from repo root)

```bash
npm run build:standard   # NEXT_PUBLIC_AI_ENABLED=false
npm run build:premium    # NEXT_PUBLIC_AI_ENABLED=true
npm run build:demo       # NEXT_PUBLIC_AI_ENABLED=true + NEXT_PUBLIC_DEMO_MODE=true
```

Each `next build` writes `.next/standalone` and copies the edition's `.env` into it.

## Package an installer (from `electron/` dir)

```bash
npx electron-builder --win --x64 --config builder.standard.json --config.win.signAndEditExecutable=false
npx electron-builder --win --x64 --config builder.premium.json  --config.win.signAndEditExecutable=false
npx electron-builder --win --x64 --config builder.demo.json     --config.win.signAndEditExecutable=false
```

CRITICAL: electron-builder reads whatever is in `.next/standalone` at packaging time. Always run the matching `npm run build:<edition>` immediately before packaging that edition — otherwise you will package the wrong DB/env (this burned us: Premium once shipped with the demo DB).

## Standalone assembly checklist (after `next build`, before electron-builder)

Premium / Standard:
- copy `.next/static` and `public` into `.next/standalone`
- `Copy-Item prisma\production.db .next\standalone\prisma\dev.db`
- delete `.next/standalone\prisma\demo.db`
- delete `.next/standalone\data\settings.json` (fresh install must show the setup wizard)

Demo:
- copy `.next/static` and `public`
- `Copy-Item prisma\demo.db .next\standalone\prisma\dev.db` AND `.next\standalone\prisma\demo.db` (the reset endpoint needs the pristine copy)
- write `.next\standalone\data\settings.json`:
  `{"companyName":"BuildProp Demo","timezone":"Africa/Accra","currency":"GHS","fiscalYearStart":"January","configured":true}`

## Demo database
- `prisma/demo.db` (612 KB, 575 rows) generated from `prisma/seed.ts`: 6 users, 6 projects, 8 properties, 3 branches, GHS.
- Demo Super Admin: `admin@buildprop.com` / `demo123`. Demo login button also creates a fresh `demo@buildprop.com` if needed.
- `/api/demo/reset` (POST, demo-only) copies `prisma/demo.db` → `prisma/dev.db` to restore the pristine seed.

## Gotchas
- Demo login (client button + `/api/auth/demo` route) is gated by `DEMO_MODE`. The route returns 404 on non-demo editions — do not remove that guard; it prevents a fresh Premium being configured through the demo path.
- `use-crud.ts` must handle BOTH plain-array and object-wrapped list responses (`{projects:[...]}`, `{tasks:[...]}`) — see `extractList()`. The projects/tasks pages break otherwise.
- Electron resolves `localhost` → `::1`, but Ollama binds IPv4. Always use `127.0.0.1` (default `http://127.0.0.1:11435`).
- NSIS installer can intermittently crash (`-1073741819`). Fix: clear `%LOCALAPPDATA%\electron-builder\Cache\nsis` and rebuild.
- PowerShell blocks `npm.ps1`/`npx.ps1`. Use `cmd /c "npm.cmd ..."` / `cmd /c "npx.cmd ..."`.
- Settings stored as a JSON file (`data/settings.json`), not a Prisma model. `GET /api/setup` reports configured if the file has a companyName OR the DB has ≥1 user.
- Auth: httpOnly cookie `buildprop_token`; JWT carries `role`. Deactivated users get 401 at login.
- `.env.*` files under `electron/` contain secrets — never commit them (GitHub push protection rejects them).
