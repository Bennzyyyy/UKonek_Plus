# Railway Deploy Guide (uKonek Plus)

Use this for quick remote testing of both:
- Backend API (`/api/*`)
- Web pages served by Express (`/html/*`)

## 1. Create Railway project

1. Push this repo to GitHub.
2. In Railway, create a New Project -> Deploy from GitHub repo.
3. When prompted for service settings, set:
- Root Directory: `backend`
- Start Command: `npm start`

Railway should auto-detect Node.

## 2. Add MySQL

Option A (quickest): Add Railway MySQL plugin in the same project.

Option B: Use external cloud MySQL.

Then fill the backend env vars from your database details.

## 3. Set environment variables in Railway service

Required:
- `PORT` (Railway provides this automatically, do not hardcode)
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_FORCE_IPV4`
- `APP_NAME`

After first deploy, copy your Railway public URL, then set:
- `BACKEND_BASE_URL=https://<your-railway-domain>`
- `APP_URL=https://<your-railway-domain>`
- `FRONTEND_LOGIN_URL=https://<your-railway-domain>/html/index.html`
- `FRONTEND_RESET_URL=https://<your-railway-domain>/html/reset-password.html`

Redeploy after updating these.

## 4. Smoke tests

Open these in browser:
- `https://<your-railway-domain>/html/index.html`
- `https://<your-railway-domain>/api/patients/login` (POST endpoint; use Postman/Insomnia)

If OTP fails, check Railway logs for SMTP auth errors.

## 5. Flutter remote testing

Use your Railway URL for API base.

Example run on Chrome:

```powershell
Set-Location frontend/mobile/ukonekmobile
flutter run -d chrome --dart-define=BACKEND_BASE_URL=https://<your-railway-domain>/api
```

Example APK build:

```powershell
Set-Location frontend/mobile/ukonekmobile
flutter build apk --release --dart-define=BACKEND_BASE_URL=https://<your-railway-domain>/api
```

## 6. Important note for web staff sessions

Current staff auth uses in-memory sessions. This is usually okay for quick testing, but can reset if service restarts.
For production-grade auth, move sessions to Redis/DB or switch to JWT.
