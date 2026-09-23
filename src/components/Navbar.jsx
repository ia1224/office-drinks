import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const location = useLocation();
  const currentPath = location.pathname.toLowerCase().replace(/\/+$/, "") || "/";

  const isOrderActive = currentPath === "/order" || currentPath === "/";
  const isDashboardActive = currentPath === "/dashboard";
  const isQrActive = currentPath === "/qr";

  return (
    <nav className="office-navbar">
      <div className="navbar-container">
        <Link to="/order" className="navbar-brand">
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
            <span className="brand-subtitle">PANTRY ORDERS</span>
          </div>
        </Link>

        <div className="navbar-links">
          <Link
            to="/order"
            className={`nav-item ${isOrderActive ? "active" : ""}`}
          >
            Order
          </Link>
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
            QR
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

