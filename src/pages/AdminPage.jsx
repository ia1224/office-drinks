import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  fetchAllOrdersHistory,
  updateOrderDelivered,
  deleteOrder,
  subscribeToOrders,
} from "../lib/supabase";
import "./AdminPage.css";

const STORAGE_CACHE_KEY = "office_barista_admin_history_cache";

export default function AdminPage() {
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'delivered' | 'pending'
  const [drinkFilter, setDrinkFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all"); // 'all' | 'today' | 'yesterday' | 'week' | 'month'
  const [searchQuery, setSearchQuery] = useState("");

  // Sync to local cache
  const updateOrdersState = useCallback((newOrders) => {
    setOrders(newOrders);
    try {
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(newOrders));
    } catch (e) {
      console.warn("Failed to cache orders:", e);
    }
  }, []);

  // Fetch full orders history from Supabase
  const loadHistory = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else if (orders.length === 0) setIsLoading(true);

    try {
      const data = await fetchAllOrdersHistory();
      updateOrdersState(data);
      setErrorMessage("");
    } catch (err) {
      console.error("Failed to load order history:", err);
      setErrorMessage(err.message || "Failed to load order history from Supabase.");
    } finally {
      setIsLoading(false);
      if (isManualRefresh) {
        setTimeout(() => setIsRefreshing(false), 450);
      }
    }
  }, [orders.length, updateOrdersState]);

  useEffect(() => {
    let isSubscribed = true;

    async function fetchInitialHistory() {
      try {
        const data = await fetchAllOrdersHistory();
        if (isSubscribed) {
          updateOrdersState(data);
          setErrorMessage("");
        }
      } catch (err) {
        if (isSubscribed) {
          console.error("Failed to load order history:", err);
          setErrorMessage(err.message || "Failed to load order history from Supabase.");
        }
      }
    }

    fetchInitialHistory();

    // Subscribe to realtime changes so admin view updates live
    const channel = subscribeToOrders({
      onInsert: (newOrder) => {
        setOrders((prev) => {
          if (prev.some((o) => o.id === newOrder.id)) return prev;
          const updated = [newOrder, ...prev];
          try {
            localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(updated));
          } catch (e) {
            console.warn(e);
          }
          return updated;
        });
      },
      onUpdate: (updatedOrder) => {
        setOrders((prev) => {
          const updated = prev.map((o) =>
            o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o
          );
          try {
            localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(updated));
          } catch (e) {
            console.warn(e);
          }
          return updated;
        });
      },
      onDelete: (deletedId) => {
        setOrders((prev) => {
          const updated = prev.filter((o) => o.id !== deletedId);
          try {
            localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(updated));
          } catch (e) {
            console.warn(e);
          }
          return updated;
        });
      },
      onError: (err) => {
        console.warn("Realtime subscription warning:", err);
      },
    });

    return () => {
      isSubscribed = false;
      if (channel) channel.unsubscribe();
    };
  }, [updateOrdersState]);

  // Toggle delivery status
  const handleToggleDelivered = async (orderId, currentStatus) => {
    const nextStatus = !currentStatus;

    // Optimistic update
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, isDelivered: nextStatus } : order
      )
    );

    try {
      await updateOrderDelivered(orderId, nextStatus);
      setSuccessMessage(
        nextStatus
          ? `Order #${orderId} marked as delivered.`
          : `Order #${orderId} marked as pending.`
      );
      setTimeout(() => setSuccessMessage(""), 3500);
    } catch (err) {
      console.error("Failed to toggle status:", err);
      // Revert on error
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, isDelivered: currentStatus } : order
        )
      );
      alert(`Error updating status: ${err.message}`);
    }
  };

  // Delete an order permanently
  const handleDeleteOrder = async (orderId, orderName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete order #${orderId} for "${orderName}" from the permanent history?`
    );
    if (!confirmed) return;

    // Optimistic update
    setOrders((prev) => prev.filter((order) => order.id !== orderId));

    try {
      await deleteOrder(orderId);
      setSuccessMessage(`Order #${orderId} deleted from database.`);
      setTimeout(() => setSuccessMessage(""), 3500);
    } catch (err) {
      console.error("Failed to delete order:", err);
      alert(`Failed to delete order: ${err.message}`);
      loadHistory();
    }
  };

  // Export full history to CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert("No order records to export.");
      return;
    }

    const headers = [
      "Order ID",
      "Date",
      "Time",
      "Employee Name",
      "Beverage",
      "Sugar Preference",
      "Strength / Temp Preference",
      "Custom Notes",
      "Status",
    ];

    const rows = filteredOrders.map((order) => {
      const dateStr = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString()
        : "Unknown";
      const statusStr = order.isDelivered ? "Delivered" : "Pending";

      return [
        order.id,
        `"${dateStr}"`,
        `"${order.time || ""}"`,
        `"${(order.name || "").replace(/"/g, '""')}"`,
        `"${order.drink || ""}"`,
        `"${(order.sugarPreference || "").replace(/"/g, '""')}"`,
        `"${(order.strengthPreference || "").replace(/"/g, '""')}"`,
        `"${(order.customComment || "").replace(/"/g, '""')}"`,
        statusStr,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `office_drinks_history_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper date filtering
  const isDateInRange = (timestamp, rangeKey) => {
    if (!timestamp || rangeKey === "all") return true;
    const orderDate = new Date(timestamp);
    const now = new Date();

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (rangeKey === "today") {
      return orderDate >= startOfToday;
    }
    if (rangeKey === "yesterday") {
      return orderDate >= startOfYesterday && orderDate < startOfToday;
    }
    if (rangeKey === "week") {
      return orderDate >= sevenDaysAgo;
    }
    if (rangeKey === "month") {
      return orderDate >= thirtyDaysAgo;
    }
    return true;
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter === "delivered" && !order.isDelivered) return false;
      if (statusFilter === "pending" && order.isDelivered) return false;

      // Drink filter
      if (drinkFilter !== "all" && order.drink !== drinkFilter) return false;

      // Date range filter
      if (!isDateInRange(order.createdAt, dateRangeFilter)) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = (order.name || "").toLowerCase().includes(query);
        const matchesDrink = (order.drink || "").toLowerCase().includes(query);
        const matchesNotes = (order.customComment || "").toLowerCase().includes(query);
        const matchesTime = (order.time || "").toLowerCase().includes(query);
        if (!matchesName && !matchesDrink && !matchesNotes && !matchesTime) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, drinkFilter, dateRangeFilter, searchQuery]);

  // Analytics Metrics calculations
  const totalOrdersCount = orders.length;
  const deliveredCount = orders.filter((o) => o.isDelivered).length;
  const pendingCount = totalOrdersCount - deliveredCount;
  const fulfillmentRate =
    totalOrdersCount > 0
      ? Math.round((deliveredCount / totalOrdersCount) * 100)
      : 0;

  // Most popular drink
  const popularDrink = useMemo(() => {
    if (orders.length === 0) return { name: "None", count: 0 };
    const counts = {};
    orders.forEach((o) => {
      counts[o.drink] = (counts[o.drink] || 0) + 1;
    });
    let topName = "";
    let topCount = 0;
    Object.entries(counts).forEach(([name, count]) => {
      if (count > topCount) {
        topName = name;
        topCount = count;
      }
    });
    return { name: topName, count: topCount };
  }, [orders]);

  // Unique employees
  const uniqueEmployeesCount = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      if (o.name && o.name.trim()) set.add(o.name.trim().toLowerCase());
    });
    return set.size;
  }, [orders]);

  const getDrinkIcon = (drinkName) => {
    switch (drinkName) {
      case "Tea":
        return "🍵";
      case "Lemon Tea":
        return "🍋";
      case "Coffee":
        return "☕";
      case "Water":
        return "💧";
      default:
        return "☕";
    }
  };

  const formatDateDisplay = (timestamp, timeStr) => {
    if (!timestamp) return timeStr || "Recorded";
    const dateObj = new Date(timestamp);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${formattedDate} · ${timeStr || dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="admin-page-wrapper">
      <div className="admin-content-container">
        {/* Top Header */}
        <div className="admin-header-section">
          <div className="admin-title-group">
            <div className="admin-badge-pill">
              <span className="admin-pulse-dot"></span>
              ADMIN MANAGEMENT · COMPLETE AUDIT ARCHIVE
            </div>
            <h1 className="admin-main-title">Drink Orders History</h1>
            <p className="admin-subtitle">
              Permanent record of all beverage orders placed, fulfilled, and archived across the office.
            </p>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              className={`admin-btn secondary-btn ${isRefreshing ? "refreshing" : ""}`}
              onClick={() => loadHistory(true)}
              title="Refresh order history"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`refresh-svg ${isRefreshing ? "spin" : ""}`}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="admin-btn secondary-btn"
              onClick={handleExportCSV}
              title="Download orders history as CSV"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export CSV</span>
            </button>

            <Link to="/dashboard" className="admin-btn primary-btn" style={{ textDecoration: "none" }}>
              <span>Live Pantry Queue &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Notifications and Alerts */}
        {errorMessage && (
          <div className="admin-alert-banner alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <div className="alert-text">
              <strong>Database Warning:</strong> {errorMessage}
            </div>
            <button type="button" className="alert-dismiss-btn" onClick={() => setErrorMessage("")}>
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="admin-alert-banner alert-success" role="alert">
            <span className="alert-icon">✓</span>
            <div className="alert-text">{successMessage}</div>
            <button type="button" className="alert-dismiss-btn" onClick={() => setSuccessMessage("")}>
              ✕
            </button>
          </div>
        )}

        {/* Metric Overview Cards */}
        <div className="admin-metrics-grid">
          <div className="admin-metric-card total-metric-card">
            <div className="metric-header">
              <span className="metric-title">TOTAL ORDERS RECORDED</span>
              <span className="metric-icon">📋</span>
            </div>
            <div className="metric-number">{totalOrdersCount}</div>
            <div className="metric-foot">All-time lifetime orders</div>
          </div>

          <div className="admin-metric-card delivered-metric-card">
            <div className="metric-header">
              <span className="metric-title">DELIVERED ORDERS</span>
              <span className="metric-icon">✅</span>
            </div>
            <div className="metric-number">{deliveredCount}</div>
            <div className="metric-foot">
              <span className="rate-badge">{fulfillmentRate}% fulfilled</span>
            </div>
          </div>

          <div className="admin-metric-card pending-metric-card">
            <div className="metric-header">
              <span className="metric-title">PENDING / PREPARATION</span>
              <span className="metric-icon">⏳</span>
            </div>
            <div className="metric-number">{pendingCount}</div>
            <div className="metric-foot">Active or unfulfilled</div>
          </div>

          <div className="admin-metric-card popular-metric-card">
            <div className="metric-header">
              <span className="metric-title">TOP BEVERAGE</span>
              <span className="metric-icon">{getDrinkIcon(popularDrink.name)}</span>
            </div>
            <div className="metric-number" style={{ fontSize: "22px" }}>
              {popularDrink.name || "None"}
            </div>
            <div className="metric-foot">
              {popularDrink.count > 0 ? `${popularDrink.count} orders placed` : "No data yet"}
            </div>
          </div>

          <div className="admin-metric-card team-metric-card">
            <div className="metric-header">
              <span className="metric-title">TEAM ORDERERS</span>
              <span className="metric-icon">👥</span>
            </div>
            <div className="metric-number">{uniqueEmployeesCount}</div>
            <div className="metric-foot">Unique staff members</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="admin-filter-bar">
          {/* Status Tabs */}
          <div className="admin-segmented-control">
            <button
              type="button"
              className={`segment-btn ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              <span>All History</span>
              <span className="badge-count">{totalOrdersCount}</span>
            </button>
            <button
              type="button"
              className={`segment-btn ${statusFilter === "delivered" ? "active" : ""}`}
              onClick={() => setStatusFilter("delivered")}
            >
              <span>✓ Delivered</span>
              <span className="badge-count badge-count-delivered">{deliveredCount}</span>
            </button>
            <button
              type="button"
              className={`segment-btn ${statusFilter === "pending" ? "active" : ""}`}
              onClick={() => setStatusFilter("pending")}
            >
              <span>⏳ Pending</span>
              <span className="badge-count badge-count-pending">{pendingCount}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="admin-search-wrapper">
            <svg
              className="admin-search-icon"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, drink, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="admin-clear-search-btn"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          {/* Beverage Filter Dropdown */}
          <div className="admin-select-wrapper">
            <select
              value={drinkFilter}
              onChange={(e) => setDrinkFilter(e.target.value)}
              className="admin-select"
            >
              <option value="all">All Beverages</option>
              <option value="Tea">🍵 Tea</option>
              <option value="Lemon Tea">🍋 Lemon Tea</option>
              <option value="Coffee">☕ Coffee</option>
              <option value="Water">💧 Water</option>
            </select>
          </div>

          {/* Date Range Dropdown */}
          <div className="admin-select-wrapper">
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="admin-select"
            >
              <option value="all">📅 All Time</option>
              <option value="today">Today Only</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>
        </div>

        {/* History Table Container */}
        <div className="admin-history-card">
          <div className="history-card-header">
            <div className="history-count-label">
              Showing <strong>{filteredOrders.length}</strong> of <strong>{totalOrdersCount}</strong> orders
              {statusFilter !== "all" && ` (${statusFilter})`}
              {drinkFilter !== "all" && ` · ${drinkFilter}`}
              {dateRangeFilter !== "all" && ` · ${dateRangeFilter}`}
            </div>

            {(statusFilter !== "all" || drinkFilter !== "all" || dateRangeFilter !== "all" || searchQuery) && (
              <button
                type="button"
                className="reset-filters-btn"
                onClick={() => {
                  setStatusFilter("all");
                  setDrinkFilter("all");
                  setDateRangeFilter("all");
                  setSearchQuery("");
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {isLoading && orders.length === 0 ? (
            <div className="history-loading-box">
              <div className="loading-spinner"></div>
              <span>Loading complete order history from database...</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="history-empty-box">
              <div className="empty-icon">📂</div>
              <h3>No matching order records found</h3>
              <p>
                {searchQuery || drinkFilter !== "all" || dateRangeFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your search criteria or resetting the filters."
                  : "No drink orders have been recorded in the database yet."}
              </p>
            </div>
          ) : (
            <div className="history-table-responsive">
              <table className="admin-orders-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Date & Time</th>
                    <th>Employee</th>
                    <th>Beverage</th>
                    <th>Specifications</th>
                    <th>Notes</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const isDelivered = Boolean(order.isDelivered);
                    const specs = [];
                    if (order.drink === "Water") {
                      if (order.strengthPreference) {
                        specs.push(
                          order.strengthPreference === "Hot"
                            ? "🔥 Hot"
                            : order.strengthPreference === "Cold"
                            ? "❄️ Cold"
                            : order.strengthPreference
                        );
                      }
                    } else {
                      if (order.sugarPreference) specs.push(order.sugarPreference);
                      if (order.strengthPreference) specs.push(order.strengthPreference);
                    }

                    return (
                      <tr key={order.id} className={isDelivered ? "row-delivered" : "row-pending"}>
                        {/* Status Column */}
                        <td>
                          {isDelivered ? (
                            <span className="order-status-badge badge-delivered">
                              <span className="status-dot dot-delivered"></span>
                              Delivered
                            </span>
                          ) : (
                            <span className="order-status-badge badge-pending">
                              <span className="status-dot dot-pending"></span>
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Date & Time Column */}
                        <td>
                          <div className="time-cell">
                            <span className="time-primary">{formatDateDisplay(order.createdAt, order.time)}</span>
                            <span className="time-order-id">#{order.id}</span>
                          </div>
                        </td>

                        {/* Employee Column */}
                        <td>
                          <div className="employee-cell">
                            <div className="employee-avatar">
                              {(order.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="employee-name">{order.name}</span>
                          </div>
                        </td>

                        {/* Drink Column */}
                        <td>
                          <div className="drink-cell">
                            <span className="drink-icon">{getDrinkIcon(order.drink)}</span>
                            <span className="drink-name">{order.drink}</span>
                          </div>
                        </td>

                        {/* Specifications Column */}
                        <td>
                          {specs.length > 0 ? (
                            <div className="specs-pills">
                              {specs.map((spec, idx) => (
                                <span key={idx} className="spec-pill">
                                  {spec}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted">Standard brew</span>
                          )}
                        </td>

                        {/* Custom Comment Column */}
                        <td>
                          {order.customComment ? (
                            <div className="note-box" title={order.customComment}>
                              💬 "{order.customComment}"
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="text-right">
                          <div className="row-actions">
                            <button
                              type="button"
                              className={`status-toggle-btn ${
                                isDelivered ? "btn-revert" : "btn-deliver"
                              }`}
                              onClick={() => handleToggleDelivered(order.id, isDelivered)}
                              title={
                                isDelivered
                                  ? "Revert order status to Pending"
                                  : "Mark order as Delivered"
                              }
                            >
                              {isDelivered ? "Undo" : "Mark Delivered"}
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => handleDeleteOrder(order.id, order.name)}
                              title="Delete from history permanent record"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
