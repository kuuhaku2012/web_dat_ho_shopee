# Shopee Request Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vietnamese website that stores Shopee order/account requests and lets an authenticated administrator process them manually.

**Architecture:** One Next.js App Router application renders the public site and admin pages. Route handlers validate requests and use Node's built-in SQLite to persist them. Admin sessions use signed, expiring HttpOnly cookies and every admin mutation checks same-origin requests.

**Tech Stack:** Node.js 24.15+, Next.js 16, React, TypeScript, CSS, `node:sqlite`, `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-21-shopee-request-site-design.md`

## Global Constraints

- Vietnamese customer-facing copy. Voucher labels are exactly 50, 60, 70, 80, 100 and imply no specific discount amount.
- Manual fulfillment and price confirmation only. No Shopee integration, online payment or delivery of account credentials.
- Protect all customer data behind admin authentication. Never store Shopee account passwords.
- Hosting requires a persistent SQLite directory and a Node.js server.

## File Map

- `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`: app setup.
- `lib/requests.ts`: types, validation and voucher options.
- `lib/db.ts`: schema and request CRUD using prepared SQL statements.
- `lib/auth.ts`: password verification, signed session cookies and origin check.
- `lib/limit.ts`: small request/login rate limiter.
- `app/api/requests/route.ts`: public request endpoint.
- `app/api/admin/login/route.ts`, `app/api/admin/logout/route.ts`, `app/api/admin/requests/[id]/route.ts`: admin endpoints.
- `app/page.tsx`, `app/globals.css`, `app/components/RequestForm.tsx`: public UI.
- `app/admin/login/page.tsx`, `app/admin/page.tsx`, `app/admin/requests/[id]/page.tsx`: admin UI.
- `tests/*.test.ts`: behavior tests using `node:test`.
- `README.md`, `.env.example`, `.gitignore`: operation guide and safe defaults.

### Task 1: Valid request model and persistence

**Files:** Create `package.json`, `tsconfig.json`, `next.config.ts`, `lib/requests.ts`, `lib/db.ts`, `tests/requests.test.ts`, `tests/db.test.ts`, `.gitignore`.

**Interfaces:** `parseRequest(input: unknown): RequestInput` throws `ValidationError`; `createRequest(input: RequestInput): RequestRecord`; `listRequests(filters): RequestRecord[]`; `getRequest(id): RequestRecord | null`; `updateRequest(id, status, note): RequestRecord | null`.

- [ ] **Step 1: Write failing tests** for accepted order/account payloads, invalid Shopee host, missing contact, invalid voucher, SQL roundtrip and status update. Example: `assert.equal(parseRequest({type:'order', productUrl:'https://shopee.vn/a', voucher:'50', quantity:1, name:'An', phone:'0900000000'}).voucher, '50')`.
- [ ] **Step 2: Run `npm test`** and confirm the tests fail because the modules do not exist.
- [ ] **Step 3: Implement** a small Next.js project and the two modules. `parseRequest` checks exact types, trims strings and validates the URL's parsed hostname; `lib/db.ts` opens `DATA_DIR/requests.sqlite`, creates one table and uses bound parameters. IDs use `crypto.randomUUID()`.
- [ ] **Step 4: Run `npm test`** and confirm those behavior tests pass.
- [ ] **Step 5: Commit** with `git add package.json package-lock.json tsconfig.json next.config.ts lib tests .gitignore && git commit -m "feat: validate and persist requests"`.

### Task 2: Public submission and customer UI

**Files:** Create `app/api/requests/route.ts`, `app/page.tsx`, `app/layout.tsx`, `app/components/RequestForm.tsx`, `app/globals.css`, `lib/limit.ts`, `tests/limit.test.ts`.

**Interfaces:** `POST /api/requests` receives JSON `RequestInput` and returns `{id}` with status 201; 400 on validation error; 429 on rate limit. `allow(key: string, now?: number): boolean` limits repeated posts.

- [ ] **Step 1: Write failing limiter test** with six calls from one key in one minute; the sixth must be rejected while another key succeeds.
- [ ] **Step 2: Run `npm test`** and confirm the limiter test fails.
- [ ] **Step 3: Implement** limiter, route handler and accessible two-form public page. Forms submit JSON, display field/general errors and show returned request ID. The route derives the rate-limit key from connection IP, caps body size, parses input, saves it and returns ID.
- [ ] **Step 4: Run `npm test`, `npm run build`** and manually submit both request types through the browser at mobile and desktop widths.
- [ ] **Step 5: Commit** with `git add app lib/limit.ts tests/limit.test.ts && git commit -m "feat: accept public requests"`.

### Task 3: Admin authentication and workflow

**Files:** Create `lib/auth.ts`, `tests/auth.test.ts`, `app/api/admin/login/route.ts`, `app/api/admin/logout/route.ts`, `app/api/admin/requests/[id]/route.ts`, `app/admin/login/page.tsx`, `app/admin/page.tsx`, `app/admin/requests/[id]/page.tsx`.

**Interfaces:** `verifyPassword(password): boolean`, `createSession(): string`, `readSession(token): boolean`, `requireAdmin(): Promise<boolean>`, `sameOrigin(request): boolean`. Admin update accepts `{status, internalNote}`; only one of four exact statuses is valid.

- [ ] **Step 1: Write failing auth tests** for correct/incorrect password, expired/tampered session and mismatched origin.
- [ ] **Step 2: Run `npm test`** and confirm each test fails for missing behavior.
- [ ] **Step 3: Implement** scrypt password hash verification from environment, HMAC-signed expiring cookie, login rate limit, origin checks and protected admin pages/endpoints. Use server rendering for list/details; update via a form. Logout clears the cookie.
- [ ] **Step 4: Run `npm test`, `npm run build`** and manually verify anonymous denial, login, list/filter/detail, note/status update and logout.
- [ ] **Step 5: Commit** with `git add lib/auth.ts tests/auth.test.ts app/admin app/api/admin && git commit -m "feat: process requests in admin"`.

### Task 4: Operation guide and acceptance

**Files:** Create `README.md`, `.env.example`; refine any files from prior tasks that fail acceptance.

**Interfaces:** Environment variables `DATA_DIR`, `ADMIN_PASSWORD_SCRYPT`, `SESSION_SECRET`; scripts `npm run dev`, `npm test`, `npm run build`, `npm run start`.

- [ ] **Step 1: Write documentation** with setup, password-hash generation command, local use, production HTTPS, persistent data directory and backup instructions.
- [ ] **Step 2: Run `npm test` and `npm run build`**; inspect exit codes and fix concrete failures.
- [ ] **Step 3: Run acceptance checks** for both request types, invalid form, unauthenticated access, admin status/note update, logout and mobile layout. Record observed results in the final report.
- [ ] **Step 4: Confirm** `.env` and SQLite data are ignored by Git and no actual credential appears in tracked files.
- [ ] **Step 5: Commit** with `git add README.md .env.example .gitignore && git commit -m "docs: explain setup and operations"`.
