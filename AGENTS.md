# Backend — AGENTS.md

## Tech Stack
- Node.js + Express (ES Modules, `"type": "module"`)
- TypeScript (compiled via `tsc`, dev via `tsx`)
- **better-auth** (session-based auth via cookies/headers)
- Sequelize ORM + PostgreSQL (for future custom models)
- Auth: better-auth (email/password + OAuth: Google, GitHub, Discord, Apple, Microsoft)

## Project Structure
```
config/env.config.ts       — .env loader (port, DB, better-auth config)
config/db.config.ts        — Sequelize + PostgreSQL connection
auth/auth.ts               — better-auth configuration (providers, DB pool, user fields)
docs/PROJECT_OVERVIEW.md   — Full developer documentation
middlewares/
  session.middleware.ts    — better-auth session validation (requireSession)
  error.middleware.ts      — Global error formatter (AppError + Sequelize errors)
models/
  index.ts                 — Sequelize init + exports
routes/
  index.ts                 — Mounts custom route groups under /api
utils/
  AppError.ts              — Custom error classes (see below)
  catchAsync.ts            — Async handler wrapper
dist/                      — Compiled JS output (from `npm run build`)
```

## Request Flow
```
Request → better-auth handler (auto: /api/auth/*) → session middleware → controller → Success Response
                                                              ↓ error
                                                      error.middleware.ts → Error Response
```

## Authentication — better-auth
- **Session-based** (not JWT). `requireSession` middleware validates the session cookie/token.
- Auth routes are auto-handled by better-auth at `/api/auth/*`:
  - `POST /api/auth/register` — email/password signup
  - `POST /api/auth/login` — email/password login
  - `POST /api/auth/logout`
  - `POST /api/auth/forget-password` / `reset-password`
  - `GET /api/auth/session` — current session
  - `GET /api/auth/callback/*` — OAuth callbacks
  - Social sign-in via Google, GitHub, Discord, Apple, Microsoft
- Use `requireSession` from `middlewares/session.middleware.ts` to protect custom routes.

## Error Handling — AppError (utils/AppError.ts)
Throw these **instead of** `res.status().json()`:

| Class              | HTTP | When to use                                     |
|--------------------|------|--------------------------------------------------|
| `NotFoundError`    | 404  | Resource not found by ID/query                   |
| `UnauthorizedError`| 401  | Missing/invalid session, bad credentials         |
| `ForbiddenError`   | 403  | User lacks required role                         |
| `ValidationError`  | 400  | Validation failed (pass `errors[]`)              |
| `ConflictError`    | 409  | Duplicate resource (email, slug, etc.)           |
| `AppError` (base)  | any  | Extend for custom operational errors             |

## Response Format
All successful API responses follow this shape:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": { ... }
}
```

## Development Rules
- Use **`import`/`export`** (ESM) — never `require` or `module.exports`
- Always include **`.js` extension** in local import paths (TypeScript resolves to `.ts`)
- Wrap **every** async route handler with `catchAsync` (eliminates try/catch)
- Throw `AppError` on failures — never use `res.status().json()` for errors
- Success response shape: `{ success: true, data, message }`
- Error response shape: `{ success: false, message, errors? }`
- Protect custom routes with `requireSession` from `middlewares/session.middleware.ts`
- Source files are `.ts`; compiled output goes to `dist/`

## Scripts
| Command | Description |
|---|---|
| `npm run dev` | Hot-reload development with tsx |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled JS from `dist/` |
| `npm run typecheck` | TypeScript type-check without emitting |
