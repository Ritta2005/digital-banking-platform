import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import Alert from '../components/Alert.jsx';
import Loading from '../components/Loading.jsx';
import TransactionTable from '../components/TransactionTable.jsx';

const EMPTY = { type: '', status: '', from: '', to: '', search: '' };

export default function History() {
  const [filters, setFilters] = useState(EMPTY); // what is typed in the boxes
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load(activeFilters) {
    setLoading(true);
    setError('');
    api
      .transactions(activeFilters)
      .then((res) => setTransactions(res.data.transactions))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(EMPTY), []);

  function set(field, value) {
    setFilters({ ...filters, [field]: value });
  }

  function handleApply(e) {
    e.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) {
      setError('The "From" date must be before the "To" date.');
      return;
    }
    load(filters);
  }

  function handleReset() {
    setFilters(EMPTY);
    load(EMPTY);
  }

  return (
    <>
      <h1>Transaction History</h1>
      <form className="panel filters" onSubmit={handleApply}>
        <div>
          <label>Type</label>
          <select value={filters.type} onChange={(e) => set('type', e.target.value)}>
            <option value="">All</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </div>
        <div>
          <label>Status</label>
          <select value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">All</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING_APPROVAL">Pending approval</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div>
          <label>From date</label>
          <input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />
        </div>
        <div>
          <label>To date</label>
          <input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} />
        </div>
        <div>
          <label>Search</label>
          <input type="text" placeholder="Note or account no." value={filters.search} onChange={(e) => set('search', e.target.value)} />
        </div>
        <div className="filter-buttons">
          <button className="btn btn-primary">Apply</button>
          <button type="button" className="btn btn-outline" onClick={handleReset}>Reset</button>
        </div>
      </form>

      <Alert type="error">{error}</Alert>
      {loading ? <Loading text="Loading transactions..." /> : (
        <section className="panel">
          <TransactionTable transactions={transactions} />
        </section>
      )}
    </>
  );
}
