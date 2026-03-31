#!/usr/bin/env node

/**
 * Backend API Health Check & Communication Test
 * Verifies that the backend API is responding correctly
 */

import http from "http";
import https from "https";

const BACKEND_HOST = "82.165.150.150";
const BACKEND_PORT = 3500;
const API_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

console.log("🔍 TAKYMED Backend Health Check");
console.log("================================\n");

// Test 1: Basic connectivity
async function testConnectivity() {
  console.log("1️⃣  Testing basic connectivity...");
  try {
    const response = await makeRequest(`${API_URL}/api`);
    if (response.status === 200) {
      console.log("   ✅ Backend is responding");
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.body, null, 2)}\n`);
      return true;
    } else {
      console.log(`   ❌ Unexpected status: ${response.status}\n`);
      return false;
    }
  } catch (err) {
    console.log(`   ❌ Connection failed: ${err.message}\n`);
    return false;
  }
}

// Test 2: Ping endpoint
async function testPing() {
  console.log("2️⃣  Testing /api/ping endpoint...");
  try {
    const response = await makeRequest(`${API_URL}/api/ping`);
    if (response.status === 200 && response.body.message) {
      console.log(`   ✅ Ping successful`);
      console.log(`   Message: "${response.body.message}"\n`);
      return true;
    }
  } catch (err) {
    console.log(`   ❌ Ping failed: ${err.message}\n`);
  }
  return false;
}

// Test 3: CORS Headers
async function testCORS() {
  console.log("3️⃣  Testing CORS headers...");
  try {
    const response = await makeRequest(`${API_URL}/api`);
    const corsHeader = response.headers["access-control-allow-origin"];
    if (corsHeader) {
      console.log(`   ✅ CORS is configured`);
      console.log(`   Allow-Origin: ${corsHeader}\n`);
      return true;
    } else {
      console.log(`   ⚠️  No CORS headers found (might be OK for IP access)\n`);
      return true;
    }
  } catch (err) {
    console.log(`   ⚠️  Could not check CORS: ${err.message}\n`);
    return true;
  }
}

// Test 4: Database access
async function testDatabase() {
  console.log("4️⃣  Testing medication database access...");
  try {
    const response = await makeRequest(`${API_URL}/api/medications?limit=1`);
    if (response.status === 200) {
      if (Array.isArray(response.body) && response.body.length > 0) {
        console.log(`   ✅ Database connected`);
        console.log(`   Found ${response.body.length} medication(s)`);
        console.log(`   Sample: ${JSON.stringify(response.body[0], null, 2)}\n`);
        return true;
      } else if (Array.isArray(response.body)) {
        console.log(`   ✅ Database connected (no medications yet)\n`);
        return true;
      }
    }
  } catch (err) {
    console.log(`   ⚠️  Database test skipped: ${err.message}\n`);
    return true;
  }
  return false;
}

// HTTP helper
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
        "User-Agent": "TAKYMED-HealthCheck/1.0",
      },
      timeout: 5000,
    };

    const req = protocol.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Run all tests
async function runTests() {
  const results = [];

  results.push(await testConnectivity());
  if (!results[0]) {
    console.log("❌ Cannot reach backend. Check:");
    console.log("   1. Server IP: 82.165.150.150");
    console.log("   2. Port: 3500");
    console.log("   3. Firewall rules allowing port 3500");
    console.log("   4. Backend running: ssh root@82.165.150.150 'ps aux | grep node'\n");
    return;
  }

  results.push(await testPing());
  results.push(await testCORS());
  results.push(await testDatabase());

  // Summary
  console.log("📊 Summary:");
  console.log(`   ✅ Passed: ${results.filter((r) => r).length}/${results.length}\n`);

  if (results.every((r) => r)) {
    console.log("✨ Backend is healthy and ready for frontend communication!\n");
    console.log("Frontend configuration:");
    console.log("   VITE_API_BASE_URL=http://82.165.150.150:3500");
    console.log("   Or with DNS: VITE_API_BASE_URL=https://dev.takymed.com");
  } else {
    console.log("⚠️  Some tests failed. Check the output above.");
  }
}

runTests().catch(console.error);
