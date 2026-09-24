# Framework & Request Flow Guide

> **Auth status:** 🚧 Auth is **NOT implemented yet**. The users APIs are open — `verifyAccessToken`, `verifyRefreshToken`, `checkPermission` and `rateLimiter` exist in the framework but are **not mounted on any route**. They will be wired up in the next milestone.

---

## 1. Framework files — what they do and where they are used

### `src/framework/config/`
| File | Role | Used by |
|---|---|---|
| `env.ts` | Zod-validated environment (secrets, port, cors) — crashes fast on misconfig | everything: `prisma.ts`, `logger.ts`, `jwt.ts`, `app.ts` |
| `prisma.ts` | Single shared `PrismaClient` (hot-reload safe) | every **repository** |
| `logger.ts` | Pino logger: pretty console in dev, JSON in prod | `errorHandler.ts`, `index.ts` |

### `src/framework/utils/` (pure helpers — no Express request handling)
| File | Role | Used by |
|---|---|---|
| `AppError.ts` | Operational error class: `message` + `statusCode` + `details` | **services** (`throw new AppError(...)`) |
| `response.ts` | Uniform response envelope: `success` / `created` / `error` / `paginated` | **controllers**, **middleware** (401/403/404/413/422/429) |
| `jwt.ts` | Sign/verify access + refresh JWT | **services** (issue), **auth middleware** (verify) — later milestone |
| `password.ts` | argon2id hash/verify + anti-enumeration `burn()` + sha256 `tokenHash` | auth services — later milestone |
| `pagination.ts` | Keyset params (`cursor`, `limit`), `keyset()` → `{take, cursor}`, `buildCursorMeta()` | **users service/validator** |

### `src/framework/middleware/` (runs between request and controller)
| File | Role | Mounted where |
|---|---|---|
| `requestId.ts` | Attaches/propagates `X-Request-Id` | **globally** in `app.ts` |
| `notFound.ts` | 404 for unknown routes | **globally**, last, after routers |
| `errorHandler.ts` | Central error handler: AppError → status, 413, 500 fallback | **globally**, last |
| `asyncHandler.ts` | Wraps async controller handlers → errors to `errorHandler` | **inside controllers** |
| `zodValidate.ts` | Validates `req.body` → 422 | **routes** (PATCH/POST) |
| `zodValidateQuery.ts` | Validates `req.query` → 422 + replaces query | **routes** (list endpoints) |
| `zodValidateParams.ts` | Validates `req.params` → 422 | **routes** (`/:id`) |
| `verifyAccessToken.ts` | JWT (cookie/Bearer) + user status → `req.user` | 🔓 **not mounted yet** |
| `verifyRefreshToken.ts` | Hashed refresh lookup → `req.refreshPayload` | 🔓 **not mounted yet** |
| `checkPermission.ts` | RBAC check (60s cache) → 403 | 🔓 **not mounted yet** |
| `rateLimiter.ts` | Per-endpoint limits → 429 | 🔓 **not mounted yet** |

> The three `zodValidate*` middlewares return **422** (not 400) so API clients can distinguish "malformed request" from "bad business data" and handle field errors uniformly via `response.error(res, ..., 422, errors)`.

---

## 2. Module layers (users module as the example)

| File | Role |
|---|---|
| `users.validator.ts` | Zod schemas for query/params/body |
| `user.repository.ts` | **ONLY file touching `prisma`** — thin DB queries, no rules |
| `users.service.ts` | Business rules — checks, `AppError`, pagination math |
| `users.controller.ts` | Marshals req → service → `response.*` (handlers wrapped in `asyncHandler`) |
| `users.routes.ts` | Route definitions + middleware chain, exports the `Router` mounted in `app.ts` |

**Dependency rule (one-way):** routes → controller → service → repository → prisma. No layer reaches backward.

---

## 3. Full request lifecycle (GET /api/users?limit=10)

```
Client
  │  HTTP GET /api/users?limit=10
  ▼
app.ts (global middleware, in order)
  ├─ helmet           → security headers
  ├─ cors             → allows origin (credentials on)
  ├─ express.json()   → parses body (not needed here)
  ├─ cookieParser     → parses cookies
  └─ requestId        → generates X-Request-Id, stored in req.requestId + header
  │
  ▼
Route matched: GET /api/users   → usersRoutes
  │
  ├─ zodValidateQuery(listUsersQuerySchema)
  │     · parses + validates ?limit=10 (limit coerced to number 10, default if absent)
  │     · on failure → 422 {success:false, message, errors:{field:[...]}}  ← STOPS HERE
  │     · on success → replaces req.query with validated/normalized object
  ▼
usersController.list   (wrapped in asyncHandler)
  │
  │   reads req.query → { limit: 10, cursor: undefined, ... }
  ▼
usersService.list({ limit, cursor, search?, status?, role_id? })
  │
  │   1. keyset({limit: 10})          → take = limit + 1 = 11
  │   2. call repository.findMany({take, cursor, ...})
  │   3. slice rows back to 10, compute nextCursor (base64 of last id)
  ▼
userRepository.findMany(...)
  │     builds Prisma query: where + take + cursor + orderBy(id) + select (NO password)
  ▼
Prisma → PostgreSQL (users joined with roles)
  │
  │     ↺ ...and the response travels back UP the same path ...
  ▼
repository returns raw rows (max 11, hasMore probe row)
  ▼
service computes { rows: 10, meta: { count: 10, nextCursor: "NQ" } }
  ▼
controller calls response.paginated(res, rows, meta)
  ▼
JSON envelope sent to client:
{
  "success": true,
  "message": "Success",
  "data":  [ { id, email, status, role_id, created_at, updated_at, roles: { name } }, ... ],
  "meta":  { "count": 10, "nextCursor": "..." }
}
```

### Why `take = limit + 1`?
Fetch one extra row as a "has more" probe. If 11 rows come back → there IS a next page → slice to 10 and expose `nextCursor` (base64 of the last row's `id`). If only ≤10 rows → no `nextCursor`. This is **keyset pagination**: no per-request `COUNT`, stable under inserts — passes `cursor=<nextCursor>` to fetch the next page.

### Error path (the other branch)
```
any layer throws / fails
  │   validation fail (422)  → zodValidate* replies directly, request stops
  │   unknown route          → notFound (404)
  │   AppError               → errorHandler: response.error(res, msg, statusCode)
  │   Prisma P2025 (missing) → service converts to AppError 404
  │   anything else          → errorHandler logs + response.error(res, ..., 500)
```

---

## 4. Curl examples (no auth required — open APIs)

```bash
# health
curl -s http://localhost:3000/health | jq

# list users (keyset, default limit 10)
curl -s "http://localhost:3000/api/users?limit=10" | jq

# page 2  → copy meta.nextCursor from the previous response
curl -s "http://localhost:3000/api/users?limit=10&cursor=NQ" | jq

# filters: search by email + status, small limit
curl -s "http://localhost:3000/api/users?search=user&status=active&limit=5" | jq

# get user by id
curl -s http://localhost:3000/api/users/1 | jq

# update user (email / status / role_id only — no password)
curl -s -X PATCH http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive"}' | jq

# delete user (then GET again → 404)
curl -s -X DELETE http://localhost:3000/api/users/999999 | jq

# validation failure → 422
curl -s -X PATCH http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"bogus"}' | jq

# unknown route → 404 envelope
curl -s http://localhost:3000/api/nope | jq
```

---

## 5. What changes when auth lands (next milestone)

- `POST /api/auth/register` + `POST /api/auth/login` issue JWT access/refresh tokens (httpOnly cookies + Bearer)
- `verifyAccessToken` mounted on protected routers → populates `req.user` (userId, email, role)
- `checkPermission("manage_users")` added to mutation routes → RBAC enforces SuperAdmin/Admin only
- `rateLimiter` added to auth endpoints (login 10/min, register 5/hr)
- `users` list/get become admin-only; owner-only rules applied to update/delete
- Password handling (hash/verify, refresh rotation) moves from plain DB writes into the auth service