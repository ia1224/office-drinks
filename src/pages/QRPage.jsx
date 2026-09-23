import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import "./QRPage.css";

function QRPage() {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);
  const orderUrl =
    typeof window !== "undefined" ? `${window.location.origin}/order` : "";

  useEffect(() => {
    if (canvasRef.current && orderUrl) {
      QRCode.toCanvas(
        canvasRef.current,
        orderUrl,
        {
          width: 280,
          margin: 1,
          color: {
            dark: "#0b3b32", // Forest green matching screenshot
            light: "#ffffff",
          },
          errorCorrectionLevel: "H",
        },
        (error) => {
          if (error) {
            console.error("QR Code generation error:", error);
          }
        },
      );
    }
  }, [orderUrl]);

  // Download high-resolution branded PNG
  const handleDownload = () => {
    // Create an offscreen canvas to compose the full branded placard
    const downloadCanvas = document.createElement("canvas");
    const width = 800;
    const height = 980;
    downloadCanvas.width = width;
    downloadCanvas.height = height;
    const ctx = downloadCanvas.getContext("2d");

    if (!ctx) return;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.roundRect(0, 0, width, height, 40);
    ctx.fill();

    // Subtle border
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#e5e7eb";
    ctx.roundRect(2, 2, width - 4, height - 4, 40);
    ctx.stroke();

    // Header Bar
    const headerMargin = 40;
    const headerHeight = 90;
    ctx.fillStyle = "#0b3b32";
    ctx.roundRect(
      headerMargin,
      headerMargin,
      width - headerMargin * 2,
      headerHeight,
      20,
    );
    ctx.fill();

    // Header Text: Office Barista
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Office Barista", headerMargin + 30, headerMargin + headerHeight / 2);

    // Header Tag: SCAN ME
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(
      "SCAN ME",
      width - headerMargin - 30,
      headerMargin + headerHeight / 2,
    );

    // Generate high-res QR directly onto download canvas
    const qrCanvas = document.createElement("canvas");
    QRCode.toCanvas(
      qrCanvas,
      orderUrl,
      {
        width: 600,
        margin: 1,
        color: {
          dark: "#0b3b32",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      },
      (err) => {
        if (!err) {
          // Draw QR in the center
          ctx.drawImage(qrCanvas, 100, 165, 600, 600);

          // ORDER LINK label
          ctx.fillStyle = "#9ca3af";
          ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("ORDER LINK", width / 2, 810);

          // URL text
          ctx.fillStyle = "#374151";
          ctx.font = "24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.fillText(orderUrl, width / 2, 855);

          // Trigger download
          const link = document.createElement("a");
          link.download = "office-barista-qr.png";
          link.href = downloadCanvas.toDataURL("image/png");
          link.click();
        }
      },
    );
  };

  // Copy order link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  // Print QR placard
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="qr-page">
      <div className="qr-content">
        {/* Office Pantry Badge */}
        <div className="qr-badge">OFFICE PANTRY</div>

        {/* Heading & Subheading */}
        <h1 className="qr-title">Scan to place your drink order</h1>
        <p className="qr-subtitle">
          Point your phone camera at the QR code, tell us what you'd like, and
          we'll bring it to you.
        </p>

        {/* QR Placard Card */}
        <div className="qr-card">
          <div className="qr-card-header">
            <span className="qr-card-title">Office Barista</span>
            <span className="qr-card-tag">SCAN ME</span>
          </div>

          <div className="qr-canvas-container">
            <canvas ref={canvasRef} className="qr-canvas" />
          </div>

          <div className="qr-link-section">
            <div className="qr-link-label">ORDER LINK</div>
            <a
              href={orderUrl}
              className="qr-link-url"
              target="_blank"
              rel="noopener noreferrer"
            >
              {orderUrl}
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="qr-actions">
          <button
            type="button"
            className="qr-btn qr-btn-primary"
            onClick={handleDownload}
          >
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PNG
          </button>

          <button
            type="button"
            className="qr-btn qr-btn-outline"
            onClick={handleCopyLink}
          >
            {copied ? (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
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
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy link
              </>
            )}
          </button>

          <button
            type="button"
            className="qr-btn qr-btn-outline"
            onClick={handlePrint}
          >
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
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>
        </div>

        {/* How It Works Card */}
        <div className="qr-how-it-works">
          <div className="how-it-works-label">HOW IT WORKS</div>
          <ol className="how-it-works-steps">
            <li>
              <span className="step-num">1.</span>
              <span className="step-text">
                Employee scans the QR with their phone camera
              </span>
            </li>
            <li>
              <span className="step-num">2.</span>
              <span className="step-text">
                Enters their name and picks a drink
              </span>
            </li>
            <li>
              <span className="step-num">3.</span>
              <span className="step-text">
                Order arrives instantly on the pantry dashboard
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default QRPage;
