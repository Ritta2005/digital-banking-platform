
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const CUSTOMER_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/money', label: 'Deposit & Withdraw' },
  { to: '/transfer', label: 'Transfer Money' },
  { to: '/history', label: 'Transaction History' },
];

const MANAGER_LINKS = [
  { to: '/manager', label: 'Manager Dashboard', end: true },
  { to: '/manager/pending', label: 'Pending Approvals' },
  { to: '/manager/history', label: 'Approval History' },
  { to: '/manager/customers', label: 'Customer Management' },
];

export default function Layout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = role === 'manager'
    ? MANAGER_LINKS
    : CUSTOMER_LINKS;

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <NavLink to="/" className="brand">
          <span className="brand-mark">D</span>
          <span>DigitalBank</span>
        </NavLink>

        <p className="sidebar-label">MENU</p>

        <nav>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
              onClick={() => setMenuOpen(false)}
            >
              <span className="nav-indicator" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <p className="sim-note">
          Educational simulation. No real money.
        </p>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>

          <div className="topbar-user">
            <strong>{user?.full_name}</strong>
            <span className="role-tag">{role}</span>
          </div>

          <button
            className="btn btn-outline"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
