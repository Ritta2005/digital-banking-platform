import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { formatDate, formatMoney } from '../services/format.js';
import Alert from '../components/Alert.jsx';
import Loading from '../components/Loading.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function PendingApprovals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // The request the manager is about to approve/reject:
  const [selected, setSelected] = useState(null); // { approval, decision }
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    api
      .pendingApprovals()
      .then((res) => setApprovals(res.data.approvals))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function choose(approval, decision) {
    setSelected({ approval, decision });
    setRemarks('');
    setFormError('');
    setMessage({ type: '', text: '' });
  }

  async function confirmDecision(e) {
    e.preventDefault();
    const { approval, decision } = selected;
    if (decision === 'REJECT' && remarks.trim() === '') {
      setFormError('Please enter a reason for rejection.');
      return;
    }
    const word = decision === 'APPROVE' ? 'approve' : 'reject';
    if (!window.confirm(`Are you sure you want to ${word} the transfer of ${formatMoney(approval.amount)}?`)) return;

    setSubmitting(true);
    setFormError('');
    try {
      const res = await api.decideApproval(approval.approval_id, decision, remarks.trim());
      setMessage({ type: 'success', text: res.message });
      setSelected(null);
      load(); // refresh the list
    } catch (err) {
      setFormError(err.message);
      if (err.status === 409) load(); // already processed: refresh the list
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1>Pending Approvals</h1>
      <Alert type={message.type}>{message.text}</Alert>
      <Alert type="error">{error}</Alert>

      {selected && (
        <form className="panel decision" onSubmit={confirmDecision}>
          <h2>{selected.decision === 'APPROVE' ? 'Approve' : 'Reject'} transfer #{selected.approval.transaction_id}</h2>
          <p>
            {formatMoney(selected.approval.amount)} from <strong>{selected.approval.sender_name}</strong> ({selected.approval.sender_account_number}) to{' '}
            <strong>{selected.approval.receiver_name}</strong> ({selected.approval.receiver_account_number})
          </p>
          <Alert type="error">{formError}</Alert>
          <label>{selected.decision === 'REJECT' ? 'Reason for rejection (required)' : 'Remarks (optional)'}</label>
          <textarea rows={2} maxLength={255} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          <div className="actions">
            <button className={selected.decision === 'APPROVE' ? 'btn btn-success' : 'btn btn-danger'} disabled={submitting}>
              {submitting ? 'Please wait...' : `Confirm ${selected.decision === 'APPROVE' ? 'approval' : 'rejection'}`}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setSelected(null)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <Loading text="Loading requests..." /> : (
        <section className="panel">
          {approvals.length === 0 ? (
            <EmptyState title="No pending requests" text="You are all caught up." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>Requested</th><th>Sender</th><th>Receiver</th><th className="num">Amount</th><th>Note</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {approvals.map((a) => (
                    <tr key={a.approval_id}>
                      <td>{a.transaction_id}</td>
                      <td>{formatDate(a.requested_at)}</td>
                      <td>{a.sender_name}<div className="muted small">{a.sender_account_number}</div></td>
                      <td>{a.receiver_name}<div className="muted small">{a.receiver_account_number}</div></td>
                      <td className="num">{formatMoney(a.amount)}</td>
                      <td>{a.description}</td>
                      <td className="row-actions">
                        <button className="btn btn-success btn-sm" onClick={() => choose(a, 'APPROVE')}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => choose(a, 'REJECT')}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
