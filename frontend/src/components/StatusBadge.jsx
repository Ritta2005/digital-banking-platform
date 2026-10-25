import { STATUS_LABELS } from '../services/format.js';

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>;
}
