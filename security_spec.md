# LOKODA MARKET — Firestore Security Specification

## 1. Data Invariants
1. **Default Deny:** Every path in `/databases/{database}/documents` is denied by default (`match /{document=**} { allow read, write: if false; }`).
2. **Verified Identity:** Every authenticated write requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Path & ID Hardening:** Every document ID (`cityId`, `categoryId`, `userId`, `listingId`, `transactionId`, `reportId`, `notificationId`, `logId`, `adminId`) must satisfy `^[a-zA-Z0-9_\-]+$` with length `1..128`.
4. **PII Isolation (Split Collection):** `/users/{userId}` holds only public storefront metadata (`name`, `businessName`, `role`, `city`, `neighborhood`, `avatarUrl`, `bio`, `status`, `rating`, `registeredAt`). Private PII (`email`, `phone`, `whatsapp`) is isolated inside `/users/{userId}/private/info`, strictly readable/writable only by `isOwner(userId)` or `isAdmin()`.
5. **Anti-Privilege Escalation:** Users creating `/users/{userId}` can only choose `role in ['buyer', 'seller']` and `status == 'active'`. Only bootstrapped admin (`federationopareko@gmail.com` with `email_verified == true`) or entries in `/admins/{uid}` have admin privileges. Client writes to `/admins/{adminId}` are completely forbidden.
6. **Strict Listing Ownership & Moderation:**
   - Public visitors can only `get` or `list` listings with `status == 'approved'`.
   - Vendors can `list`/`get` their own listings (`resource.data.sellerId == request.auth.uid`), regardless of status, and cannot view other vendors' pending/rejected/suspended listings.
   - Vendors cannot self-approve listings when `/settings/general.autoApproveListings == false`.
   - Suspended listings (`status == 'suspended'`) are terminal-locked against vendor edits; only an admin can override.
   - Listing photos are bounded (`1..5` items, max `150000` chars per compressed image/URL).
7. **Referential Integrity & Temporal Integrity:**
   - All `createdAt`, `updatedAt`, `timestamp`, `registeredAt`, and `resolvedAt` timestamps must match `request.time` (`serverTimestamp()`).
   - Favorites, transactions, and reports must reference an existing `/listings/{listingId}` document via `exists()`.
   - `admin_logs` are append-only by admins and strictly immutable (`update: false, delete: false`).
8. **Secure List Queries:** Every `allow list` block explicitly evaluates `resource.data` without relying on client-side query filtering and without `get()`/`exists()` inside `allow list`.

---

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return `PERMISSION_DENIED`)

1. **Identity Spoofing on Listing Create:** Authenticated user `user_A` attempts to create `/listings/lst_hack1` with `sellerId: "user_B"`.
2. **Privilege Escalation on Profile Create:** Authenticated user `user_A` attempts to create `/users/user_A` with `role: "admin"`.
3. **Self-Admin Promotion:** Authenticated user `user_A` attempts to create `/admins/user_A` to grant themselves super-admin access.
4. **PII Cross-User Read:** Authenticated user `user_A` attempts to read `/users/user_B/private/info` to steal `user_B`'s email and phone number.
5. **Shadow Update (Ghost Field Injection):** Authenticated user `user_A` updates their listing `/listings/lst_a` with an unauthorized field `isVerified: true` or `sellerVerified: true`.
6. **Moderation Bypass on Create:** Authenticated user `user_A` creates `/listings/lst_a` with `status: "approved"` while `/settings/general.autoApproveListings` is `false`.
7. **Terminal State Violation:** Vendor `user_A` attempts to edit `/listings/lst_suspended` after an admin set `status: "suspended"`.
8. **Timestamp Forgery:** Authenticated user `user_A` creates `/listings/lst_a` with a backdated `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
9. **Resource Poisoning / Oversized Payload:** Authenticated user `user_A` creates `/listings/lst_big` with a `title` of 5,000 characters or `photos` containing 10 elements or a 2MB string.
10. **Email Spoofing Attack:** User signs in with `email: "federationopareko@gmail.com"` and `email_verified: false` and attempts to approve a pending listing or read `/admin_logs`.
11. **Unscoped List Scraping:** Non-admin `user_A` runs an unfiltered `list` query on `/transactions` or `/reports` or tries to list `/listings` where `status == 'pending'` owned by `user_B`.
12. **Orphaned Transaction / Report Injection:** Authenticated user `user_A` creates `/reports/rep_fake` referencing a non-existent `listingId: "lst_does_not_exist"`.
