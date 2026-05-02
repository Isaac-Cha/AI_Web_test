# Emergent (replacing AI_Web_test)

This repository now uses the `Emergent/` project as the primary codebase.

## Structure

- `Emergent/frontend`: React web frontend (includes `/admin` dashboard)
- `Emergent/backend`: Python backend API
- `Emergent/tools`: MT4/MT5 exporters and tick/trade analysis tools
- `legacy_ai_web_test/`: archived previous `AI_Web_test` frontend (kept for reference)

## Frontend

```bash
cd Emergent/frontend
npm ci
npm run start
```

Build:

```bash
cd Emergent/frontend
npm run build
```

## Deploy

The GitHub Actions workflow `Deploy site to VPS (build + SSH)` builds `Emergent/frontend` and uploads the output to the VPS target directory.
