import "dotenv/config";
import express from "express";
import cors, { type CorsOptions } from "cors";
import { handleDemo } from "./routes/demo";
import { authRouter } from "./routes/auth";
import { prescriptionRouter } from "./routes/prescriptions";
import { medicationRouter } from "./routes/medications";
import { pharmacyRouter } from "./routes/pharmacies";
import { otpRouter } from "./routes/otp";
import { categoriesAgeRouter } from "./routes/categories";
import { countriesRouter } from "./routes/countries";
import { adminRouter } from "./routes/admin";
import { paymentRouter } from "./routes/payments";
import { ordonnanceRouter } from "./routes/ordonnances";
import { commercialRouter } from "./routes/commercial";
import { notificationRouter } from "./services/notificationProvider";
import { startReminderWorker } from "./services/reminderWorker";
import { connectToWhatsApp } from "./services/whatsappProvider";
import { db, initializeDatabase } from "./db";

// Initialize the SQLite database on server startup
initializeDatabase();

export function createServer() {
  const app = express();

  // Middleware
  // CORS Configuration - Accept requests from frontend domains
  const configuredOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
  const defaultOrigins = [
    "https://takymed.com",
    "https://www.takymed.com",
    "http://takymed.com",
    "http://www.takymed.com",
    "https://dev.takymed.com",
    "http://dev.takymed.com",
    "http://localhost:3500",
  ];
  const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser tools (curl, server-to-server calls)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-user-id",
      "X-Requested-With",
    ],
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
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

  // Root route - redirect to /api
  app.get("/", (_req, res) => {
    res.redirect("/api");
  });

  // API healthcheck routes (support both /api and /api/)
  app.get(["/api", "/api/"], (_req, res) => {
    res.json({
      status: "ok",
      message: "TAKYMED API is running",
      endpoints: {
        health: "/api",
        ping: "/api/ping",
      },
    });
  });

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/otp", otpRouter);
  app.use("/api/prescriptions", prescriptionRouter);
  app.use("/api/medications", medicationRouter);
  app.use("/api/pharmacies", pharmacyRouter);
  app.use("/api/categories", categoriesAgeRouter);
  app.use("/api/countries", countriesRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/payments", paymentRouter);
  app.use("/api/ordonnances", ordonnanceRouter);
  app.use("/api/notifications", notificationRouter);
  app.use("/api/commercial", commercialRouter);

  // Start services
  connectToWhatsApp().catch(err => console.error("WhatsApp Init Error:", err));
  startReminderWorker();

  return app;
}
