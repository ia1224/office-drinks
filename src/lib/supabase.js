import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl !== "https://your-project-id.supabase.co" &&
      !supabaseUrl.includes("your-project-id") &&
      supabaseAnonKey !== "your-anon-key-here",
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Fetch all drink orders (created within the last 6 hours) directly from Supabase
 */
export async function fetchOrders() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error(
      "Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
    );
  }

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("drink_orders")
    .select("*")
    .gte("created_at", sixHoursAgo)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to fetch orders from Supabase");
  }

  return (data || []).map((row) => ({
    id: Number(row.id),
    name: row.name,
    drink: row.drink,
    sugarPreference: row.sugar_preference || "",
    strengthPreference: row.strength_preference || "",
    customComment: row.custom_comment || "",
    time: row.time,
    isDelivered: Boolean(row.is_delivered),
    createdAt: new Date(row.created_at).getTime(),
  }));
}

/**
 * Insert a new drink order directly into Supabase
 */
export async function insertOrder(order) {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error(
      "Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
    );
  }

  const newRow = {
    id: order.id,
    name: order.name,
    drink: order.drink,
    sugar_preference: order.sugarPreference || "",
    strength_preference: order.strengthPreference || "",
    custom_comment: order.customComment || "",
    time: order.time,
    created_at: new Date(order.createdAt || Date.now()).toISOString(),
  };

  if (order.isDelivered !== undefined) {
    newRow.is_delivered = Boolean(order.isDelivered);
  }

  const { data, error } = await supabase.from("drink_orders").insert([newRow]);

  if (error) {
    throw new Error(error.message || "Failed to submit order to Supabase");
  }

  return { success: true, data };
}

/**
 * Update delivery status of an order in Supabase
 */
export async function updateOrderDelivered(orderId, isDelivered) {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("drink_orders")
    .update({ is_delivered: isDelivered })
    .eq("id", orderId);

  if (error) {
    if (error.code === "42703") {
      throw new Error(
        "Column 'is_delivered' does not exist in Supabase yet. Please run the SQL command in Supabase SQL Editor: ALTER TABLE public.drink_orders ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT FALSE; CREATE POLICY \"Allow public update on drink_orders\" ON public.drink_orders FOR UPDATE USING (true);",
      );
    }
    throw new Error(
      error.message || "Failed to update delivery status in Supabase",
    );
  }

  return { success: true };
}

/**
 * Delete a single order from Supabase
 */
export async function deleteOrder(orderId) {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("drink_orders")
    .delete()
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message || "Failed to delete order from Supabase");
  }

  return { success: true };
}

/**
 * Clear all orders from Supabase
 */
export async function clearAllOrders() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("drink_orders")
    .delete()
    .neq("id", 0);

  if (error) {
    throw new Error(error.message || "Failed to clear orders from Supabase");
  }

  return { success: true };
}

/**
 * Subscribe to realtime changes on drink_orders table
 */
export function subscribeToOrders({ onInsert, onDelete, onUpdate, onError }) {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }

  try {
    const channel = supabase
      .channel("public:drink_orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "drink_orders" },
        (payload) => {
          if (onInsert && payload.new) {
            const row = payload.new;
            const mapped = {
              id: Number(row.id),
              name: row.name,
              drink: row.drink,
              sugarPreference: row.sugar_preference || "",
              strengthPreference: row.strength_preference || "",
              customComment: row.custom_comment || "",
              time: row.time,
              isDelivered: Boolean(row.is_delivered),
              createdAt: new Date(row.created_at).getTime(),
            };
            onInsert(mapped);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "drink_orders" },
        (payload) => {
          if (onUpdate && payload.new) {
            const row = payload.new;
            const mapped = {
              id: Number(row.id),
              name: row.name,
              drink: row.drink,
              sugarPreference: row.sugar_preference || "",
              strengthPreference: row.strength_preference || "",
              customComment: row.custom_comment || "",
              time: row.time,
              isDelivered: Boolean(row.is_delivered),
              createdAt: new Date(row.created_at).getTime(),
            };
            onUpdate(mapped);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "drink_orders" },
        (payload) => {
          if (onDelete && payload.old) {
            onDelete(Number(payload.old.id));
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" && onError) {
          onError(err || new Error("Supabase Realtime subscription error"));
        }
      });

    return channel;
  } catch (err) {
    if (onError) onError(err);
    return null;
  }
}
