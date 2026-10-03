import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { generatePushCredentials, upsertEnvFile } from "./pushSetupUtils.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readOption(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

function runSupabase(args) {
  const result = spawnSync("npx", ["--yes", "supabase@latest", ...args], {
    cwd: rootDir,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function validateProjectRef(projectRef) {
  if (!/^[a-z0-9]{20}$/.test(projectRef)) {
    throw new Error("Project ref must be the 20-character identifier from the Supabase project URL.");
  }
}

function validatePublishableKey(key) {
  if (!key.startsWith("sb_publishable_")) {
    throw new Error("Use the project's sb_publishable_ API key, not a legacy anon key.");
  }
}

async function getSetupInput() {
  const options = {
    projectRef: readOption("project-ref"),
    publishableKey: readOption("publishable-key"),
    vapidSubject: readOption("vapid-subject"),
  };
  const prompt = createInterface({ input, output });

  try {
    options.projectRef ||= await prompt.question("Supabase project ref: ");
    options.publishableKey ||=
      await prompt.question("Supabase publishable key (sb_publishable_...): ");
    options.vapidSubject ||=
      await prompt.question("VAPID contact (for example mailto:ops@example.com): ");
  } finally {
    prompt.close();
  }

  validateProjectRef(options.projectRef.trim());
  validatePublishableKey(options.publishableKey.trim());
  if (!/^mailto:.+@.+\..+$/.test(options.vapidSubject.trim())) {
    throw new Error("VAPID contact must use the form mailto:name@example.com.");
  }

  return Object.fromEntries(
    Object.entries(options).map(([key, value]) => [key, value.trim()]),
  );
}

async function main() {
  const skipLogin = process.argv.includes("--skip-login");
  const webhookSecretFile = readOption("webhook-secret-file");

  if (!skipLogin) {
    console.log("Opening Supabase CLI login. Sign in with an Administrator or Owner account.\n");
    runSupabase(["login"]);
  }

  if (!readOption("project-ref")) {
    console.log("Your available Supabase projects:\n");
    runSupabase(["projects", "list"]);
    console.log("");
  }

  const { projectRef, publishableKey, vapidSubject } = await getSetupInput();
  const credentials = generatePushCredentials();
  const projectUrl = `https://${projectRef}.supabase.co`;

  upsertEnvFile(path.join(rootDir, ".env.local"), {
    VITE_SUPABASE_URL: projectUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    VITE_VAPID_PUBLIC_KEY: credentials.publicKey,
  });

  console.log("\nLocal browser configuration saved to .env.local.");
  runSupabase([
    "secrets",
    "set",
    "--project-ref",
    projectRef,
    `VAPID_PUBLIC_KEY=${credentials.publicKey}`,
    `VAPID_PRIVATE_KEY=${credentials.privateKey}`,
    `VAPID_SUBJECT=${vapidSubject}`,
    `PUSH_WEBHOOK_SECRET=${credentials.webhookSecret}`,
  ]);
  runSupabase([
    "functions",
    "deploy",
    "send-order-push",
    "--project-ref",
    projectRef,
  ]);

  console.log("\nPush function deployment complete.");
  console.log("Create the Database Webhook with these values:");
  console.log(`  URL: ${projectUrl}/functions/v1/send-order-push`);
  if (webhookSecretFile) {
    const secretPath = path.resolve(rootDir, webhookSecretFile);
    fs.writeFileSync(secretPath, `${credentials.webhookSecret}\n`, {
      encoding: "utf-8",
      mode: 0o600,
    });
    console.log(`  Authorization secret: saved to ${secretPath}`);
  } else {
    console.log(`  Authorization: Bearer ${credentials.webhookSecret}`);
  }
  console.log("\nFinish the remaining dashboard steps in docs/SUPABASE_DEPLOYMENT.md.");
}

main().catch((error) => {
  console.error(`\nSetup failed: ${error.message}`);
  process.exit(1);
});
