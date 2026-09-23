import { useEffect, useRef, useState, useCallback } from "react";
import {
  fetchOrders,
  updateOrderDelivered,
  deleteOrder,
  clearAllOrders,
  subscribeToOrders,
  isSupabaseConfigured,
} from "../lib/supabase";
import "./DashboardPage.css";

function DashboardPage() {
  const [orders, setOrders] = useState([]);
  const [newOrderIds, setNewOrderIds] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDrink, setFilterDrink] = useState("All");
  const [viewTab, setViewTab] = useState("active");
  const [deliveringIds, setDeliveringIds] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [supabaseError, setSupabaseError] = useState("");

  const knownOrderIds = useRef(new Set());
  const notificationTimer = useRef(null);
  const notificationAudio = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Format live date/time: e.g. "Sep 21, 02:17 PM · Monday"
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const month = now.toLocaleDateString("en-US", { month: "short" });
      const day = String(now.getDate()).padStart(2, "0");
      const time = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
      setCurrentDateTime(`${month} ${day}, ${time} · ${weekday}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Play notification sound
  const playPing = () => {
    if (!soundEnabledRef.current) {
      return;
    }

    try {
      if (!notificationAudio.current) {
        notificationAudio.current = new Audio("/notification.mp3");
      }

      notificationAudio.current.currentTime = 0;
      notificationAudio.current.play().catch((error) => {
        console.log("Notification sound could not play:", error);
      });
    } catch (error) {
      console.log("Notification sound error:", error);
    }
  };

  // Toggle sound button
  const toggleSound = () => {
    if (soundEnabled) {
      setSoundEnabled(false);
      soundEnabledRef.current = false;

      if (notificationAudio.current) {
        try {
          notificationAudio.current.pause();
          notificationAudio.current.currentTime = 0;
        } catch (error) {
          console.log("Error stopping audio:", error);
        }
      }
      console.log("Sound disabled");
    } else {
      setSoundEnabled(true);
      soundEnabledRef.current = true;

      try {
        if (!notificationAudio.current) {
          notificationAudio.current = new Audio("/notification.mp3");
        }

        notificationAudio.current.currentTime = 0;
        notificationAudio.current.play().catch((error) => {
          console.log("Test sound could not play:", error);
        });

        console.log("Sound enabled");
      } catch (error) {
        console.log("Sound setup error:", error);
      }
    }
  };

  // Load and monitor orders from Supabase
  const loadOrders = useCallback(async () => {
    try {
      const activeOrders = await fetchOrders();
      setSupabaseError("");

      const currentIds = new Set(activeOrders.map((order) => order.id));
      const newlyAddedOrders = activeOrders.filter(
        (order) => !knownOrderIds.current.has(order.id),
      );

      if (knownOrderIds.current.size > 0 && newlyAddedOrders.length > 0) {
        const newIds = newlyAddedOrders.map((order) => order.id);
        console.log("NEW ORDER DETECTED:", newlyAddedOrders);

        setNewOrderIds((prev) => [...new Set([...prev, ...newIds])]);
        playPing();

        clearTimeout(notificationTimer.current);
        notificationTimer.current = setTimeout(() => {
          setNewOrderIds([]);
        }, 15000);
      }

      knownOrderIds.current = currentIds;
      setOrders(activeOrders);
    } catch (err) {
      console.error("Supabase load error:", err);
      setSupabaseError(err.message || "Failed to connect to Supabase");
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    async function initialFetch() {
      try {
        const activeOrders = await fetchOrders();
        if (!isSubscribed) return;
        setSupabaseError("");
        knownOrderIds.current = new Set(activeOrders.map((o) => o.id));
        setOrders(activeOrders);
      } catch (err) {
        if (!isSubscribed) return;
        console.error("Supabase initial fetch error:", err);
        setSupabaseError(err.message || "Failed to connect to Supabase");
      }
    }

    initialFetch();

    const interval = setInterval(() => {
      loadOrders();
    }, 5000);

    // Subscribe to Supabase Realtime channel
    const channel = subscribeToOrders({
      onInsert: (newOrder) => {
        setOrders((prev) => {
          if (prev.some((o) => o.id === newOrder.id)) return prev;
          return [newOrder, ...prev];
        });

        if (!knownOrderIds.current.has(newOrder.id)) {
          knownOrderIds.current.add(newOrder.id);
          setNewOrderIds((prev) => [...new Set([...prev, newOrder.id])]);
          playPing();

          clearTimeout(notificationTimer.current);
          notificationTimer.current = setTimeout(() => {
            setNewOrderIds([]);
          }, 15000);
        }
      },
      onUpdate: (updatedOrder) => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o,
          ),
        );
      },
      onDelete: (deletedId) => {
        setOrders((prev) => prev.filter((o) => o.id !== deletedId));
        knownOrderIds.current.delete(deletedId);
      },
      onError: (err) => {
        console.error("Supabase Realtime error:", err);
        setSupabaseError(err.message || "Supabase Realtime error");
      },
    });

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      clearTimeout(notificationTimer.current);
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [loadOrders]);

  // Manual refresh with visual spin animation
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Clear all orders
  const clearOrders = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all orders from Supabase?",
    );

    if (confirmed) {
      try {
        await clearAllOrders();
        setOrders([]);
        knownOrderIds.current = new Set();
        setNewOrderIds([]);
      } catch (err) {
        alert("Failed to clear orders: " + err.message);
      }
    }
  };

  // Delete single order
  const handleDeleteOrder = async (orderId) => {
    try {
      await deleteOrder(orderId);
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      knownOrderIds.current.delete(orderId);
    } catch (err) {
      alert("Failed to delete order: " + err.message);
    }
  };

  // Toggle order delivered status
  const handleToggleDelivered = async (orderId, currentDelivered) => {
    const nextStatus = !currentDelivered;

    if (nextStatus === true) {
      // Mark as delivering to trigger smooth vanishing animation
      setDeliveringIds((prev) => new Set(prev).add(orderId));

      setTimeout(async () => {
        // Automatically remove/vanish from active queue
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, isDelivered: true } : order,
          ),
        );
        setDeliveringIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });

        try {
          await updateOrderDelivered(orderId, true);
        } catch (err) {
          console.error("Failed to update delivery status:", err);
          // Revert on error
          setOrders((prev) =>
            prev.map((order) =>
              order.id === orderId ? { ...order, isDelivered: false } : order,
            ),
          );
          alert(err.message || "Failed to update delivery status in Supabase");
        }
      }, 350);
    } else {
      // Unmarking from delivered tab back to active queue
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, isDelivered: false } : order,
        ),
      );

      try {
        await updateOrderDelivered(orderId, false);
      } catch (err) {
        console.error("Failed to update delivery status:", err);
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId ? { ...order, isDelivered: true } : order,
          ),
        );
        alert(err.message || "Failed to update delivery status in Supabase");
      }
    }
  };

  // Active (pending) vs Delivered separation
  const activeOrders = orders.filter((order) => !order.isDelivered);
  const deliveredOrders = orders.filter((order) => order.isDelivered);

  // Summary counts for caretaker preparation queue
  const totalActive = activeOrders.length;
  const deliveredCount = deliveredOrders.length;
  const teaCount = activeOrders.filter((order) => order.drink === "Tea").length;
  const lemonTeaCount = activeOrders.filter(
    (order) => order.drink === "Lemon Tea",
  ).length;
  const coffeeCount = activeOrders.filter(
    (order) => order.drink === "Coffee",
  ).length;
  const waterCount = activeOrders.filter(
    (order) => order.drink === "Water",
  ).length;

  // Breakdown by specifications/preferences for active orders to prepare
  const getDrinkBreakdown = (drinkName) => {
    const drinkOrders = activeOrders.filter((order) => order.drink === drinkName);
    if (drinkOrders.length === 0) return [];

    const breakdownMap = {};
    drinkOrders.forEach((order) => {
      if (drinkName === "Water") {
        const label = order.strengthPreference
          ? order.strengthPreference === "Hot"
            ? "Hot"
            : order.strengthPreference === "Cold"
            ? "Cold"
            : order.strengthPreference
          : "Standard";
        breakdownMap[label] = (breakdownMap[label] || 0) + 1;
      } else {
        const specs = [];
        if (order.sugarPreference) specs.push(order.sugarPreference);
        if (order.strengthPreference) specs.push(order.strengthPreference);

        const label = specs.length > 0 ? specs.join(" & ") : "No preference";
        breakdownMap[label] = (breakdownMap[label] || 0) + 1;
      }
    });

    return Object.entries(breakdownMap).map(([label, count]) => ({
      label,
      count,
    }));
  };

  const teaBreakdown = getDrinkBreakdown("Tea");
  const lemonTeaBreakdown = getDrinkBreakdown("Lemon Tea");
  const coffeeBreakdown = getDrinkBreakdown("Coffee");
  const waterBreakdown = getDrinkBreakdown("Water");

  // Filtered orders based on selected tab (active queue vs delivered history)
  const currentTabOrders = viewTab === "active" ? activeOrders : deliveredOrders;

  const filteredOrders = currentTabOrders.filter((order) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (order.name || "").toLowerCase().includes(query) ||
      (order.drink || "").toLowerCase().includes(query) ||
      (order.customComment || "").toLowerCase().includes(query);

    const matchesDrink =
      filterDrink === "All" || order.drink === filterDrink;

    return matchesSearch && matchesDrink;
  });

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

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-content">
        {/* New order banner */}
        {newOrderIds.length > 0 && (
          <div className="new-order-banner">
            <span className="banner-bell">🔔</span>
            <span>New drink order received!</span>
          </div>
        )}

        {/* Supabase Error Banner */}
        {supabaseError && (
          <div className="supabase-error-banner">
            <span className="error-banner-icon">⚠️</span>
            <div className="error-banner-content">
              <strong>Supabase Connection Failed:</strong>
              <p>{supabaseError}</p>
              <span className="error-banner-hint">
                Please ensure you have run <code>supabase_schema.sql</code> in your Supabase SQL Editor to create the <code>drink_orders</code> table.
              </span>
            </div>
          </div>
        )}

        {/* Dashboard Top Header */}
        <div className="dashboard-top-section">
          <div className="dashboard-title-group">
            <div className="live-status-badge">
              <span className="live-pulsing-dot"></span>
              {isSupabaseConfigured()
                ? "LIVE · SUPABASE CLOUD"
                : "LIVE · PANTRY DASHBOARD"}
            </div>
            <h1 className="dashboard-main-heading">Office Drink Orders</h1>
            <p className="dashboard-live-timestamp">
              {currentDateTime || "Today's Live Requests"}
            </p>
          </div>

          <div className="dashboard-toolbar">
            {/* Sound Toggle Button */}
            <button
              type="button"
              className={`toolbar-btn sound-toggle-btn ${
                soundEnabled ? "sound-active" : ""
              }`}
              onClick={toggleSound}
              title={soundEnabled ? "Mute audio" : "Enable sound alerts"}
            >
              <span className="toolbar-btn-icon">
                {soundEnabled ? "🔊" : "🔈"}
              </span>
              <span>{soundEnabled ? "Sound on" : "Sound off"}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              className={`toolbar-btn outline-btn ${
                isRefreshing ? "refreshing" : ""
              }`}
              onClick={handleRefresh}
              title="Refresh orders"
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

            {/* Clear All Button */}
            <button
              type="button"
              className="toolbar-btn clear-all-btn"
              onClick={clearOrders}
              title="Clear all orders"
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
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {/* 5 Summary Cards Grid matching Screenshot */}
        <div className="metrics-grid">
          {/* TOTAL ORDERS */}
          <div className="metric-card total-metric">
            <div className="metric-card-top">
              <span className="metric-label total-label">ACTIVE ORDERS</span>
              <span className="metric-icon">📋</span>
            </div>
            <div className="metric-value">{totalActive}</div>
            <div className="metric-subpartition">
              <div className="subpartition-heading">Overview</div>
              {orders.length > 0 ? (
                <div className="subpartition-list">
                  <div className="subpartition-row">
                    <span className="subpartition-spec-name">
                      {totalActive} pending · {deliveredCount} delivered
                    </span>
                  </div>
                </div>
              ) : (
                <div className="subpartition-empty">No active orders</div>
              )}
            </div>
          </div>

          {/* TEA */}
          <div className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">TEA</span>
              <span className="metric-icon">🍵</span>
            </div>
            <div className="metric-value">{teaCount}</div>
            <div className="metric-subpartition">
              <div className="subpartition-heading">Specifications</div>
              {teaBreakdown.length > 0 ? (
                <div className="subpartition-list">
                  {teaBreakdown.map((item, idx) => (
                    <div key={idx} className="subpartition-row">
                      <span className="subpartition-count-badge">{item.count}×</span>
                      <span className="subpartition-spec-name">{item.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="subpartition-empty">No active orders</div>
              )}
            </div>
          </div>

          {/* LEMON TEA */}
          <div className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">LEMON TEA</span>
              <span className="metric-icon">🍋</span>
            </div>
            <div className="metric-value">{lemonTeaCount}</div>
            <div className="metric-subpartition">
              <div className="subpartition-heading">Specifications</div>
              {lemonTeaBreakdown.length > 0 ? (
                <div className="subpartition-list">
                  {lemonTeaBreakdown.map((item, idx) => (
                    <div key={idx} className="subpartition-row">
                      <span className="subpartition-count-badge">{item.count}×</span>
                      <span className="subpartition-spec-name">{item.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="subpartition-empty">No active orders</div>
              )}
            </div>
          </div>

          {/* COFFEE */}
          <div className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">COFFEE</span>
              <span className="metric-icon">☕</span>
            </div>
            <div className="metric-value">{coffeeCount}</div>
            <div className="metric-subpartition">
              <div className="subpartition-heading">Specifications</div>
              {coffeeBreakdown.length > 0 ? (
                <div className="subpartition-list">
                  {coffeeBreakdown.map((item, idx) => (
                    <div key={idx} className="subpartition-row">
                      <span className="subpartition-count-badge">{item.count}×</span>
                      <span className="subpartition-spec-name">{item.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="subpartition-empty">No active orders</div>
              )}
            </div>
          </div>

          {/* WATER */}
          <div className="metric-card">
            <div className="metric-card-top">
              <span className="metric-label">WATER</span>
              <span className="metric-icon">💧</span>
            </div>
            <div className="metric-value">{waterCount}</div>
            <div className="metric-subpartition">
              <div className="subpartition-heading">Specifications</div>
              {waterBreakdown.length > 0 ? (
                <div className="subpartition-list">
                  {waterBreakdown.map((item, idx) => (
                    <div key={idx} className="subpartition-row">
                      <span className="subpartition-count-badge">{item.count}×</span>
                      <span className="subpartition-spec-name">
                        {item.label === "Hot"
                          ? "🔥 Hot"
                          : item.label === "Cold"
                          ? "❄️ Cold"
                          : item.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="subpartition-empty">No active orders</div>
              )}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="filter-search-bar">
          {/* Active Queue vs Delivered Tabs */}
          <div className="queue-tabs-segmented">
            <button
              type="button"
              className={`queue-segment-btn ${
                viewTab === "active" ? "active" : ""
              }`}
              onClick={() => setViewTab("active")}
            >
              <span>Pending Queue</span>
              <span className="segment-count-badge">{totalActive}</span>
            </button>
            <button
              type="button"
              className={`queue-segment-btn ${
                viewTab === "delivered" ? "active" : ""
              }`}
              onClick={() => setViewTab("delivered")}
            >
              <span>Delivered</span>
              <span className="segment-count-badge delivered-badge-num">
                {deliveredCount}
              </span>
            </button>
          </div>

          <div className="search-input-wrapper">
            <svg
              className="search-svg-icon"
              width="18"
              height="18"
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
              placeholder="Search by name or drink..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-field"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-dropdown-wrapper">
            <div className="filter-icon-label">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </div>
            <select
              value={filterDrink}
              onChange={(e) => setFilterDrink(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Drinks</option>
              <option value="Tea">Tea</option>
              <option value="Lemon Tea">Lemon Tea</option>
              <option value="Coffee">Coffee</option>
              <option value="Water">Water</option>
            </select>
          </div>
        </div>

        {/* Orders Section */}
        <div className="orders-container">
          {filteredOrders.length === 0 ? (
            <div className="empty-orders-state">
              <div className="empty-icon-box">
                {viewTab === "delivered" ? "✓" : "☕"}
              </div>
              <h3>
                {searchQuery || filterDrink !== "All"
                  ? "No matching orders found"
                  : viewTab === "delivered"
                  ? "No delivered orders yet"
                  : "All orders delivered! Queue is empty"}
              </h3>
              <p>
                {searchQuery || filterDrink !== "All"
                  ? "Try adjusting your search or drink filter."
                  : viewTab === "delivered"
                  ? "When drink orders are marked as delivered, they are saved here."
                  : "New orders placed by team members will arrive here in real time."}
              </p>
            </div>
          ) : (
            <div className="order-cards-grid">
              {filteredOrders.map((order) => {
                const isNew = newOrderIds.includes(order.id);
                const isDelivering = deliveringIds.has(order.id);
                const isDeliveredState = Boolean(
                  order.isDelivered || isDelivering,
                );

                const preferencesList =
                  order.drink === "Water"
                    ? [
                        order.strengthPreference
                          ? `${
                              order.strengthPreference === "Hot"
                                ? "🔥 Hot"
                                : "❄️ Cold"
                            }`
                          : "Standard",
                        order.customComment ? `"${order.customComment}"` : null,
                      ].filter(Boolean)
                    : [
                        order.sugarPreference,
                        order.strengthPreference,
                        order.customComment ? `"${order.customComment}"` : null,
                      ].filter(Boolean);

                return (
                  <div
                    key={order.id}
                    className={`modern-order-card ${
                      isNew ? "new-arrival" : ""
                    } ${order.isDelivered ? "delivered-card" : ""} ${
                      isDelivering ? "card-vanish-anim" : ""
                    }`}
                  >
                    {/* Top Row: Name, Delivered Badge & Delete Action */}
                    <div className="card-top-row">
                      <div className="card-name-wrapper">
                        <span className="card-employee-name">{order.name}</span>
                        {isDeliveredState && (
                          <span className="order-delivered-badge">
                            ✓ Delivered
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="card-delete-btn"
                        onClick={() => handleDeleteOrder(order.id)}
                        title="Delete order"
                      >
                        <svg
                          width="16"
                          height="16"
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

                    {/* Time Row */}
                    <div className="card-time-row">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="clock-icon"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{order.time}</span>
                    </div>

                    {/* Drink Badge Pill */}
                    <div className="card-drink-pill">
                      <span className="drink-pill-emoji">
                        {getDrinkIcon(order.drink)}
                      </span>
                      <span className="drink-pill-name">{order.drink}</span>
                    </div>

                    {/* Notes / Preferences Box */}
                    {preferencesList.length > 0 && (
                      <div className="card-notes-box">
                        <span className="notes-quote-icon">💬</span>
                        <span className="notes-text">
                          {preferencesList.join(" · ")}
                        </span>
                      </div>
                    )}

                    {/* Delivered Checkbox / Toggle Row */}
                    <div className="card-delivered-row">
                      <label
                        className={`delivered-toggle-control ${
                          isDeliveredState
                            ? "status-delivered"
                            : "status-pending"
                        }`}
                        title={
                          order.isDelivered
                            ? "Click to return order to active queue"
                            : "Click to mark delivered and remove from queue"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={isDeliveredState}
                          onChange={() =>
                            handleToggleDelivered(
                              order.id,
                              Boolean(order.isDelivered),
                            )
                          }
                          className="delivered-checkbox-native"
                        />
                        <span className="delivered-checkbox-box">
                          {isDeliveredState && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        <span className="delivered-label-text">
                          {isDeliveredState
                            ? viewTab === "delivered"
                              ? "Delivered (Click to restore)"
                              : "Delivered"
                            : "Mark Delivered"}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
