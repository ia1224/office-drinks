import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// 1. Generate standard NIST P-256 (prime256v1) EC keypair for VAPID
const ecdh = crypto.createECDH("prime256v1");
ecdh.generateKeys();

const publicKey = ecdh.getPublicKey().toString("base64url");
const privateKey = ecdh.getPrivateKey().toString("base64url");
const webhookSecret = crypto.randomBytes(32).toString("hex");

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
  let content = "";
  if (fs.existsSync(envLocalPath)) {
    content = fs.readFileSync(envLocalPath, "utf-8");
  }

  if (content.includes("VITE_VAPID_PUBLIC_KEY=")) {
    content = content.replace(
      /VITE_VAPID_PUBLIC_KEY=.*/g,
      `VITE_VAPID_PUBLIC_KEY=${publicKey}`
    );
  } else {
    content += `\nVITE_VAPID_PUBLIC_KEY=${publicKey}\n`;
  }

  fs.writeFileSync(envLocalPath, content.trim() + "\n", "utf-8");
  console.log(`✅ Saved VITE_VAPID_PUBLIC_KEY to ${envLocalPath}\n`);
}
