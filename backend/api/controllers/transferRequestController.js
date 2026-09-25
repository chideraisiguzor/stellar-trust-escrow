/**
 * Ownership transfer requests (off-chain handshake).
 *
 * The contract's `transfer_client_role` moves an escrow's client role in one
 * step, without the recipient's consent. These requests let the current
 * client ask first; the recipient sees pending requests addressed to them.
 * Accepting, rejecting and executing the on-chain transfer are separate steps.
 */

import prisma from '../../lib/prisma.js';
import { logControllerError } from '../../config/logger.js';

export const TRANSFER_REQUEST_TTL_DAYS = 7;
const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;
const DIRECTIONS = ['incoming', 'outgoing'];

function serialize(request, now = new Date()) {
  return {
    ...request,
    escrowId: request.escrowId.toString(),
    isExpired: request.expiresAt <= now,
  };
}

/**
 * POST /api/transfer-requests
 * Body: { escrowId: string|number, recipient: string }
 * The authenticated user must be the escrow's current client.
 */
export async function createTransferRequest(req, res) {
  try {
    const address = req.user?.address;
    if (!address) return res.status(401).json({ error: 'Authentication required' });

    const { escrowId: rawEscrowId, recipient } = req.body ?? {};
    if (!/^\d+$/.test(String(rawEscrowId ?? ''))) {
      return res.status(400).json({ error: 'escrowId must be a numeric id' });
    }
    if (typeof recipient !== 'string' || !STELLAR_ADDRESS.test(recipient)) {
      return res.status(400).json({ error: 'recipient must be a valid Stellar address' });
    }
    const escrowId = BigInt(rawEscrowId);

    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        clientAddress: true,
        freelancerAddress: true,
        arbiterAddress: true,
      },
    });
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
    if (escrow.clientAddress !== address) {
      return res.status(403).json({ error: 'Only the escrow client can request a transfer' });
    }
    if (escrow.status !== 'Active') {
      return res.status(409).json({ error: 'Only Active escrows can be transferred' });
    }
    if (
      [escrow.clientAddress, escrow.freelancerAddress, escrow.arbiterAddress].includes(recipient)
    ) {
      return res
        .status(400)
        .json({ error: 'recipient cannot be the current client, the freelancer or the arbiter' });
    }

    const now = new Date();
    const open = await prisma.ownershipTransferRequest.findFirst({
      where: { escrowId, status: 'pending', expiresAt: { gt: now } },
      select: { id: true },
    });
    if (open) {
      return res.status(409).json({ error: 'This escrow already has a pending transfer request' });
    }

    const request = await prisma.ownershipTransferRequest.create({
      data: {
        tenantId: escrow.tenantId,
        escrowId,
        fromAddress: address,
        toAddress: recipient,
        expiresAt: new Date(now.getTime() + TRANSFER_REQUEST_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    return res.status(201).json({ data: serialize(request, now) });
  } catch (err) {
    logControllerError('transferRequest.create', err, req);
    return res.status(500).json({ error: 'Failed to create transfer request' });
  }
}

/**
 * GET /api/transfer-requests?direction=incoming|outgoing
 * Pending, unexpired requests addressed to (incoming, default) or sent by
 * (outgoing) the authenticated user, soonest to expire first.
 */
export async function listTransferRequests(req, res) {
  try {
    const address = req.user?.address;
    if (!address) return res.status(401).json({ error: 'Authentication required' });

    const direction = req.query?.direction ?? 'incoming';
    if (!DIRECTIONS.includes(direction)) {
      return res.status(400).json({ error: `direction must be one of: ${DIRECTIONS.join(', ')}` });
    }

    const now = new Date();
    const requests = await prisma.ownershipTransferRequest.findMany({
      where: {
        [direction === 'incoming' ? 'toAddress' : 'fromAddress']: address,
        status: 'pending',
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: 'asc' },
    });
    return res.json({ data: requests.map((r) => serialize(r, now)) });
  } catch (err) {
    logControllerError('transferRequest.list', err, req);
    return res.status(500).json({ error: 'Failed to list transfer requests' });
  }
}

export default { createTransferRequest, listTransferRequests };
