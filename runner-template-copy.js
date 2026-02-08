#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const templateFiles = [
  ".github/workflows/deploy.yml",
  ".azure/deploy.yml",
  ".env.example",
  ".gitignore",
  ".npmignore",
];

const sourceRoot = __dirname;
const targetRoot = process.cwd();
const args = new Set(process.argv.slice(2));
const force = args.has("--force") || args.has("-f");

let copied = 0;
let skipped = 0;
let failed = 0;

console.log("🚀 runner-template-copy");
console.log(`📦 Source: ${sourceRoot}`);
console.log(`📁 Target: ${targetRoot}`);
console.log(`⚙️ Mode: ${force ? "force overwrite" : "skip existing files"}`);
console.log("");

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

for (const relativePath of templateFiles) {
  const from = path.join(sourceRoot, relativePath);
  const to = path.join(targetRoot, relativePath);

  if (!fs.existsSync(from)) {
    console.log(`⚠️ Skip: source file not found -> ${relativePath}`);
    skipped += 1;
    continue;
  }

  const exists = fs.existsSync(to);
  if (exists && !force) {
    console.log(`⏭️ Skip: target exists -> ${relativePath}`);
    console.log(`   📥 ${from}`);
    console.log(`   📤 ${to}`);
    skipped += 1;
    continue;
  }

  try {
    ensureDir(to);
    fs.copyFileSync(from, to);
    console.log(`${exists ? "♻️ Overwrite" : "✅ Copy"}: ${relativePath}`);
    console.log(`   📥 ${from}`);
    console.log(`   📤 ${to}`);
    copied += 1;
  } catch (error) {
    console.log(`❌ Error: ${relativePath}`);
    console.log(`   🧨 ${error.message}`);
    failed += 1;
  }
}

console.log("");
console.log(`📊 Summary: copied=${copied}, skipped=${skipped}, failed=${failed}`);

if (failed > 0) {
  process.exit(1);
}
