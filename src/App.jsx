import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import OrderPage from "./pages/OrderPage";
import DashboardPage from "./pages/DashboardPage";
import QRPage from "./pages/QRPage";
import "./App.css";

function getInitialPage() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("dashboard")) return "dashboard";
  if (path.includes("qr")) return "qr";
  return "order";
}

function App() {
  const [currentPage, setCurrentPage] = useState(getInitialPage);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getInitialPage());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = (page, path) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="main-layout">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />
      <main className="main-content">
        {currentPage === "order" && <OrderPage />}
        {currentPage === "dashboard" && <DashboardPage />}
        {currentPage === "qr" && <QRPage />}
      </main>
    </div>
  );
}

export default App;
