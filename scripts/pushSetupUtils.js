import crypto from "node:crypto";
import fs from "node:fs";

export function generatePushCredentials() {
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();

  return {
    publicKey: ecdh.getPublicKey().toString("base64url"),
    privateKey: ecdh.getPrivateKey().toString("base64url"),
    webhookSecret: crypto.randomBytes(32).toString("hex"),
  };
}

export function upsertEnvFile(filePath, variables) {
  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf-8")
    : "";
  const lines = existing.split(/\r?\n/).filter(Boolean);
  const replacements = new Map(Object.entries(variables));
  const retained = lines.filter((line) => {
    const key = line.split("=", 1)[0];
    return !replacements.has(key);
  });

  for (const [key, value] of replacements) {
    retained.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, `${retained.join("\n")}\n`, "utf-8");
}
