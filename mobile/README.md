# BuildProp Monitor — Mobile App (Android APK)

Owner/CEO monitoring app for Android. Talks to a BuildProp desktop instance over LAN.

## Deliverables
- `dist/mobile/BuildProp Monitor v1.0.0.apk` (2.9 MB, signed release)
- `dist/mobile/INSTALL-GUIDE.txt` — plain-language phone install + connect guide
- Source: `mobile/www/` (vanilla HTML/CSS/JS, no framework) + `mobile/android/` (Capacitor project)

## How it works
- Phone + desktop on same Wi-Fi. App connects to `http://<PC-IP>:3456` (Premium) or `:3460` (Demo).
- Login via `POST /api/mobile/auth` → JWT in body (NOT the cookie flow used by desktop).
- All API calls send `Authorization: Bearer <token>`; `src/proxy.ts` accepts Bearer on `/api/*` and adds CORS headers (`Access-Control-Allow-Origin: *` + OPTIONS preflight handling).
- Data cached in localStorage for offline view; pull-to-refresh; 401 clears session to login.

## Rebuilding the APK (after changing www/)
```bash
cd mobile
# edit files under mobile/www/
cmd /c "npx.cmd cap sync android"        # copies www -> android assets
# (optional) bump versionCode/versionName in android/app/build.gradle
$env:ANDROID_HOME = "C:\Users\Admin\AppData\Local\Android\Sdk"
cd android
.\gradlew.bat assembleRelease --no-daemon
# APK: android/app/build/outputs/apk/release/app-release.apk
```

## Keystore (RELEASE SIGNING)
- `mobile/buildprop-release.keystore` (alias `buildprop`, store/key pass `buildprop123`)
- KEEP THIS FILE + PASSWORD. It signs updates — if lost, existing installs can't be updated over the top.
- Signing is wired in `android/app/build.gradle` (signingConfigs.release).

## Android toolchain (already installed on this machine)
- Android cmdline tools + SDK at `C:\Users\Admin\AppData\Local\Android\Sdk` (platform-34, build-tools 34.0.0)
- Java 17 (OpenJDK) — do NOT upgrade to JDK 21 unless also upgrading Capacitor to v7.
- Capacitor pinned to v6 (compatible with JDK 17).

## Runtime verification (done 2026-08-03, dev server port 3459)
- POST /api/mobile/auth (admin@buildprop.com/demo123) → 200, token returned ✓
- GET /api/dashboard with Bearer token → 200, real data ✓
- CORS headers present on responses ✓ (ACAO: *), OPTIONS preflight → 200 ✓
- Bad password → 401 ✓ ; no token → 401 ✓
- www/ JS validated with `node --check` ✓

## Gotchas
- `gradlew` failure "Unexpected character: '?'": a UTF-8 BOM got written into build.gradle by PowerShell Set-Content. Rewrite with `[System.IO.File]::WriteAllText(..., UTF8Encoding($false))`.
- Capacitor config uses `server.androidScheme: "http"` + `cleartext: true` so the WebView may fetch plain-HTTP LAN addresses.
- Google sign-in: NOT implemented (needs a Google Cloud OAuth client). Password login covers it. Structure in `www/js/app.js` login flow makes swapping in OAuth straightforward later.
- Remote-over-internet monitoring: NOT implemented (needs tunnel/port-forwarding). See INSTALL-GUIDE.