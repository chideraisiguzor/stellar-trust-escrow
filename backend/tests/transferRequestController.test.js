import { jest } from '@jest/globals';

const prismaMock = {
  escrow: { findUnique: jest.fn() },
  ownershipTransferRequest: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
};

jest.unstable_mockModule('../lib/prisma.js', () => ({ default: prismaMock }));

const { createTransferRequest, listTransferRequests, TRANSFER_REQUEST_TTL_DAYS } =
  await import('../api/controllers/transferRequestController.js');

const CLIENT = `G${'A'.repeat(55)}`;
const FREELANCER = `G${'B'.repeat(55)}`;
const ARBITER = `G${'C'.repeat(55)}`;
const RECIPIENT = `G${'D'.repeat(55)}`;

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status: jest.fn().mockImplementation((code) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn().mockImplementation((payload) => {
      res.body = payload;
      return res;
    }),
  };
  return res;
}

const activeEscrow = {
  id: 42n,
  tenantId: 't1',
  status: 'Active',
  clientAddress: CLIENT,
  freelancerAddress: FREELANCER,
  arbiterAddress: ARBITER,
};

async function create(body, user = { address: CLIENT }) {
  const res = createMockRes();
  await createTransferRequest({ user, body }, res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.escrow.findUnique.mockResolvedValue(activeEscrow);
  prismaMock.ownershipTransferRequest.findFirst.mockResolvedValue(null);
  prismaMock.ownershipTransferRequest.create.mockImplementation(({ data }) =>
    Promise.resolve({ id: 'r1', status: 'pending', createdAt: new Date(), ...data }),
  );
});

describe('createTransferRequest', () => {
  it('creates a pending request from the client with a 7-day expiry', async () => {
    const before = Date.now();
    const res = await create({ escrowId: '42', recipient: RECIPIENT });

    expect(res.statusCode).toBe(201);
    const { data } = prismaMock.ownershipTransferRequest.create.mock.calls[0][0];
    expect(data).toMatchObject({
      tenantId: 't1',
      escrowId: 42n,
      fromAddress: CLIENT,
      toAddress: RECIPIENT,
    });
    const ttlMs = data.expiresAt.getTime() - before;
    expect(ttlMs).toBeGreaterThanOrEqual(TRANSFER_REQUEST_TTL_DAYS * 24 * 3600 * 1000 - 1000);
    expect(res.body.data).toMatchObject({ escrowId: '42', isExpired: false });
  });

  it('only lets the escrow client create a request', async () => {
    const res = await create({ escrowId: '42', recipient: RECIPIENT }, { address: FREELANCER });
    expect(res.statusCode).toBe(403);
    expect(prismaMock.ownershipTransferRequest.create).not.toHaveBeenCalled();
  });

  it('rejects non-Active escrows', async () => {
    prismaMock.escrow.findUnique.mockResolvedValue({ ...activeEscrow, status: 'Disputed' });
    const res = await create({ escrowId: '42', recipient: RECIPIENT });
    expect(res.statusCode).toBe(409);
  });

  it.each([
    ['the client', CLIENT],
    ['the freelancer', FREELANCER],
    ['the arbiter', ARBITER],
  ])('rejects %s as the recipient', async (_who, recipient) => {
    const res = await create({ escrowId: '42', recipient });
    expect(res.statusCode).toBe(400);
  });

  it('validates the escrow id and recipient address', async () => {
    expect((await create({ escrowId: 'abc', recipient: RECIPIENT })).statusCode).toBe(400);
    expect((await create({ escrowId: '42', recipient: 'not-an-address' })).statusCode).toBe(400);
  });

  it('allows only one pending request per escrow', async () => {
    prismaMock.ownershipTransferRequest.findFirst.mockResolvedValue({ id: 'existing' });
    const res = await create({ escrowId: '42', recipient: RECIPIENT });
    expect(res.statusCode).toBe(409);
  });

  it('returns 404 for an unknown escrow and 401 without a user', async () => {
    prismaMock.escrow.findUnique.mockResolvedValue(null);
    expect((await create({ escrowId: '42', recipient: RECIPIENT })).statusCode).toBe(404);
    expect((await create({ escrowId: '42', recipient: RECIPIENT }, null)).statusCode).toBe(401);
  });
});

describe('listTransferRequests', () => {
  async function list(query, user = { address: RECIPIENT }) {
    const res = createMockRes();
    await listTransferRequests({ user, query }, res);
    return res;
  }

  it('lists pending, unexpired requests addressed to the user by default', async () => {
    prismaMock.ownershipTransferRequest.findMany.mockResolvedValue([
      { id: 'r1', escrowId: 42n, expiresAt: new Date(Date.now() + 60_000) },
    ]);

    const res = await list({});

    const { where, orderBy } = prismaMock.ownershipTransferRequest.findMany.mock.calls[0][0];
    expect(where).toMatchObject({ toAddress: RECIPIENT, status: 'pending' });
    expect(where.expiresAt.gt).toBeInstanceOf(Date);
    expect(orderBy).toEqual({ expiresAt: 'asc' });
    expect(res.body.data).toEqual([expect.objectContaining({ escrowId: '42', isExpired: false })]);
  });

  it('lists requests the user sent with direction=outgoing', async () => {
    prismaMock.ownershipTransferRequest.findMany.mockResolvedValue([]);
    await list({ direction: 'outgoing' }, { address: CLIENT });
    const { where } = prismaMock.ownershipTransferRequest.findMany.mock.calls[0][0];
    expect(where).toMatchObject({ fromAddress: CLIENT });
  });

  it('rejects an unknown direction', async () => {
    expect((await list({ direction: 'sideways' })).statusCode).toBe(400);
  });
});
