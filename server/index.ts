import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { authRouter } from "./routes/auth";
import { prescriptionRouter } from "./routes/prescriptions";
import { medicationRouter } from "./routes/medications";
import { pharmacyRouter } from "./routes/pharmacies";
import { adminRouter } from "./routes/admin";
import { categoriesAgeRouter } from "./routes/categories";
import { db, initializeDatabase } from "./db";

// Initialize the SQLite database on server startup
initializeDatabase();

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(express.static("public"));

  // Custom CSP Middleware to prevent Chrome DevTools and Google Translate blocking
  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob: ws: wss:;"
    );
    next();
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/prescriptions", prescriptionRouter);
  app.use("/api/medications", medicationRouter);
  app.use("/api/pharmacies", pharmacyRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/categories", categoriesAgeRouter);
  app.get("/api/demo", handleDemo);

  return app;
}
