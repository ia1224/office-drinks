import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePushCredentials, upsertEnvFile } from "./pushSetupUtils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const { publicKey, privateKey, webhookSecret } = generatePushCredentials();

console.log("\n==================================================================");
console.log("   🔑 VAPID Keys & Push Notification Configuration Generated");
console.log("==================================================================\n");

console.log("👉 FRONTEND (.env):");
console.log(`VITE_VAPID_PUBLIC_KEY=${publicKey}\n`);

console.log("👉 BACKEND / SUPABASE SECRETS (Run via Supabase CLI):");
console.log(
  `supabase secrets set VAPID_PUBLIC_KEY="${publicKey}" VAPID_PRIVATE_KEY="${privateKey}" VAPID_SUBJECT="mailto:caretaker@office.local" PUSH_WEBHOOK_SECRET="${webhookSecret}"\n`
);

console.log("👉 SUPABASE DATABASE WEBHOOK:");
console.log("1. Go to Supabase Dashboard -> Database -> Webhooks");
console.log("2. Create a new webhook:");
console.log("   - Table: public.drink_orders");
console.log("   - Events: INSERT");
console.log("   - Method: POST");
console.log("   - URL: https://<your-project-id>.supabase.co/functions/v1/send-order-push");
console.log(`   - HTTP Header: Authorization: Bearer ${webhookSecret}`);
console.log("==================================================================\n");

// Optional: write to .env or .env.local if requested via --write
if (process.argv.includes("--write")) {
  const envLocalPath = path.join(rootDir, ".env.local");
  upsertEnvFile(envLocalPath, { VITE_VAPID_PUBLIC_KEY: publicKey });
  console.log(`✅ Saved VITE_VAPID_PUBLIC_KEY to ${envLocalPath}\n`);
}
