
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Loading from './components/Loading.jsx';

import Welcome from './pages/Welcome.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MoneyOps from './pages/MoneyOps.jsx';
import Transfer from './pages/Transfer.jsx';
import History from './pages/History.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import PendingApprovals from './pages/PendingApprovals.jsx';
import ApprovalHistory from './pages/ApprovalHistory.jsx';
import Customers from './pages/Customers.jsx';

// Show the welcome page to visitors.
function Home() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <Loading text="Loading..." />;
  }

  if (!user) {
    return <Welcome />;
  }

  return (
    <Navigate
      to={role === 'manager' ? '/manager' : '/dashboard'}
      replace
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* Authentication pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Customer pages */}
      <Route
        element={
          <ProtectedRoute role="customer">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/money" element={<MoneyOps />} />
        <Route path="/transfer" element={<Transfer />} />
        <Route path="/history" element={<History />} />
      </Route>

      {/* Manager pages */}
      <Route
        element={
          <ProtectedRoute role="manager">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/manager" element={<ManagerDashboard />} />
        <Route
          path="/manager/pending"
          element={<PendingApprovals />}
        />
        <Route
          path="/manager/history"
          element={<ApprovalHistory />}
        />
        <Route
          path="/manager/customers"
          element={<Customers />}
        />
      </Route>

      {/* Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
