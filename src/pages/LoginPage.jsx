import { useState } from "react";
import { useNavigate, useLocation, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./LoginPage.css";

export default function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "caretaker" ? "caretaker" : "employee";

  const {
    loginCaretaker,
    loginEmployee,
    isCaretaker,
    isEmployee,
    employeeName,
    logout,
  } = useAuth();

  const [caretakerPasscode, setCaretakerPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [employeeInputName, setEmployeeInputName] = useState(employeeName || "");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const handleTabSwitch = (tab) => {
    setError("");
    setSearchParams({ tab });
  };

  const handleCaretakerSubmit = (e) => {
    e.preventDefault();
    setError("");

    const result = loginCaretaker(caretakerPasscode);
    if (result.success) {
      const redirectPath = location.state?.from || "/dashboard";
      navigate(redirectPath, { replace: true });
    } else {
      setError(result.error);
    }
  };

  const handleEmployeeSubmit = (e) => {
    e.preventDefault();
    setError("");

    const result = loginEmployee(employeeInputName);
    if (result.success) {
      const redirectPath = location.state?.from || "/order";
      navigate(redirectPath, { replace: true });
    } else {
      setError(result.error);
    }
  };

  // If already logged in as Caretaker
  if (isCaretaker) {
    return (
      <div className="login-page-wrapper">
        <div className="login-card">
          <div className="login-badge login-badge-caretaker">
            <span>🟢</span> ACTIVE CARETAKER SESSION
          </div>
          <div className="login-icon-box login-icon-caretaker">
            <svg
              width="26"
              height="26"
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
          </div>
          <h1 className="login-title">Logged in as Caretaker</h1>
          <p className="login-subtitle">
            You have administrative access to monitor live drink requests and
            print pantry QR placards.
          </p>

          <div className="login-action-buttons">
            <Link
              to="/dashboard"
              className="login-submit-btn"
              style={{ textDecoration: "none" }}
            >
              Go to Pantry Dashboard &rarr;
            </Link>
            <Link
              to="/qr"
              className="login-secondary-link-btn"
              style={{ textDecoration: "none" }}
            >
              View QR Placards &rarr;
            </Link>
            <button
              type="button"
              className="login-employee-btn"
              onClick={() => {
                logout();
                handleTabSwitch("employee");
              }}
            >
              Log Out (Switch to Employee Mode)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If already logged in as Employee
  if (isEmployee) {
    return (
      <div className="login-page-wrapper">
        <div className="login-card">
          <div className="login-badge login-badge-employee">
            <span>☕</span> EMPLOYEE LOGGED IN
          </div>
          <div className="login-icon-box login-icon-employee">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="login-title">Welcome back, {employeeName}!</h1>
          <p className="login-subtitle">
            Your name is remembered on this device. You're ready to place a drink
            order directly.
          </p>

          <div className="login-action-buttons">
            <Link
              to="/order"
              className="login-submit-btn"
              style={{ textDecoration: "none" }}
            >
              Order a Drink Now &rarr;
            </Link>
            <button
              type="button"
              className="login-secondary-link-btn"
              onClick={() => {
                logout();
                setEmployeeInputName("");
                handleTabSwitch("employee");
              }}
            >
              Change Employee / Use Different Name
            </button>
            <button
              type="button"
              className="login-employee-btn"
              onClick={() => {
                logout();
                handleTabSwitch("caretaker");
              }}
            >
              🔐 Switch to Caretaker Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-wrapper">
      <div className="login-card">
        {/* Role Switcher Tabs */}
        <div className="login-tab-switcher" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "employee"}
            className={`login-tab-btn ${
              activeTab === "employee" ? "active-tab" : ""
            }`}
            onClick={() => handleTabSwitch("employee")}
          >
            <span>☕</span> Employee
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "caretaker"}
            className={`login-tab-btn ${
              activeTab === "caretaker" ? "active-tab" : ""
            }`}
            onClick={() => handleTabSwitch("caretaker")}
          >
            <span>🔐</span> Caretaker
          </button>
        </div>

        {error && (
          <div className="login-error-banner" role="alert">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* EMPLOYEE LOGIN VIEW */}
        {activeTab === "employee" && (
          <div>
            <div className="login-badge login-badge-employee">
              DRINK ORDER PORTAL
            </div>
            <div className="login-icon-box login-icon-employee">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
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

            <h1 className="login-title">Employee Sign In</h1>
            <p className="login-subtitle">
              Enter your name once to start ordering drinks. We'll save your name
              so you won't need to enter it again!
            </p>

            <form onSubmit={handleEmployeeSubmit} className="login-form">
              <div className="login-form-group">
                <label htmlFor="employee-name-input" className="login-label">
                  Your Full Name or Nickname
                </label>
                <div className="login-input-wrapper">
                  <svg
                    className="login-input-icon"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="employee-name-input"
                    type="text"
                    placeholder="e.g. Sarah, Aniket, Rahul"
                    value={employeeInputName}
                    onChange={(e) => setEmployeeInputName(e.target.value)}
                    className="login-input"
                    autoFocus
                    autoComplete="name"
                  />
                </div>
              </div>

              <button type="submit" className="login-submit-btn">
                <span>Continue to Drinks Menu</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>

            <div className="login-feature-list">
              <div className="login-feature-item">
                <span className="feature-check">✓</span>
                <span>Name automatically saved for future orders</span>
              </div>
              <div className="login-feature-item">
                <span className="feature-check">✓</span>
                <span>No password required for employees</span>
              </div>
            </div>
          </div>
        )}

        {/* CARETAKER LOGIN VIEW */}
        {activeTab === "caretaker" && (
          <div>
            <div className="login-badge login-badge-caretaker">
              PANTRY CARETAKER
            </div>
            <div className="login-icon-box login-icon-caretaker">
              <svg
                width="24"
                height="24"
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
            </div>

            <h1 className="login-title">Caretaker Sign In</h1>
            <p className="login-subtitle">
              Enter the pantry caretaker passcode to access the live orders
              dashboard and print QR placards.
            </p>

            <form onSubmit={handleCaretakerSubmit} className="login-form">
              <div className="login-form-group">
                <label htmlFor="passcode-input" className="login-label">
                  Caretaker Passcode
                </label>
                <div className="login-input-wrapper">
                  <svg
                    className="login-input-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="passcode-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter passcode (default: admin123)"
                    value={caretakerPasscode}
                    onChange={(e) => setCaretakerPasscode(e.target.value)}
                    className="login-input"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="login-toggle-pw"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-submit-btn">
                <span>Unlock Caretaker Portal</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>

            <p className="login-hint-text">
              Default caretaker passcode: <code>admin123</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
