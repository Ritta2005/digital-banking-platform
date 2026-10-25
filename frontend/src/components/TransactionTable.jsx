import { formatDate, formatMoney } from '../services/format.js';
import StatusBadge from './StatusBadge.jsx';
import EmptyState from './EmptyState.jsx';

// Describes "who" the money went to / came from.
function details(t) {
  if (t.transaction_type === 'DEPOSIT') return 'Deposit to your account';
  if (t.transaction_type === 'WITHDRAWAL') return 'Withdrawal from your account';
  return t.direction === 'DEBIT'
    ? `Transfer to ${t.receiver_account_number}`
    : `Transfer from ${t.sender_account_number}`;
}

export default function TransactionTable({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return <EmptyState title="No transactions found" text="Transactions will appear here once you use your account." />;
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Details</th>
            <th>Direction</th>
            <th className="num">Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const isDebit = t.direction === 'DEBIT';
            // Only completed transactions actually moved money.
            const moved = t.transaction_status === 'COMPLETED';
            return (
              <tr key={t.transaction_id}>
                <td>{formatDate(t.created_at)}</td>
                <td>{t.transaction_type}</td>
                <td>
                  {details(t)}
                  {t.description && <div className="muted small">{t.description}</div>}
                </td>
                <td>
                  <span className={isDebit ? 'dir-debit' : 'dir-credit'}>{isDebit ? 'Debit ↑' : 'Credit ↓'}</span>
                </td>
                <td className={`num ${moved ? (isDebit ? 'dir-debit' : 'dir-credit') : 'muted'}`}>
                  {isDebit ? '−' : '+'}
                  {formatMoney(t.amount)}
                </td>
                <td>
                  <StatusBadge status={t.transaction_status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
