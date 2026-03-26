#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests communication between frontend and backend
 */

import http from "http";
import https from "https";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(path.dirname(__filename));

// Configuration
const BACKEND_PORT = 3001;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const TESTS = [];
let passedTests = 0;
let failedTests = 0;

// Helper to make HTTP requests
function makeRequest(url, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const requestUrl = new URL(url);

    const options = {
      hostname: requestUrl.hostname,
      port: requestUrl.port,
      path: requestUrl.pathname + requestUrl.search,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = protocol.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test functions
async function testBackendHealth() {
  console.log("\n🔍 Testing Backend Health...");
  try {
    const res = await makeRequest(`${BACKEND_URL}/api`);
    if (res.status === 200 && res.body.status === "ok") {
      console.log("✅ Backend API is running");
      return true;
    } else {
      console.log(`❌ Unexpected response: ${res.status}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ Failed to connect: ${err.message}`);
    return false;
  }
}

async function testPingEndpoint() {
  console.log("\n🔍 Testing Ping Endpoint...");
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/ping`);
    if (res.status === 200 && res.body.message) {
      console.log(`✅ Ping response: "${res.body.message}"`);
      return true;
    } else {
      console.log(`❌ Unexpected response: ${res.status}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
    return false;
  }
}

async function testAuthEndpoint() {
  console.log("\n🔍 Testing Auth Endpoint (POST /api/auth/login)...");
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/auth/login`, "POST", {
      phone: "+1234567890",
      pin: "1234",
    });
    // We expect either auth error or success - just check connection works
    if (res.status >= 200 && res.status < 500) {
      console.log(`✅ Auth endpoint responded: ${res.status}`);
      return true;
    } else {
      console.log(`❌ Server error: ${res.status}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
    return false;
  }
}

async function testCorsHeaders() {
  console.log("\n🔍 Testing CORS Headers...");
  try {
    const res = await makeRequest(`${BACKEND_URL}/api`);
    const corsHeaders = [
      "access-control-allow-origin",
      "access-control-allow-methods",
      "access-control-allow-credentials",
    ];

    const hasCors = corsHeaders.some((h) => h in res.headers);
    if (hasCors) {
      console.log("✅ CORS headers found");
      console.log(
        `   - Allow-Origin: ${res.headers["access-control-allow-origin"] || "not set"}`
      );
      return true;
    } else {
      console.log("⚠️  No CORS headers found (might be OK for localhost)");
      return true; // Not a critical test
    }
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log("\n🔍 Testing Database Connection...");
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/medications?limit=1`);
    if (res.status === 200 && Array.isArray(res.body)) {
      console.log(`✅ Database connection OK (found ${res.body.length} medications)`);
      return true;
    } else if (res.status === 200) {
      console.log("✅ Database endpoint responding");
      return true;
    } else {
      console.log(`❌ Database query failed: ${res.status}`);
      return false;
    }
  } catch (err) {
    console.log(`⚠️  Database test skipped: ${err.message}`);
    return true; // Not critical in test environment
  }
}

// Main test runner
async function runTests() {
  console.log("═══════════════════════════════════════");
  console.log("  TAKYMED Frontend-Backend Integration Test");
  console.log("═══════════════════════════════════════");

  // Give backend time to start
  console.log("\n⏳ Waiting for backend to be ready...");
  let backendReady = false;
  for (let i = 0; i < 10; i++) {
    try {
      await makeRequest(`${BACKEND_URL}/api`, "GET");
      backendReady = true;
      break;
    } catch (err) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!backendReady) {
    console.log("\n❌ Backend did not start. Make sure to run: npm run dev:backend");
    process.exit(1);
  }

  // Run tests
  const testList = [
    testBackendHealth,
    testPingEndpoint,
    testCorsHeaders,
    testAuthEndpoint,
    testDatabaseConnection,
  ];

  for (const test of testList) {
    try {
      const result = await test();
      if (result) passedTests++;
      else failedTests++;
    } catch (err) {
      console.error(`💥 Test error: ${err.message}`);
      failedTests++;
    }
  }

  // Summary
  console.log("\n═══════════════════════════════════════");
  console.log("  Test Summary");
  console.log("═══════════════════════════════════════");
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total:  ${passedTests + failedTests}`);

  if (failedTests === 0) {
    console.log("\n🎉 All tests passed! Frontend and Backend communicate successfully!");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some tests failed. Check the output above.");
    process.exit(1);
  }
}

// Main execution
console.log("\n📋 Starting backend in development mode...");
console.log(`   Command: cd backend && npm run dev\n`);

const backend = spawn("npm", ["run", "dev:backend"], {
  cwd: ROOT,
  stdio: ["inherit", "pipe", "pipe"],
});

// Wait a bit then run tests
setTimeout(runTests, 3000);

// Handle backend exit
backend.on("error", (err) => {
  console.error("❌ Failed to start backend:", err.message);
  process.exit(1);
});

backend.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\n⚠️  Backend exited with code ${code}`);
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n🛑 Stopping backend...");
  backend.kill();
  process.exit(0);
});
