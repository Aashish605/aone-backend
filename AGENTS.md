# Backend — AGENTS.md

## Tech Stack
- Node.js + Express (ES Modules, `"type": "module"`)
- Sequelize ORM + PostgreSQL
- Auth: JWT (jsonwebtoken + bcryptjs)

## Project Structure
```
config/env.config.js       — .env loader (port, DB, JWT)
config/db.config.js        — Sequelize + PostgreSQL connection
controllers/               — Route handlers (business logic)
docs/PROJECT_OVERVIEW.md   — Full developer documentation
middlewares/
  auth.middleware.js       — JWT verify (authenticate) + role guard (authorize)
  error.middleware.js      — Global error formatter
models/
  index.js                 — Sequelize init + exports
  user.model.js            — User (id, name, email, password, role)
routes/
  index.js                 — Mounts all route groups under /api
  auth.routes.js           — POST /auth/register, /auth/login, GET /auth/me
utils/
  AppError.js              — Custom error classes (see below)
  catchAsync.js            — Async handler wrapper
validators/                — express-validator rules
  auth.validator.js        — registerRules, loginRules
```

## Request Flow
```
Request → auth middleware → validator → controller (wrapped in catchAsync) → Success Response
                                                ↓ error
                                        error.middleware.js → Error Response
```

## Error Handling — AppError (utils/AppError.js)
Throw these **instead of** `res.status().json()`:

| Class              | HTTP | When to use                                     |
|--------------------|------|--------------------------------------------------|
| `NotFoundError`    | 404  | Resource not found by ID/query                   |
| `UnauthorizedError`| 401  | Missing/invalid token, bad credentials           |
| `ForbiddenError`   | 403  | User lacks required role                         |
| `ValidationError`  | 400  | express-validator failed (pass `errors[]`)       |
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
- Always include **`.js` extension** in local import paths
- Wrap **every** async route handler with `catchAsync` (eliminates try/catch)
- Throw `AppError` on failures — never use `res.status().json()` for errors
- Success response shape: `{ success: true, data, message }`
- Error response shape: `{ success: false, message, errors? }`
- Validate input in `validators/` files before controller logic
