<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Teachenza

Universal online learning platform — connects students with expert tutors for personalised, one-on-one education.

Live at **[teachenza.com](https://teachenza.com)**

## Tech stack

- **React 19 + Vite 6 + TypeScript** — SPA frontend
- **Tailwind CSS v4** — utility-first styling with dark/light theme
- **Firebase** (Auth, Firestore, Cloud Functions, Storage) — backend
- **SafePay** — payments and credit top-ups
- **Hostinger** — production hosting via SFTP deploy

## Run locally

**Prerequisites:** Node.js 22+

1. Install dependencies:
   ```sh
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your Firebase credentials
3. Start the dev server:
   ```sh
   npm run dev
   ```

The app runs at `http://localhost:3000`. Use the local preview mode (no Google OAuth required) to explore the dashboard without signing in.

## Firebase Cloud Functions

```sh
cd functions
npm install
npm run build
```

Deploy rules and functions:
```sh
npm run firebase:deploy:rules
npm run firebase:deploy:functions
```

## Deploy to Hostinger

The repo deploys automatically to Hostinger via GitHub Actions on every push to `main`.

Add these secrets under **Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `HOSTINGER_HOST` | Bare FTP/SFTP hostname or IP |
| `HOSTINGER_USERNAME` | FTP or SSH username |
| `HOSTINGER_PASSWORD` | FTP or SSH password |
| `HOSTINGER_SERVER_DIR` | Optional override. If omitted, deploy defaults to `domains/teachenza.com/public_html` |
| `HOSTINGER_PROTOCOL` | Optional — defaults to `sftp` |
| `HOSTINGER_PORT` | Optional — defaults to `65002` (sftp) or `21` (ftp) |

The workflow: checks out → installs → builds → writes SPA `.htaccess` → diffs against the deploy manifest → uploads only changed files.

Recommended Hostinger values for this project:

- `HOSTINGER_PROTOCOL=sftp`
- `HOSTINGER_PORT=65002`
- `HOSTINGER_SERVER_DIR=domains/teachenza.com/public_html` (set this explicitly if your account layout differs)

If you reconnect or publish this repository through a GitHub dialog, switch the target organization from `wysRocket` to `SaaS-Pretty-Projects`.
