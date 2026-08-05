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

## v3.7 additions
- **Quick Actions** on dashboard (New Project / Invoice / Task / Contact / Payment) → navigate to `?new=1`; those pages auto-open their create dialog on mount (read `searchParams` via React `use()` — params are Promises in this Next version).
- **Email (SMTP)**: `src/lib/email.ts` + `src/app/api/email/{settings,test,send,invoice,reminders}` routes. Config stored in `data/email.json` (password omitted from GET). Requires internet + a working SMTP account; independent of AI. nodemailer is in `serverExternalPackages` in next.config.ts.
- **Mobile monitoring API**: `src/app/api/mobile/auth` (POST → {token,user}, no cookie). `src/proxy.ts` now ALSO accepts `Authorization: Bearer` on /api/* and adds CORS (ACAO: *) + OPTIONS preflight to every response. Cookie auth for pages unchanged.
- **Mobile app**: see `mobile/README.md`. Build: `mobile/android/gradlew.bat assembleRelease`. APK → `dist/mobile/`.

## v3.8 additions — Mobile linking, admin app, Tailscale, remote access
- **QR pairing**: Settings → "Mobile & Remote" tab shows a QR (auto-refreshes every 2.5 min, 5-min one-time token). Phone scans it → `POST /api/mobile/pair/confirm` → gets a JWT → linked with ZERO typing. QR payload = `{"v":1,"s":"<serverUrl>","k":"<token>"}`.
  - Routes: `src/app/api/mobile/pair/{start,qr,confirm,tailscale}/route.ts`, store in `src/lib/pairing.ts` (JSON file `data/pairing.json`).
  - `confirm` is PUBLIC (in `src/proxy.ts` PUBLIC_PATHS); `start/qr/tailscale` require Super Admin/Admin.
  - `getCurrentUser()` (`src/lib/current-user.ts`) now falls back to `Authorization: Bearer` — REQUIRED for the mobile app's CRUD (routes use getCurrentUser for RBAC; the proxy only validates tokens, it does not forward user identity).
  - serverUrl prefers Tailscale IP (100.x) else LAN IPv4; port = `BUILDPROP_PORT || 3456`.
- **Mobile app is now a full admin app**: `mobile/www/` — 5 tabs (Home/Projects/Finance/Contacts/Settings), create/edit projects, invoices (with line items + 15% VAT), payments, contacts, tasks, QR scanner (jsQR + getUserMedia, CAMERA permission in manifest), manual pairing-code paste fallback. Alerts moved to a Home bell + screen.
- **Tailscale bundling**: `electron/resources/tools/tailscale-setup.msi` (36.6 MB) is added via extraResources → `tools/tailscale-setup.msi` for Premium + Demo only. The "Install Secure Remote Access" button in Settings POSTs to `/api/mobile/pair/tailscale` which runs `msiexec /i "<BUILDPROP_TAILSCALE_MSI>" /quiet` (UAC prompt). `electron/main.js` sets `BUILDPROP_RESOURCES_DIR` and `BUILDPROP_TAILSCALE_MSI` env vars for the server.
- **LAN binding**: `electron/main.js` sets `BIND_HOST: '0.0.0.0'` (wrapper) so phones can reach the app over LAN/Tailscale. Internal upstream stays 127.0.0.1.

## Gotchas (v3.8)
- **NSIS installer crash 0xc0000005 (System.dll)**: caused by a SPACE in the shortcut/app name on this Windows 11 build. Fix: add `"shortcutName": "BuildProp"` (no space) to every `nsis` config. Keep productName with space ("BuildProp Demo") — the install dir becomes `BuildPropDemo` automatically.
- **Next.js standalone 8GB balloon**: `@vercel/nft` scans STRING LITERALS and `path.join(process.cwd(), ...)` as file paths during `next build` and copies whole folders into `.next/standalone`. Avoid ANY absolute-path string (`'C:\\Program Files\\...'`) or static `join(process.cwd(), '<folder>')` in traced server code. `resolveResourcesDir()` uses only env vars for this reason.
- **Two-team contract trap**: keep desktop Settings page and mobile app on ONE contract for `/api/mobile/pair/qr` — it returns `{ success, v, s, k, token, expiresAt, qrDataUrl, serverUrl, tailscaleInstalled, tailscaleIp }`.
- **File locks during rebuild**: a running app from `dist/*/win-unpacked` locks files (esp. `ai/lib/ollama/*.dll` via `llama-server.exe` and `ollama.exe`). Kill `BuildProp*`, `llama-server*`, `ollama*` processes before rebuilding, or electron-builder fails with "Access is denied".
- **Build commands must run from the right dir**: `npm run build:<edition>` from repo ROOT; `npx electron-builder ...` from `electron/`. Mixing them silently packages the WRONG edition (verified the hard way).
- The emulator's headless camera cannot render getUserMedia video ("Unable to play media") — camera scanning is untestable on this machine; test on a real phone. The manual paste fallback covers it.

## GitHub Actions — Mobile APK pipeline
- `.github/workflows/build-apk.yml`: builds the signed release APK on push to `mobile/**` OR via the Actions tab → "Build Mobile APK" → "Run workflow". Artifact `BuildProp-Monitor-APK` (downloadable, 14-day retention).
- CI generates its own keystore (`mobile/buildprop-release.keystore`) so the APK is signed/installable — it will NOT update over an app signed with the local keystore (test builds only).
- Requires: Ubuntu runner, JDK 17 (temurin), Node 20, android-actions/setup-android, `sdkmanager` platform-34 + build-tools 34.
- The mobile app is now a FULL admin app: 5 tabs (Home/Projects/Finance/More/Contacts); More grid = Properties, Inventory, Procurement, Fleet, Assets, Employees, Installments, Reports, Alerts, Settings. Equipment shows "Desktop only" (no API route). Field names match the real routes (validated).
