import { render, screen } from '@testing-library/react';
import EvidenceScanStatus, {
  SCAN_STATES,
  scanStateFor,
} from '../../../components/dispute/EvidenceScanStatus';

const file = (scanStatus) => ({
  scanStatus,
  filename: 'contract.pdf',
  fileUrl: 'https://gateway.example/ipfs/cid',
});

describe('EvidenceScanStatus', () => {
  it('links to a clean file', () => {
    render(<EvidenceScanStatus evidence={file('clean')} />);

    expect(screen.getByRole('link', { name: 'contract.pdf' })).toHaveAttribute(
      'href',
      'https://gateway.example/ipfs/cid',
    );
    expect(screen.getByText('Scan passed')).toBeInTheDocument();
  });

  it.each([
    ['pending', 'Scanning', SCAN_STATES.pending.message],
    ['infected', 'Blocked', SCAN_STATES.infected.message],
    ['error', 'Scan failed', SCAN_STATES.error.message],
    ['skipped', 'Not scanned', SCAN_STATES.skipped.message],
  ])('shows %s evidence with its own copy and no link', (status, label, message) => {
    render(<EvidenceScanStatus evidence={file(status)} />);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('announces infected evidence as an alert', () => {
    render(<EvidenceScanStatus evidence={file('infected')} />);

    expect(screen.getByRole('alert')).toHaveTextContent('cannot be opened');
  });

  it('never treats an unknown or missing status as clean', () => {
    expect(scanStateFor(undefined)).toBe(SCAN_STATES.pending);
    render(<EvidenceScanStatus evidence={file('mystery')} />);

    expect(screen.getByText('Scanning')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('shows no link for a clean scan without a file URL', () => {
    render(<EvidenceScanStatus evidence={{ scanStatus: 'clean', filename: 'x.png' }} />);

    expect(screen.queryByRole('link')).toBeNull();
  });
});
