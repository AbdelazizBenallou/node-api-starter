# API-2 (users-api) — Setup & Framework Guide

## 1. Create the folder structure
```bash
mkdir -p \
  src/framework/config \
  src/framework/middleware \
  src/framework/utils \
  src/modules/auth \
  src/modules/users \
  src/modules/profiles \
  prisma \
  doc
```

## 2. Create the files (empty placeholders)
```bash
touch .env.example .gitignore package.json tsconfig.json eslint.config.js .prettierrc \
  prisma/schema.prisma prisma/seed.ts src/index.ts src/app.ts \
  src/framework/config/env.ts src/framework/config/prisma.ts src/framework/config/logger.ts \
  src/framework/middleware/asyncHandler.ts src/framework/middleware/requestId.ts \
  src/framework/middleware/errorHandler.ts src/framework/middleware/notFound.ts \
  src/framework/middleware/zodValidate.ts src/framework/middleware/zodValidateQuery.ts \
  src/framework/middleware/zodValidateParams.ts src/framework/middleware/verifyAccessToken.ts \
  src/framework/middleware/checkPermission.ts src/framework/middleware/rateLimiter.ts \
  src/framework/utils/AppError.ts src/framework/utils/response.ts src/framework/utils/jwt.ts \
  src/framework/utils/password.ts src/framework/utils/pagination.ts \
  src/modules/auth/auth.validator.ts src/modules/auth/auth.repository.ts \
  src/modules/auth/auth.service.ts src/modules/auth/auth.controller.ts src/modules/auth/auth.routes.ts \
  src/modules/users/users.validator.ts src/modules/users/user.repository.ts \
  src/modules/users/users.service.ts src/modules/users/users.controller.ts src/modules/users/users.routes.ts \
  src/modules/profiles/profiles.validator.ts src/modules/profiles/profiles.repository.ts \
  src/modules/profiles/profiles.service.ts src/modules/profiles/profiles.controller.ts src/modules/profiles/profiles.routes.ts
```

## 3. Package manifest (`package.json`)
Configures: name, ESM (`"type": "module"`), dependencies, devDependencies, npm scripts, Prisma seed hook.

**Runtime deps:** `@prisma/client` (ORM client) · `argon2` (password + token hashing) · `jsonwebtoken` (JWT sign/verify) · `cookie-parser` (auth cookies) · `cors` · `helmet` (security headers) · `express` (HTTP framework) · `dotenv` (env loading) · `pino` + `pino-pretty` (logging) · `rate-limiter-flexible` (rate limiting) · `zod` (validation)

**Dev deps:** `prisma` (CLI/migrations) · `typescript` · `tsx` (TS runner) · `nodemon` (dev reload) · `eslint` + `@eslint/js` + `typescript-eslint` (linting) · `prettier` (formatting) · `@types/*` (Node, Express, etc.)

```bash
# install everything
npm install
```

## 4. Align Prisma versions (+ audit fix)
Symbol mismatch caused `ERR_MODULE_NOT_FOUND`; fix is CLI + client on the **same** version.
```bash
npm install -D prisma@6.12.0
npm install @prisma/client@6.12.0
npm audit
```
Fallback if `deepmerge-ts` audit finding persists:
```json
"overrides": { "deepmerge-ts": "^2.0.0" }
```
Verify: `npx prisma --version` → both lines `6.12.0`.

## 5. TypeScript config (`tsconfig.json`)
`strict`, ESM (`module: Node16`), `outDir: dist`, `types: ["node"]`, includes `src`, `prisma`.

## 6. Lint + format config (`eslint.config.js`, `.prettierrc`)
Modern flat config (type-aware rules) + code-style rules, ignoring generated `dist`/`node_modules`/migrations.

## 7. Git ignore (`.gitignore`)
Excludes `node_modules`, `dist`, `.env*` (secrets stay local).

## 8. Environment (`.env` from `.env.example`)
`NODE_ENV`, `PORT`, `DATABASE_URL`, `ACCESS_SECRET`, `REFRESH_SECRET`, `ACCESS_EXPIRY`, `REFRESH_EXPIRY`, `CORS_ORIGINS`.

## 9. Create the database (reuse existing Postgres)
```bash
sudo -u postgres psql -d postgres
-- → CREATE USER users_api_user WITH PASSWORD '...' CREATEDB;
-- → \q
psql -h localhost -U users_api_user -d postgres -W
-- → CREATE DATABASE users_api; \q
sudo -u postgres psql -d users_api
-- → ALTER DATABASE users_api OWNER TO users_api_user;
-- → GRANT ALL ON SCHEMA public TO users_api_user; \q
```
(Postgres 15+ restricts `CREATE` on `public` to the DB owner → Prisma needs owner rights to create the `_prisma_migrations` table.)

## 10. Prisma schema + client (`prisma/schema.prisma`)
Models: `roles`, `permissions`, `role_permissions`, `users`, `profile`, `refresh_tokens` + enum `UserStatus`. Generator uses classic `prisma-client-js`.

### Migration commands
```bash
# Generate the Prisma Client (must run after any schema change)
npm run db:generate          # = npx prisma generate

# Create + apply the first migration (interactive, asks for --name)
npm run db:migrate           # = npx prisma migrate dev

# Apply migrations non-interactively in production
npx prisma migrate deploy

# (dev-only) Push schema without a migration file
npm run db:push              # = npx prisma db push

# Inspect the database / generated schema
npx prisma studio            # GUI browser at localhost:5555
npx prisma migrate status    # shows pending/applied migrations

# Apply the seed
npm run db:seed              # = npx prisma db seed
```
Effects: `db:migrate` creates `prisma/migrations/<timestamp>_<name>/migration.sql`, records it in the `_prisma_migrations` table in the DB (the migration audit trail), and generates the client in `node_modules/@prisma/client`.

## 11. Seed (`prisma/seed.ts` + `npm run db:seed`)
Seeds 3 roles (SuperAdmin, Admin, Normal) + 3 permissions + Admin/SuperAdmin role-permission links. **No test users inserted.** Seed needs `import "dotenv/config"` so the runtime sees `DATABASE_URL`.

## 12. Framework components + each file's role

### config/
| File | Role |
|---|---|
| `env.ts` | Zod-validated env config; fail-fast `process.exit(1)` on bad/missing vars; exports `env` + `corsOrigins` |
| `prisma.ts` | Single shared `PrismaClient` instance (no per-module connections) |
| `logger.ts` | Pino logger (pretty in dev, JSON in prod) |

### utils/ (pure helpers, no Express)
| File | Role |
|---|---|
| `AppError.ts` | Operational error class: `message` + `statusCode` + `isOperational` + optional `details` |
| `response.ts` | Uniform envelope: `success()` / `error()` / `paginated()` — all controllers reply through it |
| `jwt.ts` | Sign/verify access (15m) + refresh (7d) JWT, payload types |
| `password.ts` | argon2id hash/verify + dummy-hash `burn()` (anti user-enumeration) + `tokenHash` |
| `pagination.ts` | Offset (`page/limit`) + keyset (`cursor`) params + `buildCursorMeta` |

### middleware/
| File | Role |
|---|---|
| `asyncHandler.ts` | Wraps async controllers → errors forwarded to error handler |
| `requestId.ts` | `X-Request-Id` header (uuid or inbound) for correlation |
| `errorHandler.ts` | Central error middleware (AppError → status, 413, 500 fallback) |
| `notFound.ts` | 404 for unknown routes |
| `zodValidate.ts` | Body validation → 422, uniform error shape |
| `zodValidateQuery.ts` | Query validation → 422, normalizes remaining keys |
| `zodValidateParams.ts` | Path param validation → 422 |
| `verifyAccessToken.ts` | JWT from cookie/Bearer → checks `status=active` → sets `req.user` |
| `verifyRefreshToken.ts` | Validates hashed refresh token in DB (not revoked/expired) → `req.refreshPayload` |
| `checkPermission.ts` | RBAC: permission check against role (60s in-memory cache) → 403 |
| `rateLimiter.ts` | Per-endpoint rate limits (login 10/min, register 5/hr, …) → 429 |

Plus `src/framework/types/express.d.ts` — type augmentation for `req.user` / `req.requestId` / `req.refreshPayload`.