import { TikTokListener, TikTokConfig } from "./tiktokListener";

// Read from environment variables or config
const config: TikTokConfig = {
  botHandle: process.env.TIKTOK_BOT_HANDLE || "launchit.world",
  sessionCookie: process.env.TIKTOK_SESSION_COOKIE || "",
  pollIntervalMs: 5000, // every 5 seconds
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
};

const listener = new TikTokListener(config);
listener.start();

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down TikTok bot listener...");
  listener.stop();
  process.exit(0);
});
