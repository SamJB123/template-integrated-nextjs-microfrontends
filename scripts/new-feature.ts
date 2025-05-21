#!/usr/bin/env ts-node
/**
 * Scaffold a new feature package from scripts/feature-template.
 * Usage: pnpm ts-node scripts/new-feature.ts <feature-name>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const [, , rawName] = process.argv;

if (!rawName) {
  console.error("Usage: pnpm ts-node scripts/new-feature.ts <feature-name>");
  process.exit(1);
}

// slug: lower-case, alphanum + dashes only
const slug = rawName
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, "-")
  .replace(/^-+|-+$/g, "");

if (!slug) {
  console.error("❌ Invalid feature name provided.");
  process.exit(1);
}

// Title-case for display strings
const title = slug
  .split("-")
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
  .join(" ");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const templateDir = path.join(__dirname, "feature-template");
const targetDir = path.join(repoRoot, "features", slug);

if (fs.existsSync(targetDir)) {
  console.error(`❌ Feature "${slug}" already exists.`);
  process.exit(1);
}

// Copy template directory recursively
fs.cpSync(templateDir, targetDir, { recursive: true });

// Replace placeholders in all copied files
function replaceTokens(dir: string) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      replaceTokens(full);
    } else {
      const content = fs.readFileSync(full, "utf8")
        .replace(/__feature_slug__/g, slug)
        .replace(/__FEATURE_SLUG__/g, slug)
        .replace(/__FEATURE_TITLE__/g, title)
        .replace(/__FEATURE_TITLE__/g, title);
      fs.writeFileSync(full, content);
    }
  }
}

replaceTokens(targetDir);

console.log(`✔ Created feature "${slug}" in features/${slug}`);
console.log("Next steps:");
console.log(` • pnpm --filter @ai-colab-platform/${slug} install`);
console.log(` • pnpm --filter @ai-colab-platform/${slug} dev`);
