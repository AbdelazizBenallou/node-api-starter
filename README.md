# node-api-starter

> Clean layered REST API for a users module — **auth milestone pending**.
> Express 5 · TypeScript · Prisma 6 · PostgreSQL · Zod · argon2 · JWT · Pino

## Tech stack
- **Runtime:** Node.js ≥ 20 (ESM + TypeScript, `tsx` dev runner)
- **HTTP:** Express 5 with helmet, cors, cookie-parser
- **DB/ORM:** PostgreSQL + Prisma 6 (CLI & client pinned to 6.12.0)
- **Validation:** Zod (env, body, query, params → 422)
- **Security:** argon2id password hashing, JWT access/refresh, RBAC (permission check with 60s cache), rate-limiters
- **Logging:** Pino (pretty console in dev)
- **API shape:** uniform envelope `{ success, message, data? }` / `paginated` returns `meta { count, nextCursor }`

## Requirements
- Node.js ≥ 20 (`node -v`)
- PostgreSQL running locally (`psql --version`)

## 1. Setup & environment

```bash
git clone https://github.com/AbdelazizBenallou/node-api-starter.git
cd node-api-starter
npm install

cp .env.example .env
# then edit .env: real DATABASE_URL + strong random ACCESS_SECRET / REFRESH_SECRET
```

Generate random secrets:
```bash
openssl rand -base64 48   # use the output for ACCESS_SECRET
openssl rand -base64 48   # and REFRESH_SECRET
```

## 2. Create the PostgreSQL database

As the postgres superuser:
```bash
sudo -u postgres psql -d postgres
```
```sql
CREATE USER api_user WITH PASSWORD 'your-strong-password';
ALTER USER api_user CREATEDB;       -- Prisma needs it to create the migrations table
```
```bash
# as api_user, connect and create the database:
psql -h localhost -U api_user -d postgres -W
```
```sql
CREATE DATABASE users_api;
```
```bash
# Postgres 15+ restricts CREATE on schema public to its OWNER — grant it:
sudo -u postgres psql -d users_api
```
```sql
ALTER DATABASE users_api OWNER TO api_user;
GRANT ALL ON SCHEMA public TO api_user;
```

Your `.env`:
```
DATABASE_URL=postgresql://api_user:your-strong-password@localhost:5432/users_api
```

## 3. Prisma — generate, migrate, seed

```bash
npm run db:generate   # prisma generate
npm run db:migrate    # prisma migrate dev  (creates tables + migration history)
npm run db:seed       # seeds 3 roles, 3 permissions, 5 test users
```

Seed users (all passwords `Test@12345`):
| email | role |
|---|---|
| `superadmin@example.com` | SuperAdmin |
| `admin@example.com` | Admin |
| `user1@example.com` / `user2` / `user3` | Normal |

## 4. Run

```bash
npm run dev
```
Server: `http://localhost:3000` · Health: `GET /health`

## 5. Test with curl

> 🔓 **Auth is not implemented yet** — all endpoints below are open. Login/refresh/jwt middleware land in the next milestone.

```bash
# list users (keyset)
curl -s "http://localhost:3000/api/users?limit=10" | jq

# next page  (use meta.nextCursor from the previous call)
curl -s "http://localhost:3000/api/users?limit=10&cursor=<NEXT_CURSOR>" | jq

# filters
curl -s "http://localhost:3000/api/users?search=user&status=active&limit=5" | jq

# get one
curl -s http://localhost:3000/api/users/1 | jq

# update (email / status / role_id)
curl -s -X PATCH http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" -d '{"status":"inactive"}' | jq

# delete
curl -s -X DELETE http://localhost:3000/api/users/3 | jq

# validation → 422
curl -s -X PATCH http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" -d '{"status":"bogus"}' | jq

# unknown route → 404
curl -s http://localhost:3000/api/nope | jq
```

## Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/health` | health check |
| GET | `/api/users?limit=&cursor=&search=&status=&role_id=` | list (keyset) |
| GET | `/api/users/:id` | get user (+ role, profile) |
| PATCH | `/api/users/:id` | update email/status/role_id |
| DELETE | `/api/users/:id` | delete user |

## Scripts
| Script | Action |
|---|---|
| `npm run dev` | dev server (nodemon + tsx) |
| `npm run build` / `start` | compile to `dist/` / run production build |
| `npm run lint` / `format` | ESLint / Prettier |
| `npm run db:generate` / `db:migrate` / `db:push` / `db:seed` | Prisma tooling |

## Project structure
```
src/
  framework/          # shared infra: config, middleware, utils
  modules/            # feature modules (users, auth, profiles…)
    <module>/         # validator → repository → service → controller → routes
prisma/
  schema.prisma       # Prisma models
  migrations/         # SQL migration history
doc/                  # setup guide + request-flow guide
```

## Docs
- `doc/setup-and-framework.md` — full setup + framework file roles
- `doc/framework-and-flow.md` — file usage map, HTTP request lifecycle, curl walkthrough