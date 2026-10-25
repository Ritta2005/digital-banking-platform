import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';

export default function Login() {
  const { user, role, login, notice, setNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginRole, setLoginRole] = useState('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in? Go to your home page.
  if (user) return <Navigate to={role === 'manager' ? '/manager' : '/dashboard'} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const r = await login(loginRole, email.trim(), password);
      navigate(r === 'manager' ? '/manager' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>🏦 Digital Banking Platform</h1>
        <p className="muted">Smart Transaction Management (college simulation)</p>

        <div className="tabs">
          <button type="button" className={loginRole === 'customer' ? 'tab active' : 'tab'} onClick={() => setLoginRole('customer')}>
            Customer
          </button>
          <button type="button" className={loginRole === 'manager' ? 'tab active' : 'tab'} onClick={() => setLoginRole('manager')}>
            Manager
          </button>
        </div>

        <Alert type="success">{location.state?.message}</Alert>
        <Alert type="warning">{notice}</Alert>
        <Alert type="error">{error}</Alert>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setNotice(''); }} autoComplete="username" />

          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />

          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Logging in...' : `Log in as ${loginRole}`}
          </button>
        </form>

        {loginRole === 'customer' && (
          <p className="center">
            New customer? <Link to="/register">Create an account</Link>
          </p>
        )}

        <div className="demo-box">
          <strong>Demo logins</strong>
          <div>Customer: aarav.demo@example.com / Customer@123</div>
          <div>Customer: meera.demo@example.com / Customer@123</div>
          <div>Manager: manager.demo@example.com / Manager@123</div>
        </div>
      </div>
    </div>
  );
}
