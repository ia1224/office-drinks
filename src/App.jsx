import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import OrderPage from "./pages/OrderPage";
import DashboardPage from "./pages/DashboardPage";
import QRPage from "./pages/QRPage";
import "./App.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="main-layout">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<OrderPage />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/qr" element={<QRPage />} />
            <Route path="*" element={<Navigate to="/order" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

