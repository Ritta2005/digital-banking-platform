import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import Alert from '../components/Alert.jsx';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm({ ...form, [field]: value });
  }

  // Quick checks in the browser. PHP checks everything again.
  function validate() {
    const e = {};
    if (form.full_name.trim().length < 2) e.full_name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address.';
    if (!/^[0-9]{10,15}$/.test(form.phone)) e.phone = 'Phone must be 10 to 15 digits.';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password))
      e.password = 'At least 8 characters with a letter and a number.';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      const res = await api.register({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      navigate('/login', {
        state: { message: `Registration successful! Your account number is ${res.data.account_number}. Please log in.` },
      });
    } catch (err) {
      setError(err.message);
      setErrors(err.errors || {});
    } finally {
      setSubmitting(false);
    }
  }

  const field = (id, label, type = 'text', extra = {}) => (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={form[id]} onChange={(e) => update(id, e.target.value)} {...extra} />
      {errors[id] && <div className="field-error">{errors[id]}</div>}
    </>
  );

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="muted">A free simulated savings account is created for you.</p>
        <Alert type="error">{error}</Alert>
        <form onSubmit={handleSubmit} noValidate>
          {field('full_name', 'Full name')}
          {field('email', 'Email', 'email')}
          {field('phone', 'Phone (digits only)', 'tel', { inputMode: 'numeric' })}
          {field('password', 'Password', 'password', { autoComplete: 'new-password' })}
          {field('confirm', 'Confirm password', 'password', { autoComplete: 'new-password' })}
          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="center">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
