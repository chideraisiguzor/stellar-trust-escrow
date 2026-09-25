/**
 * Ownership Transfer Request Routes
 *
 * Off-chain requests to hand an escrow's client role to another address.
 */

import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createTransferRequest,
  listTransferRequests,
} from '../controllers/transferRequestController.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * @route  POST /api/transfer-requests
 * @desc   Ask `recipient` to take over the client role of an Active escrow.
 * @body   { escrowId: string, recipient: string }
 */
router.post('/', createTransferRequest);

/**
 * @route  GET /api/transfer-requests
 * @desc   Pending, unexpired requests addressed to (incoming) or sent by (outgoing) the user.
 * @query  direction=incoming|outgoing (default incoming)
 */
router.get('/', listTransferRequests);

export default router;
