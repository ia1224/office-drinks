// Web Audio API chime generator for incoming orders
// Works across modern browsers (Chrome, Android, iOS Safari) without external audio files

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== "undefined") {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

/**
 * Unlocks the Web Audio API on the first user interaction (touch/click).
 * Required by Chrome & Safari's Autoplay Policy.
 */
export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

// Auto-register touch/click listeners to unlock audio seamlessly on first tap
if (typeof window !== "undefined") {
  const unlockHandler = () => {
    unlockAudio();
    window.removeEventListener("click", unlockHandler);
    window.removeEventListener("touchstart", unlockHandler);
  };
  window.addEventListener("click", unlockHandler, { passive: true });
  window.addEventListener("touchstart", unlockHandler, { passive: true });
}

/**
 * Plays a resonant, 2-tone "Ding-Dong" cafe barista chime
 * and triggers phone vibration.
 */
export function playOrderChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz) - bright intro ping
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.7, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.46);

    // Tone 2: A5 (880 Hz) - bell resonance
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.16);

    gain2.gain.setValueAtTime(0.001, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.85, now + 0.19);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.16);
    osc2.stop(now + 0.92);

    // Physical vibration for mobile devices
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([300, 120, 300]);
      } catch {
        // Ignore vibration errors if blocked
      }
    }
  } catch (err) {
    console.warn("Could not play audio chime:", err);
  }
}

/**
 * Shows a browser system notification if granted
 */
export async function showOrderNotification(order) {
  // Always trigger sound & vibration first
  playOrderChime();

  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration && registration.showNotification) {
      await registration.showNotification(`☕ New Order: ${order.name}`, {
        body: `${order.drink}${
          order.strengthPreference ? ` (${order.strengthPreference})` : ""
        }${order.customComment ? ` · "${order.customComment}"` : ""}`,
        icon: "/pwa-icon.svg",
        badge: "/pwa-icon.svg",
        tag: `drink-order-${order.id}`,
        renotify: true,
        requireInteraction: true,
        vibrate: [300, 150, 300],
        silent: false,
        data: { url: "/dashboard" },
      });
    }
  } catch (error) {
    console.warn("System notification error:", error);
  }
}
