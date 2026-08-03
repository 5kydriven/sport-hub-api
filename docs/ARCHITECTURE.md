# Sport API — Architecture & Code Standard

**Status:** normative. **Applies to:** everything under `src/`.
**Derived from:** `docs/backend-architecture-hono.pdf` (Backend Architecture Specification v1.0), narrowed to what this repository actually does today.

The PDF is the *reference architecture*. This file is the *house standard*: it keeps the parts we adopted, records where we deliberately deviate, and adds rules the PDF does not cover (file legibility, schema-drift prevention, rate limiting).

Rules are numbered so code comments can cite them. `P*` (principles) and `R*` (structure) keep the PDF's numbering. `S*`, `SC*`, `RL*` are ours.

---

## 0. Where the code stands today

Be honest about this table before planning work against it.

| Area | State |
| --- | --- |
| Composition root, env validation, logger, DB client | Implemented — [container.ts](src/container.ts), [env.ts](src/env.ts), [logger.ts](src/core/logger.ts), [db/client.ts](src/db/client.ts) |
| Error hierarchy + edge translation | Implemented — [errors.ts](src/core/errors.ts), [error-handler.ts](src/core/middleware/error-handler.ts) |
| Pagination (cursor + offset) | Implemented end-to-end — [core/pagination/](src/core/pagination/), [user.repository.ts](src/modules/user/user.repository.ts) |
| OpenAPI + Scalar docs + Better Auth spec merge | Implemented — [core/http/openapi.ts](src/core/http/openapi.ts), [app.ts](src/app.ts) |
| Auth (session/bearer via Better Auth), scopes, roles | Implemented — [auth.ts](src/core/middleware/auth.ts), [require-scopes.ts](src/core/middleware/require-scopes.ts) |
| `GET /v1/users` | Implemented — [user.routes.ts](src/modules/user/user.routes.ts) |
| User repo CRUD (`findById`, `create`, `update`, `delete`, `softDelete`) | **Stubs.** `// TODO` bodies |
| `UserService.updateUser` / `deleteUser` | **Empty function bodies.** They resolve `undefined` and lie about it |
| Module barrel [modules/user/index.ts](src/modules/user/index.ts) | **Empty file** — violates R4 |
| [db/pool.ts](src/db/pool.ts) | **Dead code.** A second, half-written `createContainer`. Delete it or finish it (see §12) |
| Rate limiting | **Not wired.** KV bindings commented out in [wrangler.jsonc](wrangler.jsonc); standard defined in §10 |
| Tests | None |

---

## 1. Principles (P1–P5)

These are non-negotiable. Every rule below derives from one of them.

**P1 — Explicit over implicit.** If a module depends on something, that dependency arrives as a function argument. No module-level singletons, no ambient imports of live connections, no decorator/reflection wiring. *You must be able to read a file top-to-bottom and know exactly what it touches.* → this is what §3 exists to protect.

**P2 — The transport layer is thin.** A handler parses input, calls one service method, serializes output. No business `if`s. If a handler exceeds ~10 lines, logic has leaked upward. See [user.routes.ts:82](src/modules/user/user.routes.ts:82).

**P3 — Vertical slices, not horizontal layers.** A feature lives in one directory under `src/modules/`. Adding an endpoint touches one folder.

**P4 — Schema is the single source of truth.** Drizzle table → drizzle-zod validator → OpenAPI document → TypeScript type. One definition, four consumers. §4 is entirely about closing the holes in this chain.

**P5 — Business logic must run without HTTP.** A service method must be callable from a cron trigger, a queue consumer, or a test. If a service accepts a `Context`, HTTP has contaminated the domain. The commented-out `scheduled` handler at [app.ts:56](src/app.ts:56) is the proof obligation — it must stay possible.

**No DI container.** We keep the *principle* of dependency injection and discard the *machinery*. The graph is `env → db → repository → service → handler` — four levels. A container solves a problem that appears at depth 30. Revisit when the graph exceeds ~30 nodes.

---

## 2. Structure & layer contracts

### 2.1 Directory rules

```
src/
  app.ts             worker entrypoint; mounts everything
  container.ts       THE composition root — the only place things get wired
  env.ts             zod-validated bindings + Env type
  core/              framework-level, feature-agnostic. Knows nothing about the business.
    errors.ts  logger.ts  types.ts
    http/            openapi.ts (app factory + spec), responses.ts (error envelope)
    middleware/      request-id, logger, cors, secure-headers, container, auth,
                     require-scopes, error-handler  [+ rate-limit — see §10]
    pagination/      schema.ts, types.ts, helper.ts, link-header.ts
  db/                client.ts, predicates.ts, schema/
  auth/              better-auth.ts, routes.ts, principal.ts
  modules/           ← vertical slices
    user/            user.routes.ts  user.service.ts  user.repository.ts
                     user.schema.ts  index.ts
```

**R1 — A module is a deletable unit.** Deleting `modules/post/` and its one line in `app.ts` must leave a compiling, working app. If it doesn't, a dependency leaked.

**R2 — Modules communicate through services, never repositories.** `PostService` may depend on `UserService`. `PostService` may **never** import `UserRepository`. The service is the module's contract; the repository is its private implementation.

**R3 — `core/` never imports from `modules/`.** Dependency direction is strictly inward. Enforced in [eslint.config.ts](eslint.config.ts).

**R4 — Each module exports through `index.ts`.** The barrel is the public surface; anything not exported there is internal. *Currently violated: [modules/user/index.ts](src/modules/user/index.ts) is empty.* It should export `userRoutes`, `makeUserService`, `UserService`, `User`, and the schemas — and nothing else.

### 2.2 The layer contract

The most important table in this document. Violations are how architectures rot.

| Layer | May import | Must never touch | Returns |
| --- | --- | --- | --- |
| **Routes** (`*.routes.ts`) | Zod schemas, service *types*, `core/http`, middleware | Drizzle, `db/`, repositories, SQL | `Response` |
| **Service** (`*.service.ts`) | Repository types, other services, domain errors, `db` *only for transactions* | `Context`, `c.req`, `c.json`, HTTP status codes, `HTTPException` | Plain objects; **throws** domain errors |
| **Repository** (`*.repository.ts`) | Drizzle, schema, SQL, `db/predicates` | Business rules, HTTP, other repositories | Rows / `null` / `[]` — **never throws domain errors** |
| **Schema** (`db/schema/*`) | Drizzle column builders | Everything else | — |

> **The `Context` test.** `grep -rE "\b(Context|c\.req|c\.json|HTTPException)\b" src/modules/**/*.service.ts` must return zero results. Put it in CI (§13).

**Repositories report facts; services set policy.** `findById` returning `null` is a *fact*. Deciding that `null` means `404` is a *policy* and belongs one layer up.

**Transaction boundaries belong to the service**, because only the service knows what one business operation is. A repository must never open a transaction.

**Repository types are derived, not declared.** `export type UserRepository = ReturnType<typeof makeUserRepository>`. Migrate to a hand-written `interface` the first time a *second implementation* actually appears — not before. Structural typing already makes `{ findById: async () => fixture } as UserRepository` valid in tests.

---

## 3. File legibility standard (S1–S6)

> **The governing rule: a file is read once, top to bottom, without scrolling back up.**
> Every rule in this section serves that one sentence. It is also the practical form of P1.

### S1 — No reusable variables. *(strict)*

**A binding may not be a shared container that later code reaches back into.** If, while reading line 80, you have to scroll up to line 12 to answer *"what is in this, right now?"* — the file is wrong.

Concretely, **forbidden**:

- A `const`/`let` declared near the top and consumed by two or more unrelated blocks further down.
- Any `let` that is reassigned across sections of a function (accumulators, "running state", flags).
- Generic carry-along names: `data`, `result`, `temp`, `res`, `obj`, `value`, `item`, `payload`, `output`. These names *require* the reader to scroll up, because the name says nothing.
- A variable that changes meaning as the function progresses (`user` is a row, then a DTO, then a string id).
- Module-level mutable state of any kind (`let _pool` in [db/pool.ts:7](src/db/pool.ts:7) is exactly the shape this rule bans).

**Allowed — exactly two categories, nothing else:**

1. **Frozen top-of-file literals.** A `const` at the very top of the file, above the first function, whose entire value is visible on the line that declares it, and whose name states the content. `const HEADER = 'x-request-id'` ([request-id.ts:5](src/core/middleware/request-id.ts:5)), `AUTH_BASE_PATH`, `DOCS_CDN`, `RANK`. These are configuration, not intermediate state — the reader never wonders what they contain, because the name and the literal agree.

2. **A one-screen local with a single, named purpose.** Declared *immediately* above its use, named for what it is rather than where it came from, and never reassigned. It may be read more than once **only when sharing it is the point of the code** — and then it carries a comment saying so. The canonical legitimate case is [user.repository.ts:34](src/modules/user/user.repository.ts:34):

   ```ts
   // Both queries MUST share one predicate. If the count filters
   // differently from the page, `totalPages` disagrees with reality.
   const where = notDeleted(users);
   ```

   Two reads, three lines apart, with the reason stated. That is not a reusable variable; that is an enforced invariant.

**How to satisfy the rule when you feel the pull to reuse:**

- Inline the value at its single use site.
- If it is used in two places far apart → **extract a function.** The function name becomes the documentation, and the reader no longer needs the value, only the name.
- If it is derived state → **compute it where it is needed**, or pass it as a parameter (P1).
- If it is genuinely shared configuration → **promote it to a frozen top-of-file literal** (category 1).

**Corollary S1a — functions stay short enough that declaration and use fit on one screen.** The no-scroll rule is unenforceable in a 200-line function. If a function is long enough that S1 becomes painful, the function is the defect, not the rule.

**Corollary S1b — `const` everywhere. `let` requires a comment justifying the mutation.** There is currently no `let` in `src/` outside `db/pool.ts`. Keep it that way.

### S2 — Declaration order follows reading order

A file reads: imports → frozen literals → types → private helpers → the exported thing. A helper is defined *above* its first use. Hoisting is a language feature, not a licence to make the reader search.

### S3 — Comments explain *why*, and sit at the decision

The existing comment style is the standard. See [app.ts:21](src/app.ts:21), [user.routes.ts:16](src/modules/user/user.routes.ts:16), [openapi.ts:11](src/core/http/openapi.ts:11). Comments record the trap that was hit, the alternative that was rejected, and the constraint that makes the code look strange. They do not restate the code.

A comment that would send the reader upward (`// see the config above`) is itself an S1 violation.

### S4 — Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Files & folders | `kebab-case`, enforced by `check-file` | `require-scopes.ts` |
| Module files | `<module>.<layer>.ts` | `user.repository.ts` |
| Factories | `make<Thing>` / `create<Thing>` | `makeUserService`, `createDb` |
| Derived types | `ReturnType<typeof factory>` | `type UserService = ...` |
| Zod schemas | `PascalCase` + `Schema` suffix | `CreateUserSchema` |
| Frozen literals | `SCREAMING_SNAKE` | `AUTH_BASE_PATH` |
| Error codes | `SCREAMING_SNAKE`, stable, client-facing | `VALIDATION_FAILED` |
| Log events | `namespace.event` | `http.request`, `auth.failed` |

### S5 — One exported concern per file

A file exports one factory, one middleware, or one cohesive schema set. [middleware/auth.ts](src/core/middleware/auth.ts) exporting `requireAuth` + `optionalAuth` is fine — same concern, two strengths. A file exporting a middleware *and* a repository is not.

### S6 — Formatting is not a matter of opinion

Tabs, single quotes, trailing commas — `.prettierrc` decides. Never argue about it in review.

---

## 4. Schema, and how to stop the drift *(the `image` / `avatarUrl` problem)*

### 4.1 The chain of truth

```
Drizzle table (db/schema/*.ts)
   │ drizzle-zod: createSelectSchema / createInsertSchema
   ▼
Zod schema (modules/<m>/<m>.schema.ts) ──► TypeScript types (z.infer)
   │ @hono/zod-openapi
   ├──► runtime request validation
   └──► /openapi.json ──► Scalar docs, client SDKs
```

This is the one place we choose implicit over explicit, deliberately. Deriving validators from the table makes drift *structurally impossible* — **except through the four holes below.** Closing them is what makes schema work stop being a hassle.

### 4.2 Where drift currently gets through

The problem you hit — the DB column is `image`, the schema advertised `avatarUrl`, and nothing errored — is hole **H1**. All four are real:

| # | Hole | Why TypeScript stays silent |
| --- | --- | --- |
| **H1** | **`.openapi(name, { example })`** — [user.schema.ts:19](src/modules/user/user.schema.ts:19) | `example` is typed `unknown`. Any object literal is accepted. A key that matches no column is invisible until a human reads the rendered docs. |
| **H2** | **`.extend({ ... })`** adding a *new* key | `extend` is designed to add keys. `base.extend({ avatarUrl: z.string() })` compiles perfectly and silently publishes a field no column produces. `.omit()` and `.pick()` are safe — their keys *are* checked. |
| **H3** | **Drizzle property name ≠ column name** | `avatarUrl: text('image')` is legal Drizzle. The TS world says `avatarUrl`, the SQL world says `image`, and the two never meet in a type error. Migrations and hand-written SQL then speak a different vocabulary than the code. |
| **H4** | **Hand-written wire types** | Any `interface User { ... }` written by hand instead of `z.infer<typeof UserSchema>` reintroduces the drift the whole chain exists to prevent. |

### 4.3 The rules

**SC1 — Every module schema starts from the table.** `createSelectSchema(table)` / `createInsertSchema(table)`. Never `z.object({...})` describing a persisted row.

**SC2 — Shrink with `.omit()` / `.pick()`. Never grow with `.extend()`.**
`.extend()` is permitted **only to re-type a key that already exists** — the date coercion at [user.schema.ts:11](src/modules/user/user.schema.ts:11) is the model: `createdAt` and `updatedAt` are real columns, given a wire representation. If `.extend()` introduces a key the table does not have, it is rejected in review. A genuinely computed wire field (e.g. `postCount`) must be declared in a separate, explicitly named schema and merged — so the reader sees "this is not a column."

**SC3 — Examples must be type-checked. `satisfies` is mandatory.** This is the fix for H1.

It cannot be written inline inside the `.openapi()` call — `satisfies z.infer<typeof UserSchema>` inside `UserSchema`'s own initializer is a circular reference and TypeScript rejects it. Split the declaration in two:

```ts
// The wire shape, without the annotation. Named so the example can be typed against it.
const UserWire = base
  .omit({ deletedAt: true })
  .extend({
    createdAt: z.coerce.date().transform((d) => d.toISOString()),
    updatedAt: z.coerce.date().transform((d) => d.toISOString()),
  });

const userExample = {
  id: 'b3c1f0a2-6d4e-4a19-9f27-5c8e0d1a7b34',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  emailVerified: true,
  image: null,
  role: 'player',
  createdAt: '2025-01-15T10:30:00.000Z',
  updatedAt: '2025-01-15T10:30:00.000Z',
} satisfies z.infer<typeof UserWire>;   // ← `avatarUrl` now fails to compile

export const UserSchema = UserWire.openapi('User', { example: userExample });
```

`satisfies` catches **both** failure directions: an unknown key (`avatarUrl`) *and* a missing one (`role`, which this example previously omitted).

*On S1:* `UserWire` is read twice, four lines apart, and sharing it is precisely the point — it is what makes the example type-checkable. That is S1 category 2, not a reusable variable.

**SC4 — Prefer deriving the example from a typed fixture.** The strongest form, and it pays for itself the moment tests exist:

```ts
// user.fixture.ts — every column present, type-checked against the table
export const userRowFixture: UserRow = { /* … */ };

// user.schema.ts
export const UserSchema = UserWire.openapi('User', {
  example: UserWire.parse(userRowFixture),
});
```

Note it parses through `UserWire`, not through `toPublicUser` — the mapper is defined *below* `UserSchema` and calls `UserSchema.parse`, so using it here would be a temporal-dead-zone error at module load. `UserWire.parse` is the same transform by the same schema, one step earlier in the file.

Now the documented example is produced by the *same code path that serialises real responses*. Drift is not merely caught — it is impossible, and a bad fixture throws at module load rather than misleading a client six months later. The fixture is also the seed for service tests.

**SC5 — Drizzle property name MUST equal the column name.** `image: text('image')`, never `avatarUrl: text('image')`. One vocabulary across migration SQL, Drizzle, Zod, OpenAPI, and the wire. If the public API genuinely needs a different name, rename in **one** place — the mapper — and document why in a comment at the column.

**SC6 — One row→wire mapper per module, and it is the only boundary.** `toPublicUser` ([user.schema.ts:61](src/modules/user/user.schema.ts:61)) is where secrets get stripped, and the *only* place a `UserRow` becomes a `User`. A route that hands a raw row to `c.json()` has bypassed the security boundary.

**SC7 — Wire types are always inferred.** `export type User = z.infer<typeof UserSchema>`. No hand-written interface for anything that crosses the wire.

### 4.4 Soft deletes

`deletedAt` is nullable and respected **explicitly**, via the shared predicate in [db/predicates.ts](src/db/predicates.ts). No global Drizzle filter, no query-builder wrapper that silently appends `WHERE deleted_at IS NULL` — the day you need deleted rows for an audit you would be fighting the abstraction.

*Inconsistency to fix:* [user.repository.ts:53](src/modules/user/user.repository.ts:53) hand-writes `isNull(users.deletedAt)` while `paginateOffset` uses `notDeleted(users)`. One predicate, both places.

---

## 5. Composition root

[container.ts](src/container.ts) is the only place dependencies are wired, and it is built **per request** by [middleware/container.ts](src/core/middleware/container.ts). Order inside it is fixed:

1. **Validate config** — `parseEnv(raw)`. Throws on bad config, before anything else exists.
2. **Infrastructure** — logger, db, auth.
3. **Repositories** — depend only on `db`.
4. **Services** — depend on repositories and on *other services*, never on a foreign repository (R2).

**Per-request construction is correct on Workers.** Isolates are ephemeral; there is no meaningful application-lifetime singleton, and the `neon-http` driver is stateless and cheap to build. Do not add caching here to "optimise" it.

**Configuration is required only for capabilities that exist.** `API_KEY_PEPPER` stays out of `EnvSchema` until the code that needs it lands — demanding a secret for an unbuilt module fails every request at boot. Same discipline applies to `RATE_LIMIT_KV` (§10).

---

## 6. Middleware pipeline — order is a contract

Order is a correctness requirement, not a style choice. Each layer depends on invariants established above it. As applied in [app.ts:18](src/app.ts:18):

```
1. requestId          establishes trace identity; honours upstream cf-ray
   onError / notFound  registered here — handlers, not positional middleware
2. securityHeaders    cheap, unconditional; except('/docs') — see below
3. cors               MUST precede auth
4. container          everything below needs services
5. accessLog          MUST follow container (it reads the container's logger)
   ── rateLimit slots in here when it lands (§10) ──
   ── public routes terminate here: /health, /api/auth/* ──
6. requireAuth        per-route, not global
7. requireScopes      needs principal from requireAuth
   ── route handler ──
```

**CORS must precede auth.** A browser preflight (`OPTIONS`) carries no `Authorization` header. If auth runs first, every preflight returns `401` and the browser never sends the real request. The failure is silent and maddening.

**`accessLog` must follow `container`** — it reads `c.get('logger')`, which `containerMiddleware` sets. This is a deliberate deviation from the PDF's ordering (which places the logger at position 2); ours is the correct one for a container-provided logger.

**`securityHeaders` excludes `/docs`.** The global policy forbids scripts outright and the middleware writes headers on the way *back out*, so an un-excluded run would overwrite the docs-specific CSP set further down. `/docs` gets its own nonce-based policy — [secure-headers.ts:29](src/core/middleware/secure-headers.ts:29).

**Auth is applied per route, not globally**, so a route can opt out cleanly: `middleware: [requireAuth, requireScopes('users:read')]` in the `createRoute` definition.

---

## 7. Errors

**A service must never throw `HTTPException`.** It throws a domain error from [core/errors.ts](src/core/errors.ts). Whether `NotFoundError` becomes a `404` is a decision for the HTTP layer — a cron job consuming the same service has no use for status codes (P5).

Every error extends `AppError` and carries a **stable machine-readable `code`**. Clients switch on `code`, never on `message`. `details` is safe to serialize and never contains internals.

The single translation point is [error-handler.ts](src/core/middleware/error-handler.ts), in this order:

1. `AppError` → its own status + code. Logged at `warn`.
2. `ZodError` → `422 VALIDATION_FAILED` with per-issue `path`/`message`/`code`.
3. Postgres codes → domain semantics: `23505`→`409`, `23503`→`409`, `23514`→`422`.
4. `HTTPException` → Hono internals.
5. Everything else → **log the full error, leak nothing.** `500 INTERNAL_ERROR`.

**Envelope** — one shape, always, including `requestId`:

```json
{ "error": { "code": "…", "message": "…", "details": { }, "requestId": "…" } }
```

**Every route declares only the errors it can actually produce**, via `errs(...)` from [responses.ts](src/core/http/responses.ts). Do not paste all eight.

**A 500 is never silent.** `resolveLogger` falls back to a standalone logger because errors thrown *before* the container middleware leave the context bare.

---

## 8. Pagination

**Cursor is the default for every list endpoint.** Offset is offered only where a numbered page control is a genuine product requirement — internal admin tables, mostly.

The offset drift bug is not hypothetical: user loads page 1 (rows 1–20), a row is inserted at the top, page 2 (`OFFSET 20`) shows the old row 20 **twice** and skips what becomes row 41. That is the default behaviour of every `OFFSET`-paginated feed under write load.

**Both strategies live on one endpoint**, selected by query parameter. `page` present → offset; absent → cursor. See the reasoning at [user.routes.ts:16](src/modules/user/user.routes.ts:16) — `z.union()` cannot be lowered into a valid OpenAPI parameter list, so it is one flat object with `page` as the mode switch, and `page` must stay `.optional()` with **no** `.default()`.

**Guardrails:**

- Clamp `limit` server-side — `.max(100)`. `limit=1000000` gets a `422`, not an OOM.
- **Never trust a cursor.** It is user input; validate on decode ([helper.ts:15](src/core/pagination/helper.ts:15)) and throw `ValidationError` on anything malformed.
- Cursors are base64url-encoded JSON — **encoding, not encryption.** Never put a secret in a cursor. If a field must not be exposed, do not include it.
- **Sort keys must be indexed.** An unindexed `sort=name` is a table scan wearing a query parameter's clothes. Whitelist sortable columns with `z.enum()` and give each an index.
- The keyset predicate needs a composite index on the exact ordering tuple — `users_cursor_idx` on `(createdAt, id)` ([users.ts:31](src/db/schema/users.ts:31)). Adding a cursor-paginated table without this index is a performance bug shipped on day one.
- The cursor tuple must be **unique and ordered**. `createdAt` alone is not unique; `(createdAt, id)` is.
- Fetch `limit + 1` to detect `hasNextPage`; trim in the service, not the repository.
- Offset `count` and `page` queries **must share one predicate**, or `totalPages` disagrees with reality and the last page renders empty.
- Cursor responses set an RFC 8288 `Link` header ([link-header.ts](src/core/pagination/link-header.ts)); it is exposed through CORS.
- Services take `OffsetParams` / `CursorParams`, **not** the HTTP query type. Depending on `OffsetQuery` would force the route to invent `sort`/`order` values the service never uses.

---

## 9. Authentication & authorization

**One `Principal` type** ([auth/principal.ts](src/auth/principal.ts)) describes who is making a request. Today only `kind: 'user'` exists — a human signed in through Better Auth.

`requireAuth` is a hard gate; `optionalAuth` is a soft gate that never rejects. A `401` **must** carry the RFC 6750 `WWW-Authenticate` challenge — [auth.ts:47](src/core/middleware/auth.ts:47).

Session tokens arrive by cookie **or** `Authorization: Bearer` — the `bearer()` plugin plus passing raw headers to `getSession` covers both in one call, which is what makes mobile and CLI clients work.

**Scopes vs roles:**
- **Scopes** answer *what may this credential do?* They live on the token.
- **Roles** answer *what is this person?* They live on the user.
- The effective permission is the **intersection**.

Today every human gets `scopes: ['*']` and roles gate them. The role vocabulary is closed — a Postgres enum, `USER_ROLES` in [users.ts](src/db/schema/users.ts) — and holds exactly `gym_owner` and `player`; `player` is the default. `role` is declared in Better Auth's `user.additionalFields`, which is what puts it on the session for [auth.ts](src/core/middleware/auth.ts) to read and what accepts it in the sign-up body (`POST /api/auth/sign-up/email`); omitting it yields a `player`.

> **Sign-up is self-service and unauthenticated, so anyone can register as `gym_owner`.** Better Auth compiles a literal-array field type to `z.any()`, so the *vocabulary* is enforced by the `databaseHooks.user.create.before` hook in [better-auth.ts](src/auth/better-auth.ts) — but nothing enforces *entitlement*. Before `gym_owner` gates anything a player must not reach, gate the claim itself: an invite code, a verification step, or an admin-only promotion route. `Principal.roles` stays plural against the day a user holds more than one.

**Resource-level authorization belongs in the service.** Middleware cannot answer *"may this user edit **this** post?"* — that needs the row. Route middleware handles **coarse** access (`requireScopes('users:read')`); **fine-grained** ownership checks live in the service, where the data is.

> **Out of scope for this standard, deliberately:** API keys, `kind: 'service'` machine principals, and idempotency keys. The commented-out scaffolding in `container.ts`, `principal.ts`, and `middleware/auth.ts` is a placeholder, not a plan. Do not document, wire, or rate-limit them until there is a real caller. When that day comes, uncomment all three sites together.

---

## 10. Rate limiting *(standard — not yet wired)*

Rate limiting is part of the standard. This section is normative for the implementation when it lands; nothing here is live today.

### 10.1 Placement (RL1)

**Rate limiting runs after `container` and before `requireAuth`.**

- **After container** because it needs the KV binding.
- **Before auth** because otherwise an attacker exhausts the database with token-verification queries before the limiter ever sees them.
- **After `accessLog`**, so rejected requests still produce an `http.request` log line at `warn`.

Unauthenticated traffic is keyed on IP. Once a principal is identified, expensive protected routes may carry a second, per-principal limiter applied at the route level.

### 10.2 Mechanism (RL2)

Fixed-window counter in Workers KV. Simple and adequate for this API.

- Key: `` `rl:${path}:${identity}:${window}` ``
- `identity` = `principal.id` ?? `cf-connecting-ip` ?? `'anonymous'`
- `window` = `Math.floor(Date.now() / 1000 / windowSeconds)`
- TTL = `windowSeconds + 60`
- The increment is fire-and-forget via `c.executionCtx.waitUntil()` — never block the response on it.

**This is not atomic, and that is an accepted trade.** Two concurrent requests can both read `4` and both write `5`; under contention users get slightly more than their quota. If exactness ever matters — billing, abuse prevention — move that specific limiter to a Durable Object with a single-threaded counter. Do not pretend KV is atomic.

### 10.3 Response contract (RL3)

Every rate-limited response — success **and** rejection — carries:

| Header | Meaning |
| --- | --- |
| `X-RateLimit-Limit` | the quota for this window |
| `X-RateLimit-Remaining` | `max(0, limit − used)` |
| `X-RateLimit-Reset` | unix seconds when the window rolls |

On rejection, additionally `Retry-After` (seconds), and the response is `RateLimitError` → `429 RATE_LIMITED` with `details.resetAt`. It flows through the normal error envelope — no special-casing in the middleware.

All three headers are already in the CORS `exposeHeaders` list ([cors.ts:21](src/core/middleware/cors.ts:21)), so browser clients can read them. Keep them there.

### 10.4 Declaration (RL4)

**A rate-limited route must declare `429` in its `errs(...)` list.** [user.routes.ts:78](src/modules/user/user.routes.ts:78) already does — it is forward-declared ahead of the implementation, which is fine, but the route is not actually limited yet. Reconcile the two when RL lands: either the limiter is applied or the `429` comes out.

### 10.5 Budgets (RL5)

Limits are policy, declared at the route, never buried in the middleware. Starting budgets:

| Traffic class | Key | Budget |
| --- | --- | --- |
| Unauthenticated (global) | IP | 60 / minute |
| Authenticated reads | principal id | 300 / minute |
| Authenticated writes | principal id | 60 / minute |
| Auth endpoints (`/api/auth/sign-in`, `/sign-up`, password reset) | IP | 10 / 15 minutes |

Auth endpoints are the ones that matter — they are the credential-stuffing surface, and they sit *outside* `requireAuth`, so IP is the only key available.

### 10.6 Wiring checklist (RL6)

Rate limiting is not "done" until all of these are true:

1. `RATE_LIMIT_KV` uncommented in [wrangler.jsonc](wrangler.jsonc) with a real namespace id, per environment.
2. `kv.rateLimit` exposed on the container ([container.ts:45](src/container.ts:45) — currently commented out).
3. `RATE_LIMIT_KV` present on `RawBindings` in [env.ts](src/env.ts). It stays out of `EnvSchema` — Zod cannot describe a KV namespace; that is exactly why `RawBindings` is separate.
4. `core/middleware/rate-limit.ts` created, exporting a `rateLimit(opts)` factory.
5. Mounted in the pipeline per RL1, and declared per RL4.
6. `429` never leaks whether an identity exists. The rejection for an unknown IP and a known principal must be indistinguishable.

---

## 11. Observability

Every incident reduces to three questions; instrumentation exists to answer them in under a minute.

1. **Is it broken?** → error rate, `5xx` count, `/health`.
2. **What is broken?** → structured logs filtered by `code` and `path`.
3. **Why is it broken?** → the `requestId` from the user's screenshot.

**Correlation.** The `requestId` must appear in: every log line (via the child logger), every error response body, the `X-Request-Id` response header, and any outbound HTTP call a service makes. That is the entire tracing story for a system this size. **Do not reach for OpenTelemetry until there is more than one service.**

**Logs are single-line JSON** ([logger.ts:30](src/core/logger.ts:30)) — parseable by any aggregator. Bind context with `.child()` rather than repeating fields; [auth.ts:51](src/core/middleware/auth.ts:51) is the pattern.

**The minimum viable event set:**

```
logger.info ('http.request',      { method, path, status, durationMs, principalId })
logger.warn ('app.error',         { code, status, path })
logger.error('unhandled.error',   { message, stack, name })
logger.info ('db.slow_query',     { durationMs, table })   // > 100ms
logger.info ('auth.failed',       { reason, ip })          // never the token
```

**Redaction (RL-adjacent, but non-negotiable).** Maintain an explicit denylist and assume every log line is eventually read by someone who should not see secrets: `password`, `passwordHash`, `token`, `secret`, `secretHash`, `authorization`, `cookie`, `apiKey`, `sessionToken`. *Not yet implemented in [logger.ts](src/core/logger.ts) — add it before the first non-trivial log volume.*

---

## 12. Configuration, migrations, deployment

**Fail fast, fail loudly.** `parseEnv` throws on the first bad value with a flattened, greppable message ([env.ts:38](src/env.ts:38)). A misconfigured worker returns `500` immediately — it never limps along and fails mysteriously three layers deep.

`EnvSchema` describes only what Zod *can* describe. Non-serializable Cloudflare bindings (KV, R2, DO) live on `RawBindings` and are never parsed.

**`wrangler.jsonc` var names must match `EnvSchema` exactly.** `ENVIRONMENT` accepts `development | preview | production` — `"staging"` is not a value, which is why the staging environment sets `preview` ([wrangler.jsonc:39](wrangler.jsonc:39)).

**Migrations are generated, reviewed, committed, and applied by CI — never `db:push` against production.** `drizzle-kit push` diffs and applies with no audit trail and no down migration. It is how you drop a column at 3am. `db:generate` → commit the SQL → `db:migrate` in CI only.

**Expand / contract, always, for zero-downtime schema change:**

1. **Expand** — add the new nullable column; write to *both*; read from the *old*. Safe to roll back.
2. **Backfill** — populate existing rows in batches.
3. **Migrate reads** — read from the new column. Verify.
4. **Contract** — stop writing the old column; drop it.

Never combine expand and contract in one deploy: during a rolling deploy both worker versions serve traffic simultaneously, and a dropped column makes the old version throw.

**Delete [db/pool.ts](src/db/pool.ts).** It is a second `createContainer` that shadows the real composition root, holds module-level mutable state (`let _pool`), and returns nothing. It contradicts P1, S1, and §5. The pooled/WebSocket driver is only needed for interactive transactions — bring it back deliberately, inside the real container, on the day that requirement appears (decision D5).

---

## 13. Enforcement

A rule that is not mechanised is a suggestion.

**Already enforced** — [eslint.config.ts](eslint.config.ts):
- `import/no-restricted-paths`: R3 (`core` ⊬ `modules`), R2 (services ⊬ `db` except `db/schema`), routes ⊬ repositories.
- `check-file`: kebab-case filenames and module folders; `*.service.ts` naming.

**To add:**

| Check | Enforces |
| --- | --- |
| `grep -rE "\b(Context\|c\.req\|c\.json\|HTTPException)\b" src/modules/**/*.service.ts` → must be empty | P5, layer contract |
| `no-restricted-syntax` banning `let` at module scope | S1 |
| `@typescript-eslint/no-unused-vars` as `error` | dead code (`extractBearer`, `isUser` today) |
| `tsc --noEmit` in CI | the whole chain of truth |
| Review checklist: every `.openapi({ example })` has `satisfies` | SC3 |
| Review checklist: every `.extend()` only re-types existing keys | SC2 |

**`tsconfig.json` gaps** ([tsconfig.json](tsconfig.json)):

- `"paths": { "@/*": ["./src/*", "./src/core/*", "./src/db/*"] }` is **ambiguous** — `@/types` could resolve to `src/types.ts` or `src/core/types.ts`. Every import in the codebase already writes the full path (`@/core/types`, `@/db/schema`), so the extra roots buy nothing and cost determinism. Reduce to `"@/*": ["./src/*"]`.
- `"types": ["node"]` but this is a Workers runtime — should include `@cloudflare/workers-types` (the dependency is installed).
- `exactOptionalPropertyTypes` is off; the reference architecture recommends it.
- `noUncheckedIndexedAccess: true` is on — **keep it.** It is the highest-value flag here, and [user.repository.ts:49](src/modules/user/user.repository.ts:49) shows exactly why: it forces `totalRows[0]?.value ?? 0` instead of a `!` that would crash on the one shape TS was warning about.

---

## 14. Adding a module — the recipe

1. `src/db/schema/<thing>.ts` — the table. Property names equal column names (SC5). Add the `(createdAt, id)` cursor index if it will be listed. Export from the barrel.
2. `bun run db:generate` — review the SQL, commit it.
3. `src/modules/<thing>/<thing>.schema.ts` — `createSelectSchema` / `createInsertSchema`, `.omit()`/`.pick()` only (SC2), typed example (SC3/SC4), one `toPublicX` mapper (SC6), inferred types (SC7).
4. `<thing>.repository.ts` — Drizzle only. Returns rows or `null`. No throws. Shared `notDeleted` predicate.
5. `<thing>.service.ts` — business rules, domain errors, transaction boundaries. Zero HTTP.
6. `<thing>.routes.ts` — `createRoute` definitions, `security`, per-route `middleware`, `responses` (**plural** — `response` is silently accepted as a spec extension and then ignored), `errs(...)` for only the errors it can produce.
7. `index.ts` — the barrel. This is the module's public surface (R4).
8. `container.ts` — wire repo, then service.
9. `app.ts` — `app.route('/v1', <thing>Routes)`. **Mounting is what puts routes in `/openapi.json`** — a route defined but never mounted is invisible to both the router and the docs.
10. Verify `/docs` renders and `/openapi.json` contains the new paths.

---

## 15. Decision log

Deltas and confirmations against the reference architecture. Record decisions with rationale so future-you can tell a deliberate choice from an accident.

| # | Decision | Rationale | Revisit when |
| --- | --- | --- | --- |
| D1 | No DI container; explicit composition root | Shallow graph; ephemeral isolates; legibility | Graph exceeds ~30 nodes |
| D2 | Factory functions over classes | Structural typing; no `this` hazards; tree-shakeable | Team standardises on OO |
| D3 | Repository/service types via `ReturnType` | No drift, no double maintenance | A second implementation appears |
| D4 | Cursor pagination by default | Offset drifts under concurrent writes; `O(p·n)` | Never — offset is offered *alongside* |
| D5 | `neon-http` driver | Stateless, safe to build per request | Interactive transactions required → WebSocket + pooling |
| D6 | Throw domain errors; translate at the edge | Services must run without HTTP (P5) | Consider `Result<T,E>` — but decide *now*, migrating is painful |
| D7 | Modules as vertical slices | Deletable units; one folder per feature | Never |
| **D8** | **Better Auth owns `/api/auth/*`; its spec is merged into ours at request time** | Hand-written OpenAPI for library routes drifts on every upgrade | Never |
| **D9** | **Auth endpoints are docs-filtered by an explicit allowlist** | ~30 generated endpoints bury the handful the frontend calls. *Docs-only — every route stays live* | An endpoint needs actually disabling → gate it in `auth/routes.ts` |
| **D10** | **`satisfies` on every OpenAPI example (SC3)** | The one hole in the chain of truth; produced the `avatarUrl`/`image` drift | Never |
| **D11** | **No reusable variables (S1)** | A file is read once, top to bottom. Scroll-back is the tax every future reader pays | Never |
| **D12** | **Rate limiting: KV fixed window, IP before auth, principal after** | Adequate and cheap; protects the DB from token-verification floods | Exactness required → Durable Object |
| **D13** | **API keys / service principals deferred** | No caller exists. Config for unbuilt modules fails every request at boot | A real machine caller appears |
