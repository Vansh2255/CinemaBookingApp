# 🎬 Movie Reservation API

A production-grade REST API for a **cinema booking system** — users browse movies & showtimes, reserve seats, pay via **Stripe**, and receive email confirmations. Built to demonstrate modern backend + DevOps practices: JWT auth, Redis caching, BullMQ background jobs, Redis-backed rate limiting, Docker Compose, and comprehensive tests.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Data Model](#data-model)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [Running with Docker](#running-with-docker)
8. [API Reference](#api-reference)
9. [Authentication & Authorization](#authentication--authorization)
10. [Core Workflows](#core-workflows)
11. [Caching](#caching)
12. [Rate Limiting](#rate-limiting)
13. [Background Jobs](#background-jobs)
14. [Security](#security)
15. [Testing](#testing)
16. [Project Structure](#project-structure)
17. [Roadmap](#roadmap)

---

## Features

- **Authentication** — JWT access + refresh tokens (rotation), logout, email verification, password reset
- **Role-based access control** — `user`, `admin`, `super_admin`
- **Booking** — seat reservation with **10-minute hold**, pessimistic locking to prevent double-booking (race-safe)
- **Coupons** — percentage / fixed discounts, usage limits enforced atomically, pricing snapshot
- **Payments** — Stripe PaymentIntents, webhook handling, **refunds**
- **Pricing engine** — seat-type multipliers, weekend & evening peak pricing
- **Background jobs** — BullMQ email worker + reservation-expiry cleanup scheduler
- **Caching** — Redis cache-aside for read-heavy endpoints (movies, theatres)
- **Rate limiting** — tiered, Redis-backed, fail-open
- **API docs** — Swagger UI auto-generated from JSDoc
- **Health check** — `/health` endpoint with DB + Redis readiness checks
- **Docker** — full stack via Docker Compose + multi-stage production Dockerfile (non-root)
- **Tests** — 37 integration/unit tests including a concurrency race test

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 22 |
| Framework | Express 5 |
| Language | JavaScript (CommonJS) |
| Database | PostgreSQL 17 |
| ORM | Prisma 6 |
| Cache / Queue / Rate-limit store | Redis 7 (ioredis + BullMQ) |
| Payments | Stripe |
| Email | Nodemailer (SMTP — Brevo by default) |
| Auth | JSON Web Token (jsonwebtoken), bcryptjs |
| Validation | Joi |
| API docs | swagger-jsdoc + swagger-ui-express |
| Testing | Jest 30 + Supertest |
| Containerization | Docker + Docker Compose |

---

## Architecture

The app follows a **layered, module-based** structure — each domain (`auth`, `movies`, `reservations`, `payments`, …) is a self-contained module with its own `routes → controller → service` layers. Cross-cutting concerns (auth, validation, rate limiting, errors) are implemented as middleware.

```
Client (frontend / Postman)
        │  HTTP + JWT
        ▼
┌─────────────────────────────────────────┐
│               Express API (app.js)      │
│  Helmet · CORS · rate-limit · body-parser│
│  ┌──────────┬───────────┬─────────────┐ │
│  │  routes  │ controller │  service    │ │
│  │  (HTTP)  │  (req/res) │  (business) │ │
│  └──────────┴───────────┴─────────────┘ │
└───────┬──────────────┬───────────────┬───┘
        │              │               │
        ▼              ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│  PostgreSQL   │ │    Redis     │ │   Stripe     │
│   (Prisma)    │ │ cache/queue  │ │  (payments)  │
└──────────────┘ └─────────────┘ └──────────────┘
                        │
                        ▼
              ┌───────────────────┐
              │  BullMQ Workers    │
              │  email · cleanup   │
              └───────────────────┘
```

### Request lifecycle

```
HTTP request
  → security headers (Helmet)
  → CORS
  → trust proxy (correct client IP)
  → rate limiter (per-IP counters)
  → body parser (JSON, 100kb cap)
  → route → auth middleware (JWT verify)
  → role middleware (RBAC)
  → validation middleware (Joi)
  → controller → service → Prisma/Stripe/Redis
  → response  → error handler (unified error shape)
```

---

## Data Model

All entities and relationships (from `prisma/schema.prisma`):

| Model | Key fields | Relationships |
| --- | --- | --- |
| `User` | name, email (unique), password (hashed), role, email-verification fields | has many `RefreshToken`, `Reservation` |
| `RefreshToken` | tokenHash (unique), expiresAt | belongs to `User` (cascade) |
| `Genre` | name (unique), description | many-to-many with `Movie` |
| `Movie` | title, description, posterUrl, duration, language, releaseDate | has many `Showtime`, many-to-many `Genre` |
| `MovieGenre` | movieId + genreId (unique pair) | join table |
| `Theatre` | name, location | has many `Screen` |
| `Screen` | theatreId, name, capacity, screenType | has many `Seat`, `Showtime` |
| `Seat` | screenId, seatNumber, seatType, isActive | has many `Reservation` |
| `Showtime` | movieId, screenId, startTime, endTime, totalSeats, prices | has many `Reservation` |
| `Reservation` | userId, showtimeId, seatId, status, expiresAt, pricing snapshot, couponId | belongs to User/Showtime/Seat; has one `Payment`; optionally `Coupon` |
| `Coupon` | code (unique), discountType, discountValue, usageLimit, usageCount, startsAt/expiresAt | has many `Reservation` |
| `Payment` | reservationId (unique), amount, currency, status, stripePaymentIntentId | belongs to `Reservation` (cascade) |

### Reservation statuses

| Status | Meaning |
| --- | --- |
| `PENDING` | Seat held, awaiting payment (expires after 10 min) |
| `CONFIRMED` | Payment succeeded |
| `CANCELLED` | Cancelled by user/admin (unpaid) |
| `EXPIRED` | Hold expired, seat released |
| `REFUNDED` | Payment refunded, seat released |

### Payment statuses

`PENDING` → `SUCCEEDED` → `REFUNDED` (or `PENDING` → `FAILED`)

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (running locally, or via Docker)
- Redis (optional for local dev — the app degrades gracefully without it)
- A Stripe account (test mode) for payments

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in real values (see [Environment Variables](#environment-variables)).

### 3. Set up the database

```bash
npx prisma migrate dev      # apply migrations
# or, for a quick dev setup:
npx prisma db push
```

### 4. Seed initial data (admin user + genres)

```bash
npm run prisma:seed
```

Creates an admin user (`admin@movie.com` / `admin123`) and 4 genres.

### 5. Run the app

```bash
npm run dev        # development (nodemon)
# or
npm start          # production
```

The server starts at `http://localhost:5000`, with Swagger docs at `http://localhost:5000/api-docs`.

---

## Environment Variables

| Variable | Description | Default / Example |
| --- | --- | --- |
| `PORT` | API port | `5000` |
| `NODE_ENV` | Environment (`development` / `test` / `production`) | `development` |
| `POSTGRES_USER` | Postgres user (Docker) | `postgres` |
| `POSTGRES_PASSWORD` | Postgres password (Docker) | — |
| `POSTGRES_DB` | Postgres database name (Docker) | `movie_reservation` |
| `DATABASE_URL` | Prisma connection string | `postgresql://user:pass@localhost:5432/movie_reservation?schema=public` |
| `JWT_SECRET` | Access-token signing secret | — |
| `JWT_EXPIRES_IN` | Access-token lifetime | `15m` |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret | — |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime | `7d` |
| `REDIS_URL` | Redis connection URL (optional — no-op fallback if absent) | `redis://localhost:6379` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `STRIPE_SECRET_KEY` | Stripe secret key (test mode: `sk_test_…`) | — |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_…`) | — |
| `STRIPE_CURRENCY` | Payment currency | `inr` |
| `MAIL_HOST` | SMTP host | `smtp-relay.brevo.com` |
| `MAIL_PORT` | SMTP port | `587` |
| `MAIL_USER` | SMTP username | — |
| `MAIL_PASSWORD` | SMTP password/key | — |
| `MAIL_FROM` | Verified sender address | — |
| `APP_BASE_URL` | Frontend base URL (for email links) | `http://localhost:3000` |
| `AUTH_RATE_LIMIT` | Auth requests per 15 min per IP | `10` |
| `BOOKING_RATE_LIMIT` | Booking requests per 15 min per IP | `20` |
| `PAYMENT_RATE_LIMIT` | Payment requests per 15 min per IP | `20` |
| `API_RATE_LIMIT` | Global requests per 15 min per IP | `100` |
| `TRUST_PROXY_HOPS` | Reverse-proxy hops to trust (0 = no proxy) | `0` |
| `RESERVATION_CLEANUP_INTERVAL_MS` | Cleanup-worker interval | `60000` |

> **Note:** `DATABASE_URL`, `JWT_*`, and Stripe secrets are sensitive — never commit `.env`. See `.env.example` for the full template.

---

## Running with Docker

The full stack (API + Postgres + Redis + 2 workers) runs with a single command:

```bash
docker compose up --build
```

| Service | Description |
| --- | --- |
| `app` | Express API on `:5000` |
| `postgres` | PostgreSQL 17 on `:5432` |
| `redis` | Redis 7 on `:6379` |
| `email-worker` | BullMQ consumer — sends booking/payment/refund emails |
| `cleanup-worker` | BullMQ scheduler — expires stale seat-holds |

A shared YAML anchor (`x-app-environment`) keeps the environment identical across the API and both workers, so the queue/worker contract never drifts.

---

## API Reference

**Full interactive docs:** `GET /api-docs` (Swagger UI).

**Base URL:** `http://localhost:5000`

**Authentication:** most endpoints expect `Authorization: Bearer <accessToken>`. Access levels used below:

- 🌍 **Public** — no token needed
- 🔐 **User** — any authenticated user
- 👑 **Admin** — `admin` or `super_admin`
- ⭐ **Super Admin** — `super_admin` only

### Auth — `/api/auth`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/signup` | 🌍 | Register a new user |
| POST | `/login` | 🌍 | Login, returns access + refresh tokens |
| POST | `/refresh-token` | 🌍 | Rotate refresh token → new access token |
| POST | `/logout` | 🔐 | Invalidate all refresh tokens |
| POST | `/change-password` | 🔐 | Change password (requires current) |
| POST | `/forgot-password` | 🌍 | Email a reset link (generic response) |
| POST | `/reset-password` | 🌍 | Reset password with token |
| POST | `/send-verification-email` | 🔐 | Email a verification link |
| POST | `/verify-email` | 🌍 | Verify email with token |

### Users — `/api/users`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/profile` | 🔐 | Get current user's profile |
| PUT | `/profile` | 🔐 | Update name / email |

### Movies — `/api/movies`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 🔐 | List movies (paginated, search, sort, filter) |
| GET | `/:id` | 🔐 | Get movie by ID |
| POST | `/` | 👑 | Create movie |
| PUT | `/:id` | 👑 | Update movie |
| DELETE | `/:id` | 👑 | Delete movie |

### Genres — `/api/genres`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 🌍 | List genres |
| GET | `/:id` | 🌍 | Get genre by ID |
| POST | `/` | 👑 | Create genre |
| PUT | `/:id` | 👑 | Update genre |
| DELETE | `/:id` | 👑 | Delete genre |

### Movie-Genres — `/api/movie-genres`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 🔐 | List all movie↔genre mappings |
| GET | `/movie/:movieId` | 🔐 | Get genres of a movie |
| POST | `/` | 👑 | Assign a genre to a movie |
| DELETE | `/:movieId/:genreId` | 👑 | Remove a genre from a movie |

### Theatres — `/api/theatres`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 🌍 | List theatres (paginated, search, sort) |
| GET | `/:id` | 🌍 | Get theatre by ID |
| POST | `/` | 👑 | Create theatre |
| PUT | `/:id` | 👑 | Update theatre |
| DELETE | `/:id` | 👑 | Delete theatre |

### Screens — `/api/screens`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 🌍 | List screens |
| GET | `/:id` | 🌍 | Get screen by ID |
| POST | `/` | 👑 | Create screen |
| PUT | `/:id` | 👑 | Update screen |
| DELETE | `/:id` | 👑 | Delete screen |

### Seats — `/api/seats`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 🌍 | List all seats |
| GET | `/:id` | 🌍 | Get seat by ID |
| GET | `/screen/:screenId` | 🌍 | Get seats by screen |
| POST | `/` | 👑 | Create seat |
| PUT | `/:id` | 👑 | Update seat |
| DELETE | `/:id` | 👑 | Delete seat |

### Showtimes — `/api/showtimes`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 🌍 | List showtimes (paginated, search, sort) |
| GET | `/:id` | 🌍 | Get showtime by ID |
| GET | `/:id/seats` | 🌍 | Get booked seats for a showtime |
| GET | `/:id/availability` | 🌍 | Get seat availability count |
| POST | `/` | 👑 | Create showtime |
| PUT | `/:id` | 👑 | Update showtime |
| DELETE | `/:id` | 👑 | Delete showtime |

### Reservations — `/api/reservations`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 👑 | List all reservations (admin) |
| GET | `/my-bookings` | 🔐 | Get current user's bookings |
| GET | `/:id` | 🔐 | Get reservation (owner or admin) |
| POST | `/` | 🔐 | Create reservation (with optional `coupon_code`) |
| PUT | `/:id` | 👑 | Update reservation (admin) |
| PATCH | `/:id/cancel` | 🔐 | Cancel reservation (owner or admin) |
| DELETE | `/:id` | 👑 | Delete reservation (admin) |

### Payments — `/api/payments`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/create-intent` | 🔐 | Create Stripe PaymentIntent for a pending reservation |
| POST | `/:id/refund` | 🔐 | Refund a succeeded payment (owner or admin) |
| GET | `/my-payments` | 🔐 | Get current user's payment history |
| GET | `/:id` | 🔐 | Get payment by ID (owner) |
| POST | `/webhook` | 🌍 | Stripe webhook (raw body, signature-verified) |

### Misc

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 🌍 | Root message |
| GET | `/health` | 🌍 | Health check (DB + Redis readiness) |
| GET | `/profile` | 🔐 | Debug: current user payload |
| GET | `/admin` | 👑 | Debug: admin-only check |
| GET | `/api-docs` | 🌍 | Swagger UI |

---

## Authentication & Authorization

### Tokens

- **Access token** — short-lived JWT (15 min), carries `id`, `email`, `role`. Sent as `Authorization: Bearer <token>`.
- **Refresh token** — long-lived JWT (7 days), used only to obtain new access tokens. Stored **hashed** (SHA-256) in the DB, and **rotated** on every use (old token is deleted, a new one is issued — so a leaked refresh token is single-use).

### Refresh-token rotation flow

1. Client sends `refreshToken` to `/api/auth/refresh-token`.
2. Server verifies the JWT signature (refresh secret).
3. Server looks up the SHA-256 hash in `refresh_tokens`.
4. Server checks expiry + ownership, deletes the old token, and issues a fresh pair **atomically** (in a transaction).
5. A reused/old token is rejected (already deleted) — preventing replay attacks.

### Roles

| Role | Capabilities |
| --- | --- |
| `user` | Browse, book, pay, refund own bookings |
| `admin` | Full CRUD across resources |
| `super_admin` | Full access — a superset of `admin` (accepted on every admin route) |

Role checks happen per-route in `role.middleware.js` (`authorizeRoles(...roles)`), with `super_admin` accepted wherever `admin` is accepted.

### Password & email security

- Passwords hashed with **bcrypt** (cost 10 for login, 12 for password changes/resets).
- Email verification and password-reset use **64-char random tokens**, stored **hashed** (SHA-256) with an expiry (24h / 30min respectively).
- Password reset / forgot-password return **generic responses** to prevent account enumeration.
- Login returns a generic `401 Invalid credentials` whether the email or password is wrong.

---

## Core Workflows

### 1. Authentication workflow

```
Sign up ──► (create user, role=user)
  │
  ▼
Login ──► verify bcrypt ──► issue access (15m) + refresh (7d, hashed in DB)
  │
  ├─► Refresh ──► verify + rotate refresh token ──► new access + refresh
  ├─► Logout ──► delete all refresh tokens
  ├─► Verify email ──► send token link ──► user clicks ──► isEmailVerified=true
  └─► Forgot password ──► send reset link ──► reset with new password
```

### 2. Booking workflow (race-safe seat reservation)

1. **Validate** showtime (exists, hasn't started), seat (exists, active, belongs to same screen).
2. Open a **transaction** and take a **pessimistic lock** on the showtime row (`SELECT … FOR UPDATE`) — this serializes all bookings for the same showtime.
3. Expire stale `PENDING` holds on read.
4. **Validate + atomically consume the coupon** (see [Coupon enforcement](#coupon-enforcement)).
5. Check the seat isn't already in an active status (`PENDING`/`CONFIRMED`).
6. Compute price (snapshot) and create the reservation as `PENDING` with a **10-minute** `expiresAt`.
7. Enqueue a booking-confirmation email (non-blocking).

The `FOR UPDATE` lock guarantees that **two concurrent requests for the same seat can never both succeed** — one will always get `409 Seat already booked`.

### 3. Payment workflow (Stripe)

```
Create reservation (PENDING, 10-min hold)
        │
        ▼
POST /payments/create-intent
   → create Stripe PaymentIntent (amount = finalAmount in paise)
   → upsert Payment (PENDING)
   → return client_secret
        │
        ▼
Frontend confirms with Stripe
        │
        ▼
Stripe → POST /payments/webhook  (signature-verified)
   ├─ payment_intent.succeeded ──► mark payment SUCCEEDED + reservation CONFIRMED
   └─ payment_intent.payment_failed ──► release seat (cancel reservation)
        │
        ▼
Payment confirmation email (via BullMQ worker)
```

**Refund workflow:**

```
POST /payments/:id/refund
   → verify owner/admin + payment SUCCEEDED + reservation CONFIRMED
   → Stripe refund (idempotency-keyed)
   → payment → REFUNDED, reservation → REFUNDED (seat released)
   → refund email
   (Stripe also sends charge.refunded webhook → DB sync as a safety net)
```

### 4. Coupon enforcement

Coupons support `PERCENTAGE` and `FIXED` discounts, with optional `minOrderAmount`, `maxDiscount`, `usageLimit`, and validity window (`startsAt`/`expiresAt`).

The usage counter is **incremented atomically** inside the booking transaction:

```js
tx.coupon.updateMany({
  where: { id: coupon.id, usageCount: { lt: coupon.usageLimit } },
  data: { usageCount: { increment: 1 } }
})
```

This single `UPDATE … WHERE usage_count < limit` prevents the **TOCTOU race** (two concurrent bookings can't both pass the limit check), and — because it runs inside the transaction — a failed booking rolls back the increment so the coupon isn't wasted. The final price (base, discount, final) is **snapshotted** on the reservation, so historic receipts remain stable even if the showtime price or coupon changes later.

### 5. Reservation expiry (seat-hold release)

Two mechanisms work together:

1. **On-read expiry** — `createReservation`, `getMyBookings`, `getBookedSeats`, and `getSeatAvailability` expire stale `PENDING` holds before returning data.
2. **Proactive sweep** — a BullMQ repeatable job (`cleanup-worker`) expires all stale holds every 60s (configurable), so abandoned holds are released even with no traffic.

---

## Caching

Read-heavy endpoints (`movies`, `theatres`) use the **cache-aside** pattern via `utils/cache.js`:

```
getOrSet(key, ttl, fetchFn):
  cache.get(key) ── hit? ──► return
  │ miss
  ▼
  DB fetch ──► cache.set(key, value, EX, ttl) ──► return
```

- **TTL:** 60 seconds.
- **Invalidation:** on any create/update/delete, `delByPrefix("movies:")` / `delByPrefix("theatres:")` clears the relevant keys (using non-blocking `SCAN`, not `KEYS`).
- **Graceful degradation:** if Redis is down, every call silently falls through to the DB — the API never fails because of the cache.

---

## Rate Limiting

Tiered, Redis-backed rate limiting (in-memory fallback when Redis is absent). All windows are **15 minutes**, configurable via env vars:

| Limiter | Applies to | Default limit |
| --- | --- | --- |
| `authLimiter` | login, signup, forgot-password, send-verification-email | 10 |
| `bookingLimiter` | `POST /api/reservations` only (GETs skipped) | 20 |
| `paymentLimiter` | `POST /api/payments/create-intent` | 20 |
| `apiLimiter` | everything else (global) | 100 |

Key design choices:

- **Redis store** (`rate-limit-redis`) — counters shared across multiple app instances, persistent across restarts.
- **`passOnStoreError: true`** — if Redis is down, requests are **not** blocked (fail-open); rate limiting is best-effort, never a point of failure.
- **`trust proxy`** — configured via `TRUST_PROXY_HOPS` so the real client IP (not the proxy's) is used for counting behind nginx/ALB.
- Rate limiting is **disabled in tests** (`NODE_ENV !== "test"`) so test suites aren't throttled.

---

## Background Jobs

Two BullMQ workers run as **separate processes** (so they never block the API):

| Worker | Queue | Job | Behavior |
| --- | --- | --- | --- |
| `email.worker.js` | `emails` | booking / payment / refund confirmations | retry 3× with exponential backoff (2s) |
| `reservation-cleanup.worker.js` | `maintenance` | `expire-reservations` | repeatable every 60s (idempotent `jobId`) |

The API only **enqueues** jobs (`notification.service.js`); the actual email send happens in the worker. Enqueue is best-effort (try/catch) — a queue outage never breaks the booking/payment flow.

---

## Security

- **Passwords** hashed with bcrypt (never stored in plaintext).
- **Refresh tokens** stored as SHA-256 hashes + rotated on use.
- **JWT** with separate secrets for access & refresh tokens.
- **Helmet** security headers.
- **CORS** restricted to a configured origin.
- **Rate limiting** on auth, booking, and payment endpoints.
- **Input validation** (Joi) on every write endpoint.
- **SQL injection** prevented by Prisma's parameterized queries.
- **Race-condition protection** via `SELECT … FOR UPDATE` seat locking.
- **Stripe webhook signature verification** (raw body).
- **No account enumeration** — generic login / forgot-password responses.
- **Idempotent payment & refund** — Stripe idempotency keys prevent double charges/refunds.

---

## Testing

```bash
npm test            # runs all suites (jest --runInBand)
```

**36 tests** across 9 suites:

| Suite | Covers |
| --- | --- |
| `auth.test.js` | register, login, refresh rotation, password reset, email verification |
| `reservations.test.js` | booking, duplicate-seat rejection, **5-way concurrency race test** |
| `payments.test.js` | create-intent, webhook success, **refund**, idempotency |
| `coupon.test.js` | discount application, **usage-limit enforcement**, rollback |
| `cache.test.js` | cache-aside behavior |
| `notifications.test.js` | queue enqueue behavior (mocked queue) |
| `reservation-cleanup.test.js` | expiry sweep service |
| `rate-limit.test.js` | 429 behavior on limiter thresholds |
| `movies.test.js` | movie CRUD + pagination |

The test harness (`tests/globalSetup.js`) recreates a disposable `movie_reservation_test` database and syncs the schema before each run; `tests/helpers.js` truncates all tables between suites.

---

## Project Structure

```
movie_reservation/
├── prisma/
│   ├── schema.prisma            # data model
│   ├── migrations/              # migration history
│   └── seed.js                  # admin + genres seeder
├── src/
│   ├── app.js                   # Express app (middleware + routes)
│   ├── server.js                # entry point (starts server)
│   ├── config/                  # prisma, redis, queue, rate-limit, mailer, stripe
│   ├── docs/swagger.js          # OpenAPI spec (swagger-jsdoc)
│   ├── errors/ApiError.js       # unified error class
│   ├── middleware/              # auth, role, validation, error
│   ├── modules/                 # one folder per domain
│   │   ├── auth/                # routes · controller · service
│   │   ├── users/
│   │   ├── movies/
│   │   ├── genres/
│   │   ├── movieGenres/
│   │   ├── theatres/
│   │   ├── screens/
│   │   ├── seats/
│   │   ├── showtimes/
│   │   ├── reservations/        # + reservation-cleanup.service
│   │   ├── payments/
│   │   └── pricing/             # price calculation engine
│   ├── services/notification.service.js   # email enqueue (producer)
│   ├── utils/                   # jwt, cache, asyncHandler
│   ├── validations/             # Joi schemas per module
│   └── workers/                 # BullMQ consumers (email, cleanup)
├── tests/                       # Jest + Supertest suites
├── docker-compose.yml           # full-stack orchestration
├── Dockerfile
├── .env.example                 # env template
└── package.json
```

---

## Roadmap

Planned / in-progress improvements:

- [ ] **CI/CD** — GitHub Actions pipeline (lint → test → build → deploy)
- [ ] **Structured logging** — morgan (HTTP) + winston/pino (app logs)
- [ ] **Test coverage reporting** (`jest --coverage`)
- [ ] **Email-verification enforcement** on booking
- [ ] **Admin dashboard / metrics** endpoint

---

## License

MIT — see `package.json`.
