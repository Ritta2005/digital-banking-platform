import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { formatMoney } from '../services/format.js';
import Alert from '../components/Alert.jsx';
import Loading from '../components/Loading.jsx';

// One small form used twice: once for deposit, once for withdraw.
function MoneyForm({ title, buttonText, action, onDone }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setError('');
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError('Enter an amount greater than zero (up to 2 decimals).');
      return;
    }
    if (!window.confirm(`${title} ${formatMoney(amount)}. Do you want to continue?`)) return;

    setSubmitting(true);
    try {
      const res = await action(amount, description);
      setMessage({ type: 'success', text: `${res.message} New balance: ${formatMoney(res.data.balance)}` });
      setAmount('');
      setDescription('');
      onDone(); // refresh the balance shown above
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <h2>{title}</h2>
      <Alert type="success">{message.text}</Alert>
      <Alert type="error">{error}</Alert>
      <label>Amount (₹)</label>
      <input type="text" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <label>Note (optional)</label>
      <input type="text" maxLength={100} value={description} onChange={(e) => setDescription(e.target.value)} />
      <button className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Please wait...' : buttonText}
      </button>
    </form>
  );
}

export default function MoneyOps() {
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');

  function loadBalance() {
    api
      .dashboard()
      .then((res) => setBalance(res.data.account.balance))
      .catch((err) => setError(err.message));
  }
  useEffect(loadBalance, []);

  if (error) return <Alert type="error">{error}</Alert>;
  if (balance === null) return <Loading text="Loading..." />;

  return (
    <>
      <h1>Deposit &amp; Withdraw</h1>
      <div className="card card-highlight inline-card">
        <div className="card-label">Available balance</div>
        <div className="card-value">{formatMoney(balance)}</div>
      </div>
      <div className="two-col">
        <MoneyForm title="Deposit" buttonText="Deposit money" action={api.deposit} onDone={loadBalance} />
        <MoneyForm title="Withdraw" buttonText="Withdraw money" action={api.withdraw} onDone={loadBalance} />
      </div>
    </>
  );
}
