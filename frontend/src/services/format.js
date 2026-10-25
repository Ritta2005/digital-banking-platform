// Small helpers to show money and dates nicely.
export function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '₹0.00';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(value) {
  if (!value) return '-';
  // MySQL gives "2026-10-20 18:11:50"; make it readable.
  const d = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const STATUS_LABELS = {
  COMPLETED: 'Completed',
  PENDING_APPROVAL: 'Pending approval',
  REJECTED: 'Rejected',
  FAILED: 'Failed',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  FROZEN: 'Frozen',
  CLOSED: 'Closed',
};
