import { isSupabaseConfigured, supabase } from "./supabase";

export function getVapidPublicKey() {
  const rawKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!rawKey || typeof rawKey !== "string") return null;

  const trimmed = rawKey.trim().replace(/^["']|["']$/g, "");
  if (
    !trimmed ||
    trimmed === "your-vapid-public-key" ||
    trimmed.includes("your-vapid")
  ) {
    return null;
  }
  return trimmed;
}

function decodeVapidPublicKey(key) {
  const cleanKey = key.trim().replace(/^["']|["']$/g, "");
  const padding = "=".repeat((4 - (cleanKey.length % 4)) % 4);
  const base64 = (cleanKey + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isOrderPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator
  );
}

export async function hasOrderPushSubscription() {
  if (!isOrderPushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  if (!getVapidPublicKey()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return Boolean(subscription);
  } catch (error) {
    console.error("Could not check push subscription:", error);
    return false;
  }
}

export async function enableOrderPushNotifications() {
  if (!isOrderPushSupported()) {
    throw new Error("Push notifications are not supported by this browser.");
  }

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) {
    throw new Error(
      "VITE_VAPID_PUBLIC_KEY is missing or not configured. Run 'npm run generate-vapid' and add it to your .env file, then restart the dev server."
    );
  }

  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("Supabase must be configured before enabling push alerts.");
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Allow notifications in your browser/device to receive order alerts.");
  }

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = decodeVapidPublicKey(vapidPublicKey);

  let subscription = await registration.pushManager.getSubscription();

  // If a previous subscription exists, check whether the applicationServerKey matches.
  // If keys mismatch or key changed, unsubscribe and re-subscribe cleanly.
  if (subscription) {
    try {
      const currentRawKey = subscription.options?.applicationServerKey;
      if (currentRawKey) {
        const currentBytes = new Uint8Array(currentRawKey);
        const isMatch =
          currentBytes.length === applicationServerKey.length &&
          currentBytes.every((byte, idx) => byte === applicationServerKey[idx]);

        if (!isMatch) {
          console.log("Push key mismatch with existing subscription. Renewing subscription...");
          await subscription.unsubscribe();
          subscription = null;
        }
      }
    } catch {
      try {
        await subscription.unsubscribe();
      } catch (unsubscribeError) {
        console.warn("Could not remove the old push subscription:", unsubscribeError);
      }
      subscription = null;
    }
  }

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch (error) {
      const detail = error?.message || "Unknown browser push service error.";
      throw new Error(
        `Push registration failed: ${detail} Check that this browser can reach its push service, then clear this site's data and retry.`,
        { cause: error },
      );
    }
  }

  const keys = subscription.toJSON().keys;
  if (!keys?.p256dh || !keys.auth) {
    throw new Error("The browser did not return valid push encryption keys.");
  }

  const { error } = await supabase.rpc("register_order_push_subscription", {
    subscription_endpoint: subscription.endpoint,
    subscription_p256dh: keys.p256dh,
    subscription_auth: keys.auth,
  });

  if (error) {
    throw new Error(
      `Could not save this device in Supabase push_subscriptions: ${error.message}. Please verify supabase_schema.sql was run in Supabase SQL Editor.`
    );
  }

  return subscription;
}

export async function disableOrderPushNotifications() {
  if (!isOrderPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.rpc("unregister_order_push_subscription", {
      subscription_endpoint: endpoint,
    });
    if (error) {
      console.warn("Could not remove the push subscription from Supabase:", error);
    }
  }
}

export async function sendLocalTestNotification() {
  if (!isOrderPushSupported()) {
    throw new Error("Notifications are not supported by this browser.");
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission is not granted.");
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification("Office Barista · Test Alert", {
    body: "Notifications are working! You will receive alerts when new orders are placed.",
    icon: "/pwa-icon.svg",
    badge: "/pwa-icon.svg",
    tag: "drink-order-test",
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: "/dashboard" },
  });
}
