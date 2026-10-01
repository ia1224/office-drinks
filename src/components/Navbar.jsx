import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./Navbar.css";

function Navbar() {
  const { isCaretaker, isEmployee, employeeName, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath =
    location.pathname.toLowerCase().replace(/\/+$/, "") || "/";

  const isOrderActive = currentPath === "/order";
  const isDashboardActive = currentPath === "/dashboard";
  const isQrActive = currentPath === "/qr";
  const isLoginActive = currentPath === "/login";

  const handleCaretakerLogout = () => {
    logout();
    navigate("/login?tab=caretaker");
  };

  const handleEmployeeSwitch = () => {
    logout();
    navigate("/login?tab=employee");
  };

  // Determine brand link destination based on role
  const brandDestination = isCaretaker
    ? "/dashboard"
    : isEmployee
    ? "/order"
    : "/login";

  return (
    <nav className="office-navbar">
      <div className="navbar-container">
        <Link to={brandDestination} className="navbar-brand">
          <div className="brand-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">Office Barista</span>
            <span className="brand-subtitle">
              {isCaretaker
                ? "CARETAKER PORTAL"
                : isEmployee
                ? "EMPLOYEE ORDERS"
                : "PANTRY SYSTEM"}
            </span>
          </div>
        </Link>

        <div className="navbar-links">
          {/* Caretaker Views: Strictly only Dashboard and QR */}
          {isCaretaker && (
            <>
              <Link
                to="/dashboard"
                className={`nav-item ${isDashboardActive ? "active" : ""}`}
              >
                Dashboard
              </Link>
              <Link
                to="/qr"
                className={`nav-item ${isQrActive ? "active" : ""}`}
              >
                QR Placard
              </Link>
              <span className="admin-badge-pill">
                <span>🟢</span> Caretaker
              </span>
              <button
                type="button"
                className="nav-logout-btn"
                onClick={handleCaretakerLogout}
                title="Log out from caretaker portal"
              >
                Log Out
              </button>
            </>
          )}

          {/* Employee Views: Strictly only Order drink and user info */}
          {isEmployee && !isCaretaker && (
            <>
              <Link
                to="/order"
                className={`nav-item ${isOrderActive ? "active" : ""}`}
              >
                Order Drink
              </Link>
              <div className="employee-nav-badge" title={`Ordering as ${employeeName}`}>
                <span className="employee-nav-avatar">
                  {employeeName ? employeeName.charAt(0).toUpperCase() : "👤"}
                </span>
                <span className="employee-nav-name">{employeeName}</span>
              </div>
              <button
                type="button"
                className="nav-logout-btn"
                onClick={handleEmployeeSwitch}
                title="Switch employee profile or log out"
              >
                Switch / Sign Out
              </button>
            </>
          )}

          {/* Guest / Unauthenticated Navigation */}
          {!isCaretaker && !isEmployee && (
            <>
              <Link
                to="/login?tab=employee"
                className={`nav-item ${
                  isLoginActive && location.search.includes("tab=employee")
                    ? "active"
                    : ""
                }`}
              >
                Employee Sign In
              </Link>
              <Link
                to="/login?tab=caretaker"
                className={`nav-caretaker-link ${
                  isLoginActive && location.search.includes("tab=caretaker")
                    ? "active"
                    : ""
                }`}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Caretaker Portal</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
