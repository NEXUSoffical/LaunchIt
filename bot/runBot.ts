import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TikTokListener, TikTokConfig } from "./tiktokListener";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env if present
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [k, ...rest] = trimmed.split("=");
    if (k) process.env[k.trim()] = rest.join("=").trim();
  }
}

const config: TikTokConfig = {
  botHandle: process.env.TIKTOK_BOT_HANDLE || "launchit4",
  sessionCookie: process.env.TIKTOK_SESSION_COOKIE || "",
  pollIntervalMs: 5000, // every 5 seconds
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
};

const listener = new TikTokListener(config);
listener.start();

process.on("SIGINT", () => {
  console.log("Shutting down TikTok bot listener...");
  listener.stop();
  process.exit(0);
});
