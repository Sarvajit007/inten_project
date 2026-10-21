import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { completeFile, getFileById } from "../db";
import { storageUploadBytes } from "../storage";
import { createContext } from "./context";
import { sdk } from "./sdk";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  // Fallback for private storage providers whose bucket CORS policy blocks browser PUT preflight.
  // The normal client path remains direct-to-storage; this route is same-origin and owner-checked.
  app.post("/api/files/upload-relay", express.raw({ type: "application/octet-stream", limit: "50mb" }), async (req, res) => {
    try {
      let user;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        user = null;
      }
      if (!user) return res.status(401).json({ error: "Please sign in again." });
      const fileId = req.get("x-file-id") || "";
      const storageKey = req.get("x-storage-key") || "";
      const file = await getFileById(fileId, user.id);
      if (!file || file.status !== "pending" || file.storageKey !== storageKey) {
        return res.status(403).json({ error: "Upload authorization is invalid or expired." });
      }
      const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (body.length !== file.size) return res.status(400).json({ error: "Uploaded file size does not match the reservation." });
      await storageUploadBytes(file.storageKey, body, req.get("content-type") || file.mimeType);
      await completeFile(file.id, user.id, {
        fileName: file.fileName,
        size: file.size,
        mimeType: file.mimeType,
        storageKey: file.storageKey,
      });
      return res.json({ ok: true });
    } catch (error) {
      console.error("Upload relay failed:", error);
      return res.status(500).json({ error: "Upload failed while writing to private storage." });
    }
  });
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
