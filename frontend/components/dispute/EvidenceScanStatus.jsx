'use client';

/**
 * Shows the virus-scan state of an uploaded evidence file and, only when the
 * scan came back clean, a link to open it. Every other state explains why the
 * file is unavailable instead of offering a link.
 *
 * scanStatus values come from the backend `dispute_evidence.scan_status`:
 * pending | clean | infected | error | skipped.
 */

export const SCAN_STATES = {
  pending: {
    label: 'Scanning',
    message:
      'This file is being checked for viruses. It will be available once the scan completes.',
    className: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  },
  clean: {
    label: 'Scan passed',
    message: 'No threats found.',
    className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  infected: {
    label: 'Blocked',
    message: 'A threat was detected in this file, so it cannot be opened.',
    className: 'bg-red-500/10 text-red-300 border-red-500/30',
  },
  error: {
    label: 'Scan failed',
    message: 'The virus scan could not complete. The file stays unavailable until it is rescanned.',
    className: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  },
  skipped: {
    label: 'Not scanned',
    message: 'This file was too large to scan automatically and is held for manual review.',
    className: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
  },
};

/** Unknown or missing statuses are treated as still pending, never as clean. */
export function scanStateFor(scanStatus) {
  return SCAN_STATES[scanStatus] ?? SCAN_STATES.pending;
}

/**
 * @param {{ evidence: { scanStatus?: string, fileUrl?: string, filename?: string } }} props
 */
export default function EvidenceScanStatus({ evidence }) {
  const status = evidence?.scanStatus in SCAN_STATES ? evidence.scanStatus : 'pending';
  const state = scanStateFor(status);
  const name = evidence?.filename || 'Evidence file';
  const canOpen = status === 'clean' && Boolean(evidence?.fileUrl);

  return (
    <div className={`rounded-lg border p-3 ${state.className}`} data-scan-status={status}>
      <div className="flex items-center justify-between gap-2">
        {canOpen ? (
          <a
            href={evidence.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline hover:opacity-80"
          >
            {name}
          </a>
        ) : (
          <span className="text-sm" aria-disabled="true">
            {name}
          </span>
        )}
        <span className="text-xs font-semibold">{state.label}</span>
      </div>
      {status !== 'clean' && (
        <p className="mt-1 text-xs" role={status === 'infected' ? 'alert' : undefined}>
          {state.message}
        </p>
      )}
    </div>
  );
}
