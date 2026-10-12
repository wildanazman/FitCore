# Supabase cloud backup

Manual account-scoped snapshots, not automatic synchronization. Existing FitCore Google login and Redis session verification remain unchanged. Supabase Auth accounts are not substituted for those identities.

Current setup status (13 October 2026): the migration ran successfully in the user's FitCore project `sdfxmhkwfpnuvhzwexiy`. A live SQL privilege query previously confirmed RLS=true, anon SELECT=false, authenticated direct SELECT=false, service_role SELECT=true, and anon function EXECUTE=false. After explicit user approval, `SUPABASE_URL` and `SUPABASE_SECRET_KEY` were saved as server-only Secret variables in Vercel Production. Production redeployment `E1qvjt8q83LzHZS36fWP1k6gEkkX` reached Ready using existing main commit `514ea14`. The signed-in production Settings cloud-status GET succeeded: “No cloud backup yet,” with Upload enabled. No health records were uploaded, and an upload/restore round-trip has not been performed. Local unpublished UI/workout changes were not included in this configuration-only redeployment.

1. Run `supabase/migrations/202610120001_cloud_backups.sql` in the FitCore project SQL editor. It creates a new restricted table and atomic version-checked save function. No existing logs/tables are dropped.
2. Set server-only Vercel environment variables `SUPABASE_URL` and `SUPABASE_SECRET_KEY` for this project, then redeploy. Never prefix the secret with `VITE_`, place it in Git, show it in the client, or paste it into a chat.
3. Settings → Data & storage → Cloud backup. Sign in with Google, refresh status, then review and confirm upload. Use the same Google account on another phone and review before restore.

Every request derives `google:<verified subject>` from the existing authenticated server session. Client-supplied owner IDs are ignored. Anonymous/publishable-key/authenticated direct database access is revoked; RLS is enabled without permissive public policies. Only the service role can access the table; the application server enforces user isolation. The secret is privileged project access, so protect it and keep it server-only.

One newest snapshot per account; overwrites require an exact version to prevent stale-device conflicts. Twenty uploads/account/day, a 3 MB request cap (under Vercel function limits), 10-second database and 15-second client timeouts. Photos are opt-in and share this cap. No API keys are stored. Larger backups can still be exported as local JSON. Restoring a photos-excluded snapshot replaces local photos with an empty list, explicitly disclosed before confirmation.

Cloud backup is not end-to-end encrypted: Supabase/project operators can access stored data. The UI discloses upload of personal health information, and never uploads before explicit confirmation. The existing local backup/restore path remains available offline. Restoring requests a file download of previous local data before replacement; the browser may require download permission.

`scripts/check-cloud-backup.mjs` mocks all network calls to check owner isolation, auth/origin rejection, credentials exclusion, byte limits, version conflicts, rate limits and restricted SQL. No live user-health upload is part of those tests. A full live cloud round-trip needs project configuration and a disposable test snapshot, not silent transmission of real user logs.
