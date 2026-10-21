# Shopee Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calculate service fees, show a per-order VietQR, collect delivery address and improve admin payment handling.

**Architecture:** The server validates and stores a fixed fee with each order, then returns a VietQR image URL containing that amount and a short transfer reference. Admin changes payment status manually. SQLite columns are added without deleting old orders.

**Tech Stack:** Next.js 16, TypeScript, Node.js SQLite, VietQR Quick Link.

**Spec:** `docs/superpowers/specs/2026-10-21-shopee-checkout-design.md`

## Global Constraints

- Service fee is 25.000đ per order request, plus optional 5.000đ warranty; goods are paid by customer upon receipt.
- Account requests have no set fee and no QR.
- Never mark a request paid merely because a QR was displayed.
- Bank recipient comes from the user-provided BIDV QR image; do not include customer information in the QR URL.

---

### Task 1: Price, address and payment model

**Files:** `lib/requests.ts`, `lib/db.ts`, `tests/requests.test.ts`, `tests/db.test.ts`.

**Interfaces:** `orderFee(voucher: string, warranty: boolean): number`; `RequestInput.address: string`; `RequestRecord.feeAmount: number`; `RequestRecord.paymentStatus: 'not_required' | 'pending' | 'confirmed'`.

- [ ] Write failing tests: voucher 40 with warranty costs 30_000; quantity does not change fee; order without address/phone fails; new order persists address, fee and pending payment; old schema migrates with defaults; admin updates payment status.
- [ ] Run `npm test` and confirm these tests fail for the intended missing behavior.
- [ ] Implement validation, fee snapshot and SQLite migration with bound parameters.
- [ ] Run `npm test`; commit model changes.

### Task 2: VietQR and customer confirmation

**Files:** `lib/payment.ts`, `tests/payment.test.ts`, `app/api/requests/route.ts`, `app/components/RequestForm.tsx`, `app/page.tsx`, `app/globals.css`.

**Interfaces:** `createPaymentDetails(id: string, amount: number): { amount: number; transferCode: string; qrUrl: string }`; public POST returns `{id, payment}` for order, `{id, payment: null}` for account.

- [ ] Write failing test that parses generated URL and checks BIN, account, amount and transfer code.
- [ ] Run `npm test` and confirm the missing function fails.
- [ ] Implement server-generated QR details and customer UI with amount, transfer code, QR, address and phone. Keep account request confirmation without QR.
- [ ] Run `npm test`, `npm run build` and browser-check fee preview and QR confirmation. Commit customer changes.

### Task 3: Admin payment workflow and layout

**Files:** `app/api/admin/requests/[id]/route.ts`, `app/admin/page.tsx`, `app/admin/requests/[id]/page.tsx`, `app/admin/requests/[id]/UpdateForm.tsx`, `app/globals.css`, `README.md`.

**Interfaces:** PATCH accepts `{status, internalNote, paymentStatus}`; only authenticated admin may confirm payment.

- [ ] Write/extend model test for payment transition and invalid account payment state.
- [ ] Update PATCH validation, admin dashboard, detail card and payment form.
- [ ] Run `npm test`, `npm run build`; browser-check admin if session is available. Check existing data migration.
- [ ] Document QR recipient, manual confirmation and deployment needs; commit changes.
