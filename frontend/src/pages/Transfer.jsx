import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatMoney } from '../services/format.js';
import Alert from '../components/Alert.jsx';
import Loading from '../components/Loading.jsx';

export default function Transfer() {
  const [info, setInfo] = useState(null); // { balance, threshold, accountNumber }
  const [loadError, setLoadError] = useState('');
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { type, text }
  const [submitting, setSubmitting] = useState(false);

  function loadInfo() {
    api
      .dashboard()
      .then((res) =>
        setInfo({
          balance: res.data.account.balance,
          threshold: res.data.approval_threshold,
          accountNumber: res.data.account.account_number,
        })
      )
      .catch((err) => setLoadError(err.message));
  }
  useEffect(loadInfo, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setErrors({});
    setResult(null);

    const eMap = {};
    if (!/^[0-9]{12}$/.test(receiver)) eMap.receiver_account_number = 'Enter the 12-digit account number.';
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) eMap.amount = 'Enter an amount greater than zero.';
    if (Object.keys(eMap).length > 0) {
      setErrors(eMap);
      return;
    }

    const needsApproval = Number(amount) >= Number(info.threshold);
    const confirmText = needsApproval
      ? `${formatMoney(amount)} is a high-value transfer. It will wait for manager approval and no money moves until then. Submit?`
      : `Transfer ${formatMoney(amount)} to account ${receiver}?`;
    if (!window.confirm(confirmText)) return;

    setSubmitting(true);
    try {
      const res = await api.transfer(receiver, amount, description);
      setResult({
        type: res.data.status === 'PENDING_APPROVAL' ? 'warning' : 'success',
        text: `${res.message} Reference: #${res.data.transaction_id}.`,
      });
      setReceiver('');
      setAmount('');
      setDescription('');
      loadInfo();
    } catch (err) {
      setError(err.message);
      setErrors(err.errors || {});
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) return <Alert type="error">{loadError}</Alert>;
  if (!info) return <Loading text="Loading..." />;

  return (
    <>
      <h1>Transfer Money</h1>
      <div className="cards">
        <div className="card card-highlight">
          <div className="card-label">Available balance</div>
          <div className="card-value">{formatMoney(info.balance)}</div>
          <div className="muted small">Your account: {info.accountNumber}</div>
        </div>
      </div>

      <Alert type="info">
        Transfers of {formatMoney(info.threshold)} or more need manager approval. Money moves only after it is approved.
      </Alert>

      <form className="panel narrow" onSubmit={handleSubmit} noValidate>
        <Alert type={result?.type}>{result?.text}</Alert>
        <Alert type="error">{error}</Alert>

        <label htmlFor="receiver">Receiver account number</label>
        <input id="receiver" value={receiver} inputMode="numeric" maxLength={12} placeholder="12 digits" onChange={(e) => setReceiver(e.target.value)} />
        {errors.receiver_account_number && <div className="field-error">{errors.receiver_account_number}</div>}

        <label htmlFor="amount">Amount (₹)</label>
        <input id="amount" value={amount} inputMode="decimal" placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
        {errors.amount && <div className="field-error">{errors.amount}</div>}

        <label htmlFor="desc">Note (optional)</label>
        <input id="desc" value={description} maxLength={100} onChange={(e) => setDescription(e.target.value)} />

        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Send money'}
        </button>
        {result && <p><Link to="/history">View transaction history</Link></p>}
      </form>
    </>
  );
}
