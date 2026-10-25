
import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { formatMoney } from '../services/format.js';
import Alert from '../components/Alert.jsx';
import Loading from '../components/Loading.jsx';

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadCustomers() {
    setError('');
    try {
      const response = await api.customers();
      setCustomers(response.data.customers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function startEdit(customer) {
    setEditingId(customer.customer_id);
    setForm({
      full_name: customer.full_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      password: '',
    });
    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (editingId) {
        await api.updateCustomer({
          customer_id: editingId,
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
        });
        setMessage('Customer updated successfully.');
      } else {
        await api.createCustomer(form);
        setMessage('Customer added successfully.');
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadCustomers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer) {
    const confirmed = window.confirm(
      `Delete customer ${customer.full_name}? Customers with a balance or transaction history cannot be deleted.`
    );

    if (!confirmed) return;

    setError('');
    setMessage('');

    try {
      await api.deleteCustomer(customer.customer_id);
      setMessage('Customer deleted successfully.');
      await loadCustomers();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Loading text="Loading customers..." />;

  return (
    <>
      <h1>Customer Management</h1>
      <p>Insert, view, update and delete customer records.</p>

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <section className="panel">
        <h2>{editingId ? 'Update Customer' : 'Add New Customer'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Full Name
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Email
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Phone
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
            </label>

            {!editingId && (
              <label>
                Initial Password
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
              </label>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Update Customer'
                  : 'Add Customer'}
            </button>

            {editingId && (
              <button type="button" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Registered Customers ({customers.length})</h2>
          <button type="button" onClick={loadCustomers}>
            Refresh
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Account Number</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr key={customer.customer_id}>
                  <td>{customer.customer_id}</td>
                  <td>{customer.full_name}</td>
                  <td>{customer.email}</td>
                  <td>{customer.phone || '-'}</td>
                  <td>{customer.account_number || '-'}</td>
                  <td>{formatMoney(customer.balance ?? '0')}</td>
                  <td>{customer.account_status || 'No account'}</td>
                  <td>
                    <div className="form-actions">
                      <button
                        type="button"
                        onClick={() => startEdit(customer)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(customer)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {customers.length === 0 && (
                <tr>
                  <td colSpan="8">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
