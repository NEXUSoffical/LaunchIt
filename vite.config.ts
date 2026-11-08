import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { applyDbAction, recoverFromSolanaChain } from "./api/launchit-db.js";

function launchitDbMiddleware() {
  return {
    name: "launchit-shared-db-middleware",
    configureServer(server: any) {
      server.middlewares.use("/api/launchit-db", async (req: any, res: any) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Content-Type", "application/json");

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
          return;
        }

        await recoverFromSolanaChain();

        if (req.method === "GET") {
          const store = applyDbAction("NONE", null);
          res.statusCode = 200;
          res.end(JSON.stringify(store));
          return;
        }

        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk: any) => {
            body += chunk.toString();
          });
          req.on("end", () => {
            try {
              const parsed = body ? JSON.parse(body) : {};
              const store = applyDbAction(parsed.action, parsed.payload);
              res.statusCode = 200;
              res.end(JSON.stringify(store));
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: e?.message || "Invalid JSON" }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: "Method not allowed" }));
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), launchitDbMiddleware()],
  server: {
    port: 5174,
    host: true,
  },
  define: {
    "process.env": {},
  },
});
