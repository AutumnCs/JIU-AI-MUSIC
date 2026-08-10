# Email Password Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a JIU-style email/password registration and login flow while preserving guest mode and upgrading the current guest account without losing data.

**Architecture:** Keep the existing D1 `users` and signed HttpOnly session model. Add password hashing in a small Web Crypto module, expose register/login routes through the existing auth helpers, and use a single responsive `/login` client page for login and registration. A registration request with a current guest session upgrades that user in place, so all foreign-keyed works, posts, likes, favorites, and comments remain attached.

**Tech Stack:** Next.js App Router, Cloudflare Workers/OpenNext, D1, TypeScript, Web Crypto PBKDF2, Vitest/node test runner, Tailwind CSS.

## Global Constraints

- Do not add email sending, email verification, password reset, OAuth, or third-party auth in this milestone.
- Never store plaintext passwords, password hashes, salts, or session IDs in localStorage.
- Normalize email with trim + lowercase before validation, lookup, and storage.
- Preserve the existing guest fallback and signed HttpOnly `jiu_session` cookie behavior.
- Password length is 8-72 characters; email length is at most 254 characters; display name rules reuse the existing 1-24 character validation.
- Use `apply_patch` for manual edits and keep unrelated worktree changes untouched.

---

### Task 1: Add password hashing and credential validation

**Files:**
- Create: `jiu-app/lib/server/password.ts`
- Create: `jiu-app/lib/server/password.test.ts`
- Create: `jiu-app/lib/auth/credentials.ts`
- Create: `jiu-app/lib/auth/credentials.test.ts`

**Interfaces:**
- `hashPassword(password: string): Promise<{ hash: string; salt: string }>` uses Web Crypto PBKDF2.
- `verifyPassword(password: string, hash: string, salt: string): Promise<boolean>` performs constant-time digest comparison.
- `normalizeEmail(value: unknown): string` returns a lowercase trimmed email or throws `invalid_email`.
- `validatePassword(value: unknown): string` returns a valid password or throws `invalid_password`.

- [ ] **Step 1: Write failing tests** for email normalization, email rejection, password length rejection, random salt generation, correct password verification, and wrong password rejection.
- [ ] **Step 2: Run the focused tests** with `npm test -- --run lib/server/password.test.ts lib/auth/credentials.test.ts` and confirm they fail because the modules do not exist.
- [ ] **Step 3: Implement PBKDF2** with a random 16-byte salt, SHA-256, 120000 iterations, 256-bit output, and base64url encoding. Use `crypto.subtle.verify` or a digest comparison that does not early-return on matching bytes.
- [ ] **Step 4: Implement validation** with explicit error codes and no user-facing password details.
- [ ] **Step 5: Run the focused tests** and confirm they pass.
- [ ] **Step 6: Commit** with `git add jiu-app/lib/server/password.ts jiu-app/lib/server/password.test.ts jiu-app/lib/auth/credentials.ts jiu-app/lib/auth/credentials.test.ts && git commit -m "feat: add password credential utilities"`.

### Task 2: Extend D1 auth storage and repository operations

**Files:**
- Create: `jiu-app/migrations/0003_email_auth.sql`
- Modify: `jiu-app/lib/server/repositories/auth.ts`
- Modify: `jiu-app/lib/server/db.ts`
- Modify: `jiu-app/lib/server/db.test.ts`

**Interfaces:**
- `registerEmailUser(input: { email: string; passwordHash: string; passwordSalt: string; displayName: string; guestUserId?: string }): Promise<AuthUser>`.
- `findEmailCredential(email: string): Promise<{ userId: string; passwordHash: string; passwordSalt: string } | null>`.
- `createEmailUserRecord(input: { email: string; passwordHash: string; passwordSalt: string; displayName: string; guestUserId?: string }): Promise<AuthUser>`.

- [ ] **Step 1: Add repository tests** covering new email user creation, credential lookup, and guest upgrade in place; assert the guest user ID is unchanged.
- [ ] **Step 2: Run `npm test -- --run lib/server/db.test.ts`** and confirm the new tests fail.
- [ ] **Step 3: Create migration `0003_email_auth.sql`** adding nullable `password_hash` and `password_salt` columns plus a unique normalized-email index. Existing guest rows remain valid.
- [ ] **Step 4: Implement repository methods** using parameterized D1 statements. For guest upgrade, update `type`, `email`, `display_name`, credentials, and `updated_at` in one statement guarded by `type = 'guest'`.
- [ ] **Step 5: Export the repository operations through `lib/server/db.ts`** without changing existing call sites.
- [ ] **Step 6: Run auth repository tests and `npx tsc --noEmit`**.
- [ ] **Step 7: Commit** with `git add jiu-app/migrations/0003_email_auth.sql jiu-app/lib/server/repositories/auth.ts jiu-app/lib/server/db.ts jiu-app/lib/server/db.test.ts && git commit -m "feat: store email authentication credentials"`.

### Task 3: Implement register and login APIs

**Files:**
- Create: `jiu-app/app/api/auth/register/route.ts`
- Create: `jiu-app/app/api/auth/login/route.ts`
- Modify: `jiu-app/lib/server/auth.ts`
- Create: `jiu-app/app/api/auth/login/route.test.ts`

**Interfaces:**
- `POST /api/auth/register` accepts `{ email, password, displayName }` and returns `{ user, session }` with a signed session cookie.
- `POST /api/auth/login` accepts `{ email, password }` and returns `{ user, session }` with a signed session cookie.
- Both routes return stable `{ error, message }` JSON errors with 400/401/409 status codes.

- [ ] **Step 1: Write route tests** for successful registration, guest upgrade, duplicate email, invalid input, successful login, wrong password, and missing session cookie.
- [ ] **Step 2: Run the focused route tests** and confirm they fail.
- [ ] **Step 3: Add auth service functions** that validate database/cookie configuration, normalize credentials, hash or verify passwords, create/reuse the user, create a session with the existing expiry helper, and never include credential fields in the response.
- [ ] **Step 4: Implement routes** with JSON parsing, current-user lookup for optional guest upgrade, generic login failure text, and conflict handling for duplicate email.
- [ ] **Step 5: Add a lightweight in-process login failure delay** of at least 150ms before failed login responses; do not introduce a new storage service in this milestone.
- [ ] **Step 6: Run focused tests, `npx tsc --noEmit`, and `npm run lint`**.
- [ ] **Step 7: Commit** with `git add jiu-app/app/api/auth/register jiu-app/app/api/auth/login jiu-app/lib/server/auth.ts jiu-app/app/api/auth/login/route.test.ts && git commit -m "feat: add email auth APIs"`.

### Task 4: Build the JIU login and registration screen

**Files:**
- Create: `jiu-app/app/login/page.tsx`
- Create: `jiu-app/app/login/login.module.css`
- Modify: `jiu-app/app/layout.tsx`
- Modify: `jiu-app/app/me/page.tsx`

**Interfaces:**
- `/login?next=/target` accepts an optional same-origin `next` path and falls back to `/me`.
- The page switches between `login` and `register` modes without losing field-level feedback.
- Successful auth updates the existing Zustand auth state and redirects to the safe `next` path.

- [ ] **Step 1: Add UI behavior tests or testable helper coverage** for safe redirect handling, mode switching, password visibility, and preserving the current guest state until registration succeeds.
- [ ] **Step 2: Implement the responsive page** with the existing JIU palette, rounded card, bird/brand illustration treatment, visible labels, 44px+ controls, keyboard focus states, loading state, inline errors, and reduced-motion-safe entrance animation.
- [ ] **Step 3: Add a “游客体验” link** that returns to the requested page without creating a second guest session.
- [ ] **Step 4: Hide `BottomNav` and `BirdCompanion` on `/login`** while keeping them unchanged elsewhere.
- [ ] **Step 5: Add a login/register entry card to the personal center** for guest users; email users see their existing profile and a logout action.
- [ ] **Step 6: Run `npx tsc --noEmit`, `npm run lint`, and the UI test suite**.
- [ ] **Step 7: Commit** with `git add jiu-app/app/login jiu-app/app/layout.tsx jiu-app/app/me/page.tsx && git commit -m "feat: add jiu email login screen"`.

### Task 5: Apply migration and verify end-to-end behavior

**Files:**
- Modify: `jiu-app/README.md`
- Modify: `jiu-app/.env.example`
- Test: local and remote D1 migration state plus production API smoke checks.

- [ ] **Step 1: Document** the two new API routes, local development flow, and the fact that no email provider is needed yet.
- [ ] **Step 2: Run the full suite**: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `node --experimental-strip-types --no-warnings --test lib/**/*.test.ts`, and `npm run cf-build` from `jiu-app`.
- [ ] **Step 3: Apply local migration** with `npx wrangler d1 migrations apply jiu-music-db --local` and inspect the schema for `password_hash`, `password_salt`, and the email index.
- [ ] **Step 4: Apply remote migration** with `npx wrangler d1 migrations apply jiu-music-db --remote` only after local checks pass.
- [ ] **Step 5: Deploy the Worker** with the existing Wrangler configuration and record the deployment version.
- [ ] **Step 6: Smoke test** register, refresh, logout, login, duplicate email, and guest upgrade using browser/API requests without printing secrets.
- [ ] **Step 7: Commit documentation and final verification** with `git add jiu-app/README.md jiu-app/.env.example && git commit -m "docs: document email authentication setup"`.

## Self-Review Checklist

- Password hashing, credential persistence, API behavior, UI, guest upgrade, migration, tests, docs, and deployment each have a dedicated task.
- No task stores plaintext secrets or asks for an email provider.
- Repository function names and API payloads are defined before later tasks use them.
- Existing guest routes and foreign-keyed user data remain part of the acceptance criteria.
