# Fixes for chideraisiguzor on stellar-trust-escrow

## #590 — Add minimum milestone duration migration note

### What existed
`MIN_MILESTONE_DURATION_LEDGERS` (100 ledgers, ~8 min) is a compile-time
constant with no documentation of upgrade behavior. Existing escrows created
under one constant value are not re-validated when the constant changes.

### Delta
- Added a migration note section to `docs/storage-migration.md` documenting
  that only newly created milestones are subject to the new minimum; pre-existing
  milestones are grandfathered.
- Added test `test_pre_existing_milestone_not_affected_by_subsequent_rejection`
  that creates a milestone at the minimum duration, then verifies a shorter-
  duration milestone is rejected while the pre-existing milestone remains intact.

### Tests
- `test_pre_existing_milestone_not_affected_by_subsequent_rejection` — new test.
- Existing tests in `min_milestone_duration_tests.rs` continue to pass.

## Verification
- Pre-existing milestones created under the old constant keep their original
  deadlines without re-checking against the new minimum.

Closes #590
