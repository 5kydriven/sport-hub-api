# Deployment Runbook

## Release flow

- Pull requests targeting `main` run unit tests, typechecking, architecture and
  naming enforcement, migration-drift detection, and a Wrangler dry-run.
- A successful push to `main` applies committed Drizzle migrations to production
  Neon, deploys the top-level `sport-api` Worker, and smoke-tests `/health`,
  `/openapi.json`, and `/docs`.
- `sport-api` is the sole deployed Worker; there is no separate Worker or
  environment.

Protect `main` in GitHub repository settings: require the `CI / Verify` check
and one approving review before merge. Use the `production` GitHub Environment
to restrict access to deployment secrets and, if desired, require an approval
before the deploy job begins.

## Pull request description standard

Every pull request targeting `main` uses the repository template and must keep
these sections in its description:

```markdown
## Summary

- What changed and why.

## Verification

- Exact commands and manual checks that passed.
```

The CI `Verify` job rejects a PR that omits either section or leaves it empty.
For endpoint changes, include the HTTP status, content type, and expected body.
For migrations, name the generated files and explain compatibility or rollback
impact. Keep unrelated discussion in comments so the description remains the
release handoff.

The local equivalents used in the verification section are:

```sh
bun run check
bun run check:migrations
bun run deploy:dry-run
```

## Required configuration

Configure these GitHub Environment secrets under `production`:

- `CLOUDFLARE_API_TOKEN` — least-privileged token permitted to deploy this Worker.
- `CLOUDFLARE_ACCOUNT_ID` — account owning the Worker.
- `DATABASE_URL` — Neon production connection string.
- `BETTER_AUTH_SECRET` — production Better Auth secret, at least 32 characters.

`wrangler.jsonc` declares `DATABASE_URL` and `BETTER_AUTH_SECRET` as required
Worker secrets. The deployment action synchronizes them to Cloudflare; never
place their values in Wrangler configuration, committed files, or workflow logs.

Before the first production release, set the top-level non-secret `vars` in
`wrangler.jsonc` with the final production values for `ENVIRONMENT`,
`BETTER_AUTH_URL`, `CORS_ORIGINS`, `LOG_LEVEL`, `PAGE_SIZE_DEFAULT`, and
`PAGE_SIZE_MAX`. These names must match `src/env.ts`. Do not use `vars` for
secrets.

Until the public Worker URL is known, `BETTER_AUTH_URL` may temporarily be
`http://localhost:3000` to validate deployment. Replace it with the deployed
`https://sport-api.<account-subdomain>.workers.dev` URL before using Better Auth
from a browser.

## Migration and recovery policy

CI generates migrations from the schema and fails if the generated `drizzle/`
files are not committed. Production uses `db:migrate`; never use `db:push`.

Use expand/contract changes: add compatible schema, backfill, migrate reads,
then remove obsolete fields in a later release. Never combine expand and
contract in one deployment because old and new Worker versions can overlap.

If a migration fails, the Worker is not deployed. If deployment or smoke tests
fail after a successful migration, stop further releases, inspect the failed
workflow and Worker logs, and deploy a compatible prior Worker version only when
the applied schema remains backward compatible. Resolve the database change with
a new forward migration rather than editing applied migration history.

## Test strategy

Unit tests cover deterministic helpers and service behavior without live
Cloudflare or Neon dependencies. Add route, Worker, and database integration
tests alongside features that depend on HTTP or persistence behavior. Every PR
must keep the unit, type, architecture, naming, migration, and Wrangler checks
passing.
