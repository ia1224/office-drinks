import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/useAuth";
import { AdminRoute, CaretakerRoute, EmployeeRoute } from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import OrderPage from "./pages/OrderPage";
import DashboardPage from "./pages/DashboardPage";
import AdminPage from "./pages/AdminPage";
import QRPage from "./pages/QRPage";
import LoginPage from "./pages/LoginPage";
import "./App.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

function RoleBasedRedirect() {
  const { isAdmin, isCaretaker, isEmployee } = useAuth();

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  if (isCaretaker) {
    return <Navigate to="/dashboard" replace />;
  }
  if (isEmployee) {
    return <Navigate to="/order" replace />;
  }
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="main-layout">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Order page: Strictly accessible to employees only */}
              <Route
                path="/order"
                element={
                  <EmployeeRoute>
                    <OrderPage />
                  </EmployeeRoute>
                }
              />

              {/* Login for employees, caretakers, and admins */}
              <Route path="/login" element={<LoginPage />} />

              {/* Admin Routes: Strictly accessible to administrators only */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />

              {/* Caretaker Routes: Strictly accessible to caretakers and admins */}
              <Route
                path="/dashboard"
                element={
                  <CaretakerRoute>
                    <DashboardPage />
                  </CaretakerRoute>
                }
              />
              <Route
                path="/qr"
                element={
                  <CaretakerRoute>
                    <QRPage />
                  </CaretakerRoute>
                }
              />

              {/* Root and unknown paths redirect based on role */}
              <Route path="/" element={<RoleBasedRedirect />} />
              <Route path="*" element={<RoleBasedRedirect />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
