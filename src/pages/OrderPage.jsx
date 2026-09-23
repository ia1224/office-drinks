import { useState } from "react";
import { insertOrder } from "../lib/supabase";

function OrderPage() {
  const [name, setName] = useState("");
  const [drink, setDrink] = useState("");
  const [sugarPreference, setSugarPreference] = useState("");
  const [strengthPreference, setStrengthPreference] = useState("");
  const [waterTemperature, setWaterTemperature] = useState("");
  const [customComment, setCustomComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState(null);

  const drinks = [
    { name: "Tea", icon: "🍵", description: "Freshly brewed hot tea" },
    { name: "Lemon Tea", icon: "🍋", description: "Zesty & refreshing" },
    { name: "Coffee", icon: "☕", description: "Rich & aromatic" },
    { name: "Water", icon: "💧", description: "Hot, cold, or standard" },
  ];

  const sugarOptions = ["Less Sugar", "No Sugar"];
  const strengthOptions = ["Strong", "Light"];

  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Please enter your name");
      return;
    }

    if (!drink) {
      alert("Please select a drink");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    const newOrder = {
      id: Date.now(),
      name: name.trim(),
      drink: drink,
      sugarPreference: drink === "Water" ? "" : sugarPreference,
      strengthPreference:
        drink === "Water" ? waterTemperature : strengthPreference,
      customComment: customComment.trim(),
      createdAt: Date.now(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    try {
      await insertOrder(newOrder);
      setLastSubmittedOrder(newOrder);
      setSubmitted(true);
    } catch (err) {
      console.error("Supabase insert error:", err);
      setErrorMessage(
        err.message ||
          "Failed to connect to Supabase. Please ensure the 'drink_orders' table exists in your database.",
      );
      alert(
        `Failed to submit order to Supabase:\n\n${err.message}\n\nPlease verify that the 'drink_orders' table exists in your Supabase project SQL Editor.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewOrder = () => {
    setName("");
    setDrink("");
    setSugarPreference("");
    setStrengthPreference("");
    setWaterTemperature("");
    setCustomComment("");
    setLastSubmittedOrder(null);
    setErrorMessage("");
    setSubmitted(false);
  };

  const getDrinkIcon = (drinkName) => {
    const found = drinks.find((d) => d.name === drinkName);
    return found ? found.icon : "☕";
  };

  if (submitted && lastSubmittedOrder) {
    return (
      <div className="order-page-wrapper">
        <div className="order-card-container success-card-container">
          <div className="success-icon-badge">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="success-title">Order Submitted!</h1>
          <p className="success-subtitle">
            Thank you, <strong>{lastSubmittedOrder.name}</strong>! Your drink
            request has been sent to the pantry caretaker.
          </p>

          <div className="order-receipt-card">
            <div className="receipt-header">
              <span className="receipt-label">ORDER SUMMARY</span>
              <span className="receipt-time">{lastSubmittedOrder.time}</span>
            </div>

            <div className="receipt-drink-item">
              <span className="receipt-drink-icon">
                {getDrinkIcon(lastSubmittedOrder.drink)}
              </span>
              <div className="receipt-drink-details">
                <span className="receipt-drink-name">
                  {lastSubmittedOrder.drink}
                </span>
                <span className="receipt-drink-cust">
                  {lastSubmittedOrder.drink === "Water"
                    ? lastSubmittedOrder.strengthPreference
                      ? `${lastSubmittedOrder.strengthPreference === "Hot" ? "🔥 Hot" : "❄️ Cold"}`
                      : "Standard"
                    : [
                        lastSubmittedOrder.sugarPreference,
                        lastSubmittedOrder.strengthPreference,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Standard brew"}
                </span>
              </div>
            </div>

            {lastSubmittedOrder.customComment && (
              <div className="receipt-note-item">
                <span className="receipt-note-quote">💬</span>
                <span className="receipt-note-text">
                  "{lastSubmittedOrder.customComment}"
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="order-submit-btn"
            onClick={handleNewOrder}
          >
            Place Another Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-page-wrapper">
      <div className="order-card-container">
        {/* Header Branding */}
        <div className="order-header-section">
          <div className="order-badge">
            <span className="badge-dot"></span>
            OFFICE BARISTA
          </div>
          <h1 className="order-main-heading">Place Your Drink Order</h1>
          <p className="order-sub-heading">
            Choose your beverage and customize it just the way you like.
          </p>
        </div>

        {errorMessage && (
          <div className="order-error-banner">
            <span>⚠️</span>
            <div>
              <strong>Failed to connect to Supabase:</strong>
              <div>{errorMessage}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="order-form">
          {/* Employee Name */}
          <div className="form-group">
            <label htmlFor="employee-name" className="form-label">
              Your Name
            </label>
            <div className="input-icon-wrapper">
              <svg
                className="input-svg-icon"
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
                id="employee-name"
                type="text"
                placeholder="e.g. Aniket, Sarah, Rahul"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-text-input"
                autoComplete="name"
              />
            </div>
          </div>

          {/* Drink Selection */}
          <div className="form-group">
            <label className="form-label">Select Your Drink</label>
            <div className="drink-selection-grid">
              {drinks.map((item) => {
                const isSelected = drink === item.name;
                return (
                  <div
                    key={item.name}
                    className={`drink-select-card ${isSelected ? "selected-drink" : ""}`}
                    onClick={() => setDrink(item.name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setDrink(item.name);
                      }
                    }}
                  >
                    <div className="drink-select-icon">{item.icon}</div>
                    <div className="drink-select-name">{item.name}</div>
                    <div className="drink-select-desc">{item.description}</div>
                    {isSelected && (
                      <div className="drink-check-badge">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preferences Section (When Drink is not Water) */}
          {drink !== "Water" && drink !== "" && (
            <div className="customization-card">
              <h3 className="customization-title">
                <span>☕</span> Customize Your {drink}
              </h3>

              {/* Sugar Category */}
              <div className="customization-category">
                <label className="customization-label">Sugar Preference</label>
                <div className="preference-pills-row">
                  {sugarOptions.map((option) => {
                    const isSelected = sugarPreference === option;
                    return (
                      <button
                        type="button"
                        key={option}
                        className={`pref-pill-btn ${
                          isSelected ? "pref-pill-selected" : ""
                        }`}
                        onClick={() =>
                          setSugarPreference(isSelected ? "" : option)
                        }
                      >
                        {isSelected && <span className="pill-check">✓</span>}
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Strength Category */}
              <div className="customization-category">
                <label className="customization-label">Brew Strength</label>
                <div className="preference-pills-row">
                  {strengthOptions.map((option) => {
                    const isSelected = strengthPreference === option;
                    return (
                      <button
                        type="button"
                        key={option}
                        className={`pref-pill-btn ${
                          isSelected ? "pref-pill-selected" : ""
                        }`}
                        onClick={() =>
                          setStrengthPreference(isSelected ? "" : option)
                        }
                      >
                        {isSelected && <span className="pill-check">✓</span>}
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Comment Note */}
              <div className="customization-category">
                <label htmlFor="custom-notes" className="customization-label">
                  Special Instructions (Optional)
                </label>
                <textarea
                  id="custom-notes"
                  placeholder="e.g. Extra hot, extra lemon, or half cup..."
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  rows="2"
                  className="custom-textarea"
                />
              </div>
            </div>
          )}

          {/* Preferences Section for Water */}
          {drink === "Water" && (
            <div className="customization-card">
              <h3 className="customization-title">
                <span>💧</span> Customize Your Water
              </h3>

              <div className="customization-category">
                <label className="customization-label">Temperature Preference</label>
                <div className="preference-pills-row">
                  {["Hot", "Cold"].map((temp) => {
                    const isSelected = waterTemperature === temp;
                    return (
                      <button
                        type="button"
                        key={temp}
                        className={`pref-pill-btn ${
                          isSelected ? "pref-pill-selected" : ""
                        }`}
                        onClick={() =>
                          setWaterTemperature(isSelected ? "" : temp)
                        }
                      >
                        {isSelected && <span className="pill-check">✓</span>}
                        {temp === "Hot" ? "🔥 Hot" : "❄️ Cold"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Comment Note for Water */}
              <div className="customization-category">
                <label htmlFor="water-notes" className="customization-label">
                  Special Instructions (Optional)
                </label>
                <textarea
                  id="water-notes"
                  placeholder="e.g. Lukewarm, room temperature, with ice..."
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  rows="2"
                  className="custom-textarea"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="order-submit-btn"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? "Submitting..." : "Submit Order"}</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default OrderPage;
