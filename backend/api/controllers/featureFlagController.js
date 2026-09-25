import { listFlags, createFlag, updateFlag, deleteFlag } from '../../services/featureFlags.js';

/**
 * Identity recorded as the audit actor: the admin id from the session token,
 * or the fixed id set for API-key auth. Never the raw `x-admin-api-key`
 * header, which would write the admin secret into the audit log.
 */
function auditActor(req) {
  return req.admin?.adminId ?? req.adminId ?? 'admin';
}

export async function index(req, res) {
  const tenantId = req.query.tenantId || req.tenant?.id || null;
  const flags = await listFlags(tenantId);
  res.json({ data: flags });
}

export async function create(req, res) {
  try {
    const adminId = auditActor(req);
    const tenantId = req.body.tenantId || req.tenant?.id || null;
    const flag = await createFlag({ ...req.body, tenantId }, adminId);
    res.status(201).json({ data: flag });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Flag key already exists.' });
    res.status(400).json({ error: err.message });
  }
}

export async function update(req, res) {
  try {
    const key = req.params.key || req.params.name;
    const adminId = auditActor(req);
    const flag = await updateFlag(key, req.body, adminId);
    res.json({ data: flag });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Flag not found.' });
    res.status(400).json({ error: err.message });
  }
}

export async function destroy(req, res) {
  try {
    const key = req.params.key || req.params.name;
    const adminId = auditActor(req);
    await deleteFlag(key, adminId);
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Flag not found.' });
    res.status(400).json({ error: err.message });
  }
}
