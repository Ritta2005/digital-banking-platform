import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatDate, formatMoney } from '../services/format.js';
import Alert from '../components/Alert.jsx';
import Loading from '../components/Loading.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function ManagerDashboard() {
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [threshold, setThreshold] = useState('0');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.pendingApprovals(), api.approvalHistory()])
      .then(([p, h]) => {
        setPending(p.data.approvals);
        setThreshold(p.data.threshold);
        setHistory(h.data.approvals);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Loading manager dashboard..." />;
  if (error) return <Alert type="error">{error}</Alert>;

  const approved = history.filter((h) => h.approval_status === 'APPROVED').length;
  const rejected = history.filter((h) => h.approval_status === 'REJECTED').length;

  return (
    <>
      <h1>Manager Dashboard</h1>
      <div className="cards">
        <div className="card card-highlight">
          <div className="card-label">Pending requests</div>
          <div className="card-value">{pending.length}</div>
        </div>
        <div className="card">
          <div className="card-label">Approved</div>
          <div className="card-value">{approved}</div>
        </div>
        <div className="card">
          <div className="card-label">Rejected</div>
          <div className="card-value">{rejected}</div>
        </div>
        <div className="card">
          <div className="card-label">Approval threshold</div>
          <div className="card-value small-value">{formatMoney(threshold)}</div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Waiting for your decision</h2>
          <Link to="/manager/pending">Open approvals</Link>
        </div>
        {pending.length === 0 ? (
          <EmptyState title="No pending requests" text="High-value transfers will appear here." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Requested</th><th>From</th><th>To</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {pending.slice(0, 5).map((a) => (
                  <tr key={a.approval_id}>
                    <td>{formatDate(a.requested_at)}</td>
                    <td>{a.sender_name}</td>
                    <td>{a.receiver_name}</td>
                    <td className="num">{formatMoney(a.amount)}</td>
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
