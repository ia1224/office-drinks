import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

/**
 * Route protection for Caretakers only (Dashboard, QR code).
 * Employees are redirected to /order.
 * Unauthenticated users are redirected to /login?tab=caretaker.
 */
export function CaretakerRoute({ children }) {
  const { isCaretaker, isEmployee } = useAuth();
  const location = useLocation();

  if (!isCaretaker) {
    if (isEmployee) {
      // Caretaker pages are strictly for caretakers; employees are sent to order
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
 * Caretakers are redirected to /dashboard (caretakers should NOT see order page).
 * Unauthenticated users are redirected to /login?tab=employee.
 */
export function EmployeeRoute({ children }) {
  const { isEmployee, isCaretaker } = useAuth();
  const location = useLocation();

  // Caretaker is strictly forbidden from order page per requirements
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
