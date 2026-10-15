import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

/**
 * Route protection for Admin only (Order History, Analytics, System Admin).
 * Caretakers are redirected to /dashboard.
 * Employees are redirected to /order.
 * Unauthenticated users are redirected to /login?tab=admin.
 */
export function AdminRoute({ children }) {
  const { isAdmin, isCaretaker, isEmployee } = useAuth();
  const location = useLocation();

  if (!isAdmin) {
    if (isCaretaker) {
      return <Navigate to="/dashboard" replace />;
    }
    if (isEmployee) {
      return <Navigate to="/order" replace />;
    }
    return (
      <Navigate
        to="/login?tab=admin"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return children;
}

/**
 * Route protection for Caretakers and Admins (Dashboard, QR code).
 * Employees are redirected to /order.
 * Unauthenticated users are redirected to /login?tab=caretaker.
 */
export function CaretakerRoute({ children }) {
  const { isCaretaker, isEmployee } = useAuth();
  const location = useLocation();

  if (!isCaretaker) {
    if (isEmployee) {
      // Caretaker pages are strictly for staff; employees are sent to order
      return <Navigate to="/order" replace />;
    }
    return (
      <Navigate
        to="/login?tab=caretaker"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return children;
}

/**
 * Route protection for Employees only (Order page).
 * Admins and Caretakers are redirected to their respective dashboards.
 * Unauthenticated users are redirected to /login?tab=employee.
 */
export function EmployeeRoute({ children }) {
  const { isEmployee, isAdmin, isCaretaker } = useAuth();
  const location = useLocation();

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isCaretaker) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isEmployee) {
    return (
      <Navigate
        to="/login?tab=employee"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return children;
}

// Backwards compatibility default export
export default CaretakerRoute;
