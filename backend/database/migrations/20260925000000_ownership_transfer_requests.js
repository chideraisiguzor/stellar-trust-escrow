/**
 * Migration: Ownership transfer requests
 * Version:   20260925000000_ownership_transfer_requests
 *
 * Adds:
 *   - ownership_transfer_requests — off-chain requests to hand an escrow's
 *     client role to another address, pending the recipient's response
 */

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function up(prisma) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ownership_transfer_requests (
      id           TEXT        PRIMARY KEY,
      tenant_id    TEXT        NOT NULL,
      escrow_id    BIGINT      NOT NULL,
      from_address TEXT        NOT NULL,
      to_address   TEXT        NOT NULL,
      status       TEXT        NOT NULL DEFAULT 'pending',
      expires_at   TIMESTAMPTZ NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      responded_at TIMESTAMPTZ
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS ownership_transfer_requests_to_status_idx
       ON ownership_transfer_requests (to_address, status)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS ownership_transfer_requests_from_status_idx
       ON ownership_transfer_requests (from_address, status)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS ownership_transfer_requests_escrow_status_idx
       ON ownership_transfer_requests (escrow_id, status)`,
  );
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function down(prisma) {
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ownership_transfer_requests`);
}
