## Description

One PR for #590, #591, #592 and #593, one commit per issue. Each issue is scoped to its core part; the "Not done in this PR" lists show what is left.

### #590 Minimum milestone duration migration note

Done:
- `docs/storage-migration.md`: migration note explaining that changing `MIN_MILESTONE_DURATION_LEDGERS` only affects milestones created afterwards; existing milestones are grandfathered.
- Test `test_pre_existing_milestone_not_affected_by_subsequent_rejection` in `min_milestone_duration_tests.rs`.

Not done in this PR:
- Running the test: `escrow_contract` does not compile on `develop` (see Testing notes).

### #591 Ownership transfer requests (backend core)

Done:
- Prisma model `OwnershipTransferRequest` and migration `20260925000000_ownership_transfer_requests.js` (`up` / `down`).
- `POST /api/transfer-requests`: the escrow client proposes a transfer to a new address. Validates the id and address, requires an Active escrow, rejects the current client / freelancer / arbiter as recipient, allows one pending unexpired request per escrow, and expires requests after 7 days.
- `GET /api/transfer-requests?direction=incoming|outgoing`: pending, unexpired requests for the caller.
- 12 controller tests.

Not done in this PR:
- Accept / reject endpoints and the actual on-chain ownership change.
- Background expiry handling (expired rows are filtered out, not updated).
- Dashboard card for incoming requests.

### #592 Feature flag audit before / after

Done:
- `createFlag`, `updateFlag` and `deleteFlag` record a `{ before, after }` snapshot of the flag in the audit log metadata.
- Security fix: the controller logged the raw `x-admin-api-key` header as the audit actor. It now uses the admin id (`req.admin.adminId` / `req.adminId`).
- 2 new tests (snapshots, key never recorded).

Not done in this PR:
- Frontend diff view and the flag History panel.

### #593 Evidence scan status

Done:
- `EvidenceScanStatus` component for `pending`, `clean`, `infected`, `error` and `skipped` (unknown values are treated as pending). The file is only linked when the scan is `clean`; `infected` renders as an alert.
- 8 component tests.

Not done in this PR:
- Wiring the component into the dispute evidence page.
- Withholding the file URL server-side until the scan is clean.

## Testing notes

```bash
cd backend && NODE_OPTIONS=--experimental-vm-modules npx jest tests/transferRequestController.test.js tests/featureFlags.test.js
# 19 passed
cd frontend && npx jest tests/components/dispute/EvidenceScanStatus.test.jsx
# 8 passed
```

Pre-existing on `develop`, not changed here:
- `cargo test -p stellar-trust-escrow-contract` does not compile: `create_milestone` is defined twice in `contracts/escrow_contract/src/lib.rs`, plus unresolved `DataKey` imports in several modules. The #590 test could not be run for that reason.
- `npx prisma validate` fails on a duplicate `SystemConfig` model; this PR adds no new schema errors.

## Related Issue

Closes #590
Closes #591
Closes #592
Closes #593
