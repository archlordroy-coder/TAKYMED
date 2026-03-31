import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "./index";
import * as express from "express";
import https from "https";
import http from "http";
import fs from "fs";

const app = createServer();
const port = Number(process.env.PORT) || 3000;
const sslPort = Number(process.env.SSL_PORT) || 443;
const domain = process.env.DOMAIN || "localhost";

// In production, serve the built SPA files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "../spa");

// Serve static files
app.use(express.static(distPath));

// Handle React Router - serve index.html for all non-API routes
app.use((req, res, next) => {
  // Pass to the next middleware (or 404 handler) if it's an API request
  if (req.path === "/api" || req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return next();
  }

  res.sendFile(path.join(distPath, "index.html"));
});

// Check for SSL certificates
const certPath = `/etc/letsencrypt/live/${domain}/fullchain.pem`;
const keyPath = `/etc/letsencrypt/live/${domain}/privkey.pem`;

const hasSSL = fs.existsSync(certPath) && fs.existsSync(keyPath);

if (hasSSL) {
  // Start HTTPS server
  const sslOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };

  https.createServer(sslOptions, app).listen(sslPort, "0.0.0.0", () => {
    console.log(`� HTTPS Server running on port ${sslPort}`);
    console.log(`📱 Frontend: https://${domain}:${sslPort}`);
    console.log(`🔧 API: https://${domain}:${sslPort}/api`);
  });

  // Optional: Start HTTP to HTTPS redirect server
  http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${domain}:${sslPort}${req.url}` });
    res.end();
  }).listen(port, "0.0.0.0", () => {
    console.log(`🔄 HTTP redirect server on port ${port} → HTTPS ${sslPort}`);
  });
} else {
  // Start HTTP only
  app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 HTTP Server running on port ${port}`);
    console.log(`📱 Frontend: http://localhost:${port}`);
    console.log(`🔧 API: http://localhost:${port}/api`);
    console.log(`⚠️  SSL certificates not found at ${certPath}`);
    console.log(`   Run: certbot certonly --standalone -d ${domain}`);
  });
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
