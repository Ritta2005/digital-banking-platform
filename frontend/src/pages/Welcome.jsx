
import { Link } from 'react-router-dom';
import './Welcome.css';

export default function Welcome() {
  return (
    <div className="welcome-page">
      <nav className="welcome-nav">
        <Link to="/" className="welcome-logo">
          <span className="logo-mark">D</span>
          DigitalBank
        </Link>

        <div className="welcome-nav-links">
          <Link to="/login" className="nav-login">
            Login
          </Link>
          <Link to="/register" className="nav-register">
            Open an Account
          </Link>
        </div>
      </nav>

      <main className="welcome-hero">
        <div className="welcome-content">
          <span className="welcome-label">
            BANKING MADE SIMPLE
          </span>

          <h1>
            Your money.
            <br />
            Your future.
            <br />
            <span>All in one place.</span>
          </h1>

          <p>
            A simpler way to manage your money.
            Transfer funds, track transactions, and
            stay in control of your finances securely.
          </p>

          <div className="welcome-actions">
            <Link to="/login" className="primary-action">
              Login to Banking →
            </Link>
            <Link to="/register" className="secondary-action">
              Create Account
            </Link>
          </div>

          <div className="welcome-trust">
            <span>Secure access</span>
            <span>Easy transfers</span>
            <span>Clear transaction history</span>
          </div>
        </div>

        <div className="welcome-visual">
          <div className="bank-card">
            <div className="bank-card-top">
              <span>DigitalBank</span>
              <span className="card-chip">▦</span>
            </div>

            <p className="card-label">
              YOUR MONEY, MANAGED BETTER
            </p>

            <div className="card-number">
              •••• &nbsp; •••• &nbsp; •••• &nbsp; ••••
            </div>

            <div className="card-bottom">
              <span>SMART BANKING</span>
              <span className="card-symbol">D</span>
            </div>
          </div>

          <div className="visual-caption">
            <span className="caption-dot" />
            <div>
              <strong>Banking at your fingertips</strong>
              <p>
                Manage your everyday transactions in one place.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="welcome-footer">
        <span>DigitalBank</span>
        <span>Simple. Smart. Secure.</span>
      </footer>
    </div>
  );
}
