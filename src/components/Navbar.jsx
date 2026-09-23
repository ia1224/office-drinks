import "./Navbar.css";

function Navbar({ currentPage, onNavigate }) {
  const handleNav = (page, path) => (e) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(page, path);
    } else {
      window.history.pushState(null, "", path);
      window.location.pathname = path;
    }
  };

  return (
    <nav className="office-navbar">
      <div className="navbar-container">
        <a
          href="/"
          className="navbar-brand"
          onClick={handleNav("order", "/")}
        >
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
        </a>

        <div className="navbar-links">
          <a
            href="/"
            className={`nav-item ${currentPage === "order" ? "active" : ""}`}
            onClick={handleNav("order", "/")}
          >
            Order
          </a>
          <a
            href="/dashboard"
            className={`nav-item ${currentPage === "dashboard" ? "active" : ""}`}
            onClick={handleNav("dashboard", "/dashboard")}
          >
            Dashboard
          </a>
          <a
            href="/qr"
            className={`nav-item ${currentPage === "qr" ? "active" : ""}`}
            onClick={handleNav("qr", "/qr")}
          >
            QR
          </a>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
