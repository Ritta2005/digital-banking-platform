import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatMoney } from '../services/format.js';
import Alert from '../components/Alert.jsx';
import Loading from '../components/Loading.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TransactionTable from '../components/TransactionTable.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError('');
    api
      .dashboard()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) return <Loading text="Loading your dashboard..." />;
  if (error)
    return (
      <>
        <Alert type="error">{error}</Alert>
        <button className="btn btn-outline" onClick={load}>Try again</button>
      </>
    );

  const { customer, account, recent_transactions, pending_transfers } = data;

  return (
    <>
      <h1>Welcome, {customer.full_name}</h1>

      <div className="cards">
        <div className="card card-highlight">
          <div className="card-label">Available balance</div>
          <div className="card-value">{formatMoney(account.balance)}</div>
        </div>
        <div className="card">
          <div className="card-label">Account number</div>
          <div className="card-value small-value">{account.account_number}</div>
          <div className="muted small">{account.account_type} account</div>
        </div>
        <div className="card">
          <div className="card-label">Account status</div>
          <div className="card-value small-value"><StatusBadge status={account.account_status} /></div>
        </div>
        <div className="card">
          <div className="card-label">Transfers awaiting approval</div>
          <div className="card-value">{pending_transfers}</div>
        </div>
      </div>

      <div className="actions">
        <Link className="btn btn-primary" to="/money">Deposit / Withdraw</Link>
        <Link className="btn btn-outline" to="/transfer">Transfer money</Link>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Recent transactions</h2>
          <Link to="/history">View all</Link>
        </div>
        <TransactionTable transactions={recent_transactions} />
      </section>
    </>
  );
}
