# Backend Project Overview

## 1. Introduction

A Node.js + Express REST API backend using ES Modules (`import`/`export`). It uses Sequelize ORM with PostgreSQL, JWT-based authentication, and a structured error-handling system built from reusable utilities.

**Key design decisions:**
- **ES Modules** over CommonJS (`"type": "module"` in package.json)
- **Sequelize** ORM for PostgreSQL (migrations-ready but currently using `sync()`)
- **Centralized error handling** via custom `AppError` classes + `catchAsync` wrapper
- **Flat folder structure** with clear separation: config / controllers / middlewares / models / routes / validators / utils

---

## 2. Request Lifecycle

Every request follows this pipeline:

```
  HTTP Request
       │
       ▼
  ┌─────────────────┐
  │  auth middleware │  ← Verifies JWT token (optional per route)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │   validator      │  ← express-validator rules (field checks)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │   controller     │  ← Business logic, wrapped in catchAsync
  └────────┬────────┘
           │
    ┌──────┴──────┐
    ▼              ▼
 Success         Error
    │              │
    ▼              ▼
 JSON response   error.middleware.js
                     │
                     ▼
                JSON error response
```

**Important:** Controllers never catch errors themselves. `catchAsync` captures any rejected promise and forwards it to `error.middleware.js`, which formats a consistent error response.

---

## 3. Folder Structure

```
backend/
├── config/
│   ├── env.config.js       # Loads .env via dotenv, exports { port, db, jwt }
│   └── db.config.js        # Creates and exports Sequelize instance
│
├── controllers/
│   └── auth.controller.js  # register, login, getMe handlers
│
├── docs/
│   └── PROJECT_OVERVIEW.md # This file
│
├── middlewares/
│   ├── auth.middleware.js   # authenticate (JWT verify), authorize (role check)
│   └── error.middleware.js  # Catches all errors, returns consistent JSON
│
├── models/
│   ├── index.js            # Initializes Sequelize, exports { sequelize, User }
│   └── user.model.js       # User definition (name, email, password, role)
│
├── routes/
│   ├── index.js            # Aggregator: mounts all route files under /api
│   └── auth.routes.js      # POST /auth/register, POST /auth/login, GET /auth/me
│
├── utils/
│   ├── AppError.js          # Custom error class hierarchy
│   └── catchAsync.js        # Async wrapper to eliminate try/catch
│
├── validators/
│   └── auth.validator.js   # express-validator rules for register/login
│
├── .env                     # Environment variables (gitignored)
├── .gitignore
├── AGENTS.md                # Concise onboarding for AI assistants
├── index.js                 # Express app entry point
├── package.json
└── reset-pg-password.ps1    # Utility script to reset PostgreSQL password
```

---

## 4. Error Handling System

### 4.1 AppError Classes (`utils/AppError.js`)

A hierarchy of operational errors that carry an HTTP status code and a `isOperational` flag. This distinguishes **known failures** (wrong password → 401) from **programming bugs** (undefined variable → 500).

```
Error
 └── AppError (base)
      ├── NotFoundError      (404)
      ├── UnauthorizedError  (401)
      ├── ForbiddenError     (403)
      ├── ValidationError    (400)
      └── ConflictError      (409)
```

| Class | HTTP | Constructor | When to throw |
|---|---|---|---|
| `NotFoundError` | 404 | `new NotFoundError('User')` → "User not found" | Resource doesn't exist |
| `UnauthorizedError` | 401 | `new UnauthorizedError('Bad credentials')` | Missing/invalid token, wrong password |
| `ForbiddenError` | 403 | `new ForbiddenError()` | User role lacks permission |
| `ValidationError` | 400 | `new ValidationError(errorsArray)` | express-validator rejected input |
| `ConflictError` | 409 | `new ConflictError('Email taken')` | Duplicate unique field |
| `AppError` | any | `new AppError('msg', 422)` | Custom operational error |

### 4.2 When to Throw vs Return

**DO throw AppError:**
```js
// Wrong credentials
throw new UnauthorizedError('Invalid email or password');

// Resource not found
throw new NotFoundError('User');

// Validation failed
const errors = validationResult(req);
if (!errors.isEmpty()) throw new ValidationError(errors.array());
```

**DO NOT throw for:**
- Success responses — always `res.status(200).json(...)`
- Server startup failures — `process.exit(1)` is fine here

**Success responses should always use this shape:**
```js
res.status(201).json({
  success: true,
  message: 'User registered successfully',
  data: { user, token },
});
```

### 4.3 catchAsync (`utils/catchAsync.js`)

```js
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

**What it does:** Wraps an async function so that any rejected promise automatically calls `next(error)`, which forwards to `error.middleware.js`.

**Why it's needed:** Without it, every async controller needs a try/catch block:
```js
// Without catchAsync — boilerplate in every function
const register = async (req, res, next) => {
  try {
    // ... logic
  } catch (err) {
    next(err);
  }
};

// With catchAsync — clean
const register = catchAsync(async (req, res) => {
  // ... logic (throw AppError on failure)
});
```

**Rule:** Every async route handler MUST be wrapped with `catchAsync`.

### 4.4 The Error Handler (`middlewares/error.middleware.js`)

The final destination for all errors. It:

1. **Logs** the error (stack trace in dev, minimal in production)
2. **Checks for AppError** — if `isOperational`, returns the known status/message
3. **Checks for Sequelize errors** — ValidationError → 400, UniqueConstraint → 409
4. **Falls back to 500** for unknown errors (programming bugs)

```js
// Operational error (thrown by us)
{ success: false, message: "Invalid email or password" }

// Sequelize validation error
{ success: false, message: "Validation error", errors: ["name is required"] }

// Unexpected bug
{ success: false, message: "Internal server error" }
```

### 4.5 Standard Response Format

All successful API responses follow a consistent envelope:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": { ... }
}
```

Responses for newly created resources use status `201`. Reads and updates use `200`.

---

## 5. Middlewares

### 5.1 auth.middleware.js

Two exported functions:

| Function | Purpose |
|---|---|
| `authenticate` | Reads `Authorization: Bearer <token>`, verifies JWT, finds user, sets `req.user` |
| `authorize(...roles)` | Returns middleware that checks `req.user.role` against allowed roles |

```js
// Protect a route — any authenticated user
router.get('/me', authenticate, getMe);

// Protect + restrict to admins
router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
```

Both functions throw `AppError` subclasses on failure (no raw `res.status().json()`).

### 5.2 error.middleware.js

Registered last in the Express middleware chain via `app.use(errorHandler)`. Processes all errors thrown or passed via `next(error)`.

---

## 6. Validators (`validators/`)

Validators use `express-validator` to define field-level rules that run **before** the controller. If validation fails, the controller throws a `ValidationError`.

```js
// Example rule set
const registerRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
];
```

**How it integrates:**
```js
router.post('/register', registerRules, register);
//                        ^^^^^^^^^^^^
//                      Rules run here, attach errors to req
```

The controller then checks `validationResult(req)`:
```js
const register = catchAsync(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array());
  }
  // ... safe to proceed
});
```

---

## 7. Controllers

Controllers contain the business logic. They follow a consistent pattern:

```js
const controllerName = catchAsync(async (req, res) => {
  // 1. Validate input (express-validator)
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new ValidationError(errors.array());

  // 2. Business logic (may throw AppError on failure)
  const result = await db.SomeModel.findByPk(req.params.id);
  if (!result) throw new NotFoundError('SomeModel');

  // 3. Success response
  res.status(200).json({
    success: true,
    data: result,
  });
});
```

**Key rules:**
- Always wrapped in `catchAsync`
- No try/catch blocks
- Throw AppError for failures
- Return `{ success: true, data, message }` on success

---

## 8. Adding a New Feature — Step-by-Step

Let's walk through adding a `products` resource as an example:

### Step 1: Create the Model (`models/product.model.js`)
```js
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.config.js';

const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
});

export default Product;
```

### Step 2: Register in `models/index.js`
```js
import Product from './product.model.js';
const db = { sequelize, User, Product };
export default db;
```

### Step 3: Create the Controller (`controllers/product.controller.js`)
```js
import catchAsync from '../utils/catchAsync.js';
import { NotFoundError } from '../utils/AppError.js';
import db from '../models/index.js';

const getAll = catchAsync(async (req, res) => {
  const products = await db.Product.findAll();
  res.json({ success: true, data: products });
});

const getById = catchAsync(async (req, res) => {
  const product = await db.Product.findByPk(req.params.id);
  if (!product) throw new NotFoundError('Product');
  res.json({ success: true, data: product });
});

export { getAll, getById };
```

### Step 4: Create the Validator (`validators/product.validator.js`)
```js
import { body } from 'express-validator';

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
];

export { createRules };
```

### Step 5: Create the Route (`routes/product.routes.js`)
```js
import { Router } from 'express';
import { getAll, getById } from '../controllers/product.controller.js';
import { createRules } from '../validators/product.validator.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', authenticate, authorize('admin'), createRules, getById);

export default router;
```

### Step 6: Mount in `routes/index.js`
```js
import productRoutes from './product.routes.js';
router.use('/products', productRoutes);
```

---

## 9. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Server port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `aone` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | (empty) | Database password |
| `JWT_SECRET` | (fallback) | Secret key for signing tokens |
| `JWT_EXPIRES_IN` | `7d` | Token expiration duration |

---

## 10. Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start in production mode (no auto-restart) |
| `npm run dev` | Start with nodemon (auto-restart on changes) |
