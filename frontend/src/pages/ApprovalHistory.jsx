import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { formatDate, formatMoney } from '../services/format.js';
import Alert from '../components/Alert.jsx';
import Loading from '../components/Loading.jsx';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function ApprovalHistory() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .approvalHistory()
      .then((res) => setApprovals(res.data.approvals))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Loading history..." />;

  return (
    <>
      <h1>Approval History</h1>
      <Alert type="error">{error}</Alert>
      <section className="panel">
        {approvals.length === 0 ? (
          <EmptyState title="No processed requests yet" text="Approved and rejected transfers will be listed here." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Decided</th><th>Sender</th><th>Receiver</th><th className="num">Amount</th><th>Decision</th><th>Manager</th><th>Remarks</th></tr>
              </thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.approval_id}>
                    <td>{a.transaction_id}</td>
                    <td>{formatDate(a.decided_at)}</td>
                    <td>{a.sender_name}<div className="muted small">{a.sender_account_number}</div></td>
                    <td>{a.receiver_name}<div className="muted small">{a.receiver_account_number}</div></td>
                    <td className="num">{formatMoney(a.amount)}</td>
                    <td><StatusBadge status={a.approval_status} /></td>
                    <td>{a.manager_name}</td>
                    <td>{a.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
