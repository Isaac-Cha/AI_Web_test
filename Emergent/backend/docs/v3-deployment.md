# V3 deployment and rollback

This deployment changes both API response models and public content. Do not deploy the frontend alone.

## Preconditions

1. Configure `MONGO_URL` (or `DB_URI`), `DB_NAME`, `ADMIN_TOKEN` and COS settings in the backend service environment.
2. Keep credentials out of source control and deployment archives.
3. Confirm that Tianyan test evidence and Golden Dragon screenshots are either populated or clearly marked pending.
4. Run all tests and builds from the `Emergent` directory.

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests\test_v3_evidence.py -q
npm --prefix frontend run build
.\.tools\dotnet\dotnet.exe test control-center.tests\ControlCenter.Tests.csproj -c Release
```

## Database preview and backup

Dry run (read-only):

```powershell
.\.venv\Scripts\python.exe backend\tools\migrate_v3_evidence.py
```

Apply only after checking the exact IDs in the preview:

```powershell
.\.venv\Scripts\python.exe backend\tools\migrate_v3_evidence.py --apply
```

The apply operation first exports `eas`, `indicators`, `tutorials`, `articles`, and `public_research` to a timestamped folder under `backend/backups/`. It then:

- deletes only `ind-liquidity-map` and `ind-session-clock`;
- changes the two exact placeholder tutorials to `draft` only when their URL contains `placeholder`;
- adds evidence metadata to `ind-tianyan-1` and `ea-golden-dragon-13`.

## Release order

1. Create a timestamped copy of the current backend application and frontend web root on the VPS.
2. Deploy `backend/server.py` and install the pinned backend requirements in the service environment.
3. Restart the backend and verify `/api/health`, `/api/eas`, `/api/indicators`, `/api/articles`, and admin authentication.
4. Apply the database migration.
5. Deploy the tested `frontend/build/` directory.
6. Verify default, Apple and Hybrid routes, including product details and article routes.

## Acceptance checks

```text
/api/indicators contains ind-tianyan-1 only
/api/tutorials does not expose placeholder records
/api/eas/ea-golden-dragon-13 separates closed_drawdown and floating_drawdown
/api/articles returns published records only
draft product detail URLs return 404
all three themes use the same API records
```

## Rollback

1. Stop the backend service.
2. Restore the previous backend directory and frontend web-root copy.
3. Restore each Mongo collection from the matching timestamped JSON backup. Do not mix backups from different migration runs.
4. Start the old backend, then verify the health endpoint and three public catalog endpoints.
5. Keep the failed release directory and logs for diagnosis; do not rerun media jobs automatically.

The local control center and its SQLite databases are not deployed to the VPS.
