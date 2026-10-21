# Customer accounts and request history

Approved design: customers register and sign in with phone/password; signed-in requests appear in personal history; older guest requests can be claimed with request code and matching phone. Admin login remains separate.

1. Add `users` and nullable `requests.userId` to SQLite. Hash passwords with scrypt and create signed, HTTP-only customer sessions using `SESSION_SECRET`. Test registration, login, session tampering, request ownership and claiming.
2. Add registration, login and logout API routes with input limits, origin checks and rate limits. Attach new requests to the signed-in user only when the request phone matches their account.
3. Add customer registration/login pages and a personal dashboard with history, statuses, payment details and delivered account credentials. Add a claim form for old guest requests. Keep the guest request and account retrieval flows.
4. Link the customer pages from the public header and show account association in admin. Verify tests, production build and browser layouts.
