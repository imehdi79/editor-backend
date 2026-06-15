# Construct Editor — Backend

REST API for the **Construct Editor** 2D CAD floor-plan editor. Built with
**NestJS** on the **Fastify** adapter, persisting to **PostgreSQL** via **Prisma**.

The page document (`shapes` + `viewport`) is stored as an **opaque `jsonb` blob** —
the backend never reads or validates the inner CAD geometry. Walls already carry a
`height` field used by the (currently disabled) 3D view, and future per-shape/per-page
3D data drops in with **zero backend or migration changes**.

## Stack

- NestJS 11 + `@nestjs/platform-fastify` (`NestFastifyApplication`)
- PostgreSQL + Prisma (single `Project` table, `pages` is a `Json`/`jsonb` column)
- `class-validator` / `class-transformer` DTOs + global `ValidationPipe`
- Global `HttpExceptionFilter` → consistent `{ error: { message } }` envelope
- `@nestjs/config` for env

## Prerequisites

- Node 20+ (tested on 22)
- Docker (for the local Postgres) — or any reachable Postgres via `DATABASE_URL`

## Quick start

```bash
# 1. Install deps
npm install

# 2. Copy env (defaults already match docker-compose)
cp .env.example .env        # Windows: copy .env.example .env

# 3. Bring up Postgres
docker compose up -d

# 4. Apply the committed migration + generate the Prisma client
npx prisma generate
npm run prisma:deploy        # applies prisma/migrations (init + auth_ownership)
# (iterating on the schema later? use `npm run prisma:migrate` to author a new one)

# 5. (optional) Seed a demo user (demo@construct.dev / password123) + sample project
npm run db:seed

# 6. Run the API in watch mode
npm run start:dev
# → Construct Editor backend listening on http://localhost:8787
```

## Environment variables

| Var            | Default                                                                             | Purpose                                    |
| -------------- | ----------------------------------------------------------------------------------- | ------------------------------------------ |
| `PORT`           | `8787`                                                                              | HTTP port                                  |
| `CORS_ORIGIN`    | `http://localhost:5173`                                                             | Allowed origin(s), comma-separated         |
| `DATABASE_URL`   | `postgresql://construct:construct@localhost:5432/construct_editor?schema=public`    | Postgres connection string                 |
| `JWT_SECRET`     | `dev-secret-change-me`                                                              | HS256 signing secret — **change in prod**  |
| `JWT_EXPIRES_IN` | `7d`                                                                                | JWT lifetime (e.g. `15m`, `7d`)            |

## Wiring up the frontend

Point the Vite app at this server and switch the client to the HTTP implementation:

```bash
# frontend .env
VITE_API_URL=http://localhost:8787
```

```ts
// projectsApi.ts
export const projectsApi = new HttpProjectsApi(import.meta.env.VITE_API_URL);
```

The client hits `${VITE_API_URL}/projects`.

## API

### Auth

Project routes are **per-user** and require `Authorization: Bearer <jwt>`. Register or
log in to get a token; the JWT is valid for `JWT_EXPIRES_IN` (default 7 days).

| Method & path        | Body                   | Success                       | Notes                              |
| -------------------- | ---------------------- | ----------------------------- | ---------------------------------- |
| `POST /auth/register`| `{ email, password }`  | `201 { token, user }`         | `409` if email taken. Auto-logs in.|
| `POST /auth/login`   | `{ email, password }`  | `200 { token, user }`         | `401` on bad credentials.          |
| `GET /auth/me`       | —                      | `200 { userId, email }`       | Requires Bearer token.             |

`password` must be 8–72 chars; `user` is `{ id, email }` (the hash is never returned).

### Projects (all require Bearer token → `401` without one)

| Method & path             | Body      | Success                | Notes                                                                                              |
| ------------------------- | --------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| `GET /health`             | —         | `200 { ok: true }`     | Public.                                                                                             |
| `GET /projects`           | —         | `200 ProjectSummary[]` | The caller's projects, sorted `updatedAt` **desc**. No `pages`/`shapes`.                            |
| `GET /projects/recent`    | —         | `200 ProjectSummary[]` | Top `?limit=N` recents (default 10, max 50).                                                        |
| `GET /projects/:id`       | —         | `200 Project`          | Full doc ("load"). `404` when missing **or not owned** (client maps to `null`).                    |
| `PUT /projects/:id`       | `Project` | `200 Project`          | **Upsert** (owned by caller). `400` if body `id` ≠ path `:id`. Server sets `updatedAt = now`.       |
| `DELETE /projects/:id`    | —         | `204`                  | Idempotent — `204` even when absent; only deletes the caller's own.                                 |

Errors use a consistent envelope:

```json
{ "error": { "message": "Validation failed", "issues": ["name should not be empty"] } }
```

### curl examples

```bash
# Health (public)
curl http://localhost:8787/health

# Register (or login) and capture the token
TOKEN=$(curl -s -X POST http://localhost:8787/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"password123"}' | jq -r .token)

# Upsert (create or update) — id in body must match the path
curl -X PUT http://localhost:8787/projects/project-3 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "project-3",
    "name": "My Plan",
    "activePageId": "page-1",
    "createdAt": 1718000000000,
    "updatedAt": 0,
    "pages": [
      { "id": "page-1", "name": "Ground Floor",
        "viewport": { "x": 0, "y": 0, "scale": 1 },
        "shapes": { "wall-1": { "type": "wall", "x1": 0, "y1": 0, "x2": 400, "y2": 0, "thickness": 12, "height": 270 } } }
    ]
  }'

# List (recents first) / top-N recents / load one
curl -H "Authorization: Bearer $TOKEN" http://localhost:8787/projects
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8787/projects/recent?limit=5"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8787/projects/project-3

# Delete (idempotent)
curl -i -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:8787/projects/project-3
```

> Seeded demo login (after `npm run db:seed`): `demo@construct.dev` / `password123`.

### httpie examples

```bash
http POST :8787/auth/login email=me@example.com password=password123
# then pass the token via -A bearer -a <token>:
http -A bearer -a "$TOKEN" GET    :8787/projects
http -A bearer -a "$TOKEN" GET    :8787/projects/recent limit==5
http -A bearer -a "$TOKEN" PUT    :8787/projects/project-3 < project.json
http -A bearer -a "$TOKEN" DELETE :8787/projects/project-3
```

## Tests

```bash
npm run test:e2e
```

The e2e suite (Jest + `@nestjs/testing` + supertest) covers register/login, the
guard (`401` without a token), the full round-trip — **upsert → list/recent ordering
→ get → delete** — **per-user ownership isolation** (one user can't see/read another's
projects, `404` not `403` to avoid leaking), plus health, id-mismatch, and
`activePageId` validation. It overrides `PrismaService` with an in-memory fake, so
**no running Postgres is required** to run it.

## Project layout

```
src/
  main.ts                       # Fastify bootstrap, global pipe + filter + CORS
  app.module.ts                 # Config, Prisma, Auth, Projects modules
  common/http-exception.filter.ts
  health/health.controller.ts   # GET /health
  prisma/                       # PrismaModule + PrismaService
  auth/
    auth.module.ts              # PassportModule + JwtModule (async, env secret)
    auth.controller.ts          # POST /auth/register|login, GET /auth/me
    auth.service.ts             # bcrypt hash/compare, issues JWT
    jwt.strategy.ts             # passport-jwt — validates Bearer, sets req.user
    jwt-auth.guard.ts           # AuthGuard('jwt')
    current-user.decorator.ts   # @CurrentUser() -> { userId, email }
    dto/auth-credentials.dto.ts # email + password validation
  projects/
    projects.module.ts
    projects.controller.ts      # @UseGuards(JwtAuthGuard); routes scoped by user
    projects.service.ts         # Prisma upsert/list/recent/get/remove (where userId)
    projects.types.ts           # wire types (Project, ProjectSummary, Page)
    dto/
      upsert-project.dto.ts      # envelope validation only
      page.dto.ts                # shapes/viewport are pass-through @IsObject
      active-page.validator.ts   # activePageId must reference a page
prisma/
  schema.prisma                 # User + Project (pages = jsonb), Project.userId FK
  migrations/                   # init + auth_ownership
  seed.ts                       # demo user + one sample project (two pages)
docker-compose.yml              # local Postgres
```

## Auth & ownership design

- **Passwords** are hashed with bcrypt (`bcryptjs`, pure-JS — no native build).
  Login uses a constant-ish-time `bcrypt.compare`; the hash never leaves the server.
- **JWT** is signed with `JWT_SECRET` (HS256) and carries `{ sub: userId, email }`.
  `JwtStrategy` validates the `Authorization: Bearer` header and populates
  `request.user`; `@CurrentUser()` injects it into handlers.
- **Ownership** lives on `Project.userId` (FK → `User`, `onDelete: Cascade`). Every
  project query is scoped: `list`/`recent`/`get` filter `where: { userId }`, `upsert`
  sets `userId` on create and refuses to overwrite another user's id (returns `404`,
  no existence leak), and `delete` includes `userId` in its where-clause.
- **Adding roles/refresh tokens later** needs no route changes — extend the JWT
  payload and add a roles guard; the `@CurrentUser()` seam already isolates handlers
  from how the user is resolved.
```
