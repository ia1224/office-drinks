import { isSupabaseConfigured, supabase } from "./supabase";

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function decodeVapidPublicKey(key) {
  const padding = "=".repeat((4 - (key.length % 4)) % 4);
  const decoded = window.atob(`${key}${padding}`);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export function isOrderPushSupported() {
  return (
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator
  );
}

export async function hasOrderPushSubscription() {
  if (!isOrderPushSupported()) return false;

  const registration = await navigator.serviceWorker.ready;
  return Boolean(await registration.pushManager.getSubscription());
}

export async function enableOrderPushNotifications() {
  if (!isOrderPushSupported()) {
    throw new Error("Push notifications are not supported by this browser.");
  }
  if (!vapidPublicKey) {
    throw new Error("VITE_VAPID_PUBLIC_KEY is missing from the app configuration.");
  }
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("Supabase must be configured before enabling push alerts.");
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Allow notifications in your browser to receive order alerts.");
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidPublicKey(vapidPublicKey),
    }));
  const keys = subscription.toJSON().keys;

  if (!keys?.p256dh || !keys.auth) {
    throw new Error("The browser did not return a valid push subscription.");
  }

  const { error } = await supabase.rpc("register_order_push_subscription", {
    subscription_endpoint: subscription.endpoint,
    subscription_p256dh: keys.p256dh,
    subscription_auth: keys.auth,
  });

  if (error) {
    throw new Error(`Could not save this device for push alerts: ${error.message}`);
  }
}
