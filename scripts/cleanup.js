#!/usr/bin/env node

/**
 * Cleanup script to organize project structure
 * Moves files from root to appropriate subdirectories
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(path.dirname(__filename)); // Go up 2 levels from /scripts/cleanup.js

// Files to move and their destinations
const moves = [
  // Frontend files
  { src: "index.html", dest: "frontend/index.html" },
  { src: "components.json", dest: "frontend/components.json" },
  { src: "postcss.config.js", dest: "frontend/postcss.config.js" },
  { src: "tailwind.config.ts", dest: "frontend/tailwind.config.ts" },
  { src: "vite.config.ts", dest: "frontend/vite.config.ts" },
  
  // Backend files
  { src: "vite.config.server.ts", dest: "backend/vite.config.server.ts" },
  { src: "bd.sql", dest: "backend/data/bd.sql" },
  { src: "bd.sqlite", dest: "backend/data/bd.sqlite" },
  { src: "bd.sqlite-shm", dest: "backend/data/bd.sqlite-shm" },
  { src: "bd.sqlite-wal", dest: "backend/data/bd.sqlite-wal" },
  { src: "server_logs.txt", dest: "backend/server_logs.txt" },
];

console.log("🧹 Starting cleanup...\n");

let moved = 0;
let skipped = 0;
let errors = 0;

moves.forEach(({ src, dest }) => {
  const srcPath = path.join(ROOT, src);
  const destPath = path.join(ROOT, dest);

  // Skip if source doesn't exist
  if (!fs.existsSync(srcPath)) {
    console.log(`⏭️  ${src} - does not exist`);
    skipped++;
    return;
  }

  // Skip if already in correct location
  if (srcPath === destPath) {
    console.log(`✅ ${src} - already in correct location`);
    skipped++;
    return;
  }

  try {
    // Create dest directory if needed
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Move file using copy + delete pattern
    const content = fs.readFileSync(srcPath);
    fs.writeFileSync(destPath, content);
    fs.unlinkSync(srcPath);

    console.log(`✓ ${src} → ${dest}`);
    moved++;
  } catch (err) {
    console.error(`✗ ${src} - Error: ${err.message}`);
    errors++;
  }
});

console.log(`\n📊 Results:`);
console.log(`   ✓ Moved: ${moved}`);
console.log(`   ⏭️  Skipped: ${skipped}`);
console.log(`   ✗ Errors: ${errors}`);

if (errors === 0) {
  console.log(`\n✨ Cleanup completed successfully!`);
  process.exit(0);
} else {
  console.log(`\n⚠️  Some files had errors`);
  process.exit(1);
}
