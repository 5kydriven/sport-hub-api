# Sport API

Cloudflare Worker backend for the community sports venue discovery and booking
platform. The current engineering standard is
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Local development

Install Bun 1.3.13, copy `.env.example` to `.env`, then provide the required
Neon and Better Auth values.

```sh
bun install --frozen-lockfile
bun run dev
```

Useful commands:

- `bun run test` runs deterministic unit tests.
- `bun run check` runs tests, TypeScript, and architecture/naming checks.
- `bun run check:migrations` generates migrations and fails if `drizzle/` would change.
- `bun run cf-typegen` refreshes Cloudflare binding types.
- `bun run deploy` deploys the Worker manually; production deployments normally run through GitHub Actions.

## API reference

With the Worker running, use `/health` for liveness, `/openapi.json` for the
generated machine-readable contract, and `/docs` for the Scalar UI. The OpenAPI
contract is generated from route schemas; do not add a separate hand-maintained
schema.

## Delivery

Pull requests to `main` run tests, typechecking, architecture/naming checks,
migration-drift detection, and a Wrangler dry-run. A successful push to `main`
applies committed Neon migrations and deploys the production Worker. See the
[deployment runbook](docs/operations/deployment.md) for required secrets,
configuration, recovery, and branch-protection setup.
