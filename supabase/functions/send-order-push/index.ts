import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!webhookSecret || request.headers.get("authorization") !== `Bearer ${webhookSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let event;
  try {
    event = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const order = event.record;
  if (event.type !== "INSERT" || event.table !== "drink_orders" || !order?.id) {
    return new Response("Ignored", { status: 202 });
  }

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (error) {
    console.error("Could not load push subscriptions:", error.message);
    return new Response("Could not load subscriptions", { status: 500 });
  }

  const expiredEndpoints: string[] = [];
  await Promise.all(
    (subscriptions || []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify({
            title: "New drink order",
            body: `${order.name} ordered ${order.drink}.`,
            url: "/dashboard",
            orderId: order.id,
          }),
          {
            TTL: 3600,
            urgency: "high",
          },
        );
      } catch (pushError) {
        const statusCode = (pushError as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(subscription.endpoint);
        } else {
          console.error("Could not send a push notification:", pushError);
        }
      }
    }),
  );

  if (expiredEndpoints.length > 0) {
    const { error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
    if (deleteError) {
      console.error("Could not remove expired push subscriptions:", deleteError.message);
    }
  }

  return new Response(
    JSON.stringify({ sent: (subscriptions || []).length - expiredEndpoints.length }),
    { headers: { "content-type": "application/json" } },
  );
});
