import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Loading from './Loading.jsx';

// Only lets the right role see the page. (PHP ALSO checks the role on every API call.)
export default function ProtectedRoute({ role, children }) {
  const { user, role: userRole, loading } = useAuth();
  if (loading) return <Loading text="Checking your login..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (userRole !== role) {
    return <Navigate to={userRole === 'manager' ? '/manager' : '/dashboard'} replace />;
  }
  return children;
}
