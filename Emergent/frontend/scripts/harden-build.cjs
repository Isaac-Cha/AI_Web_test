// Apply CSP to the static production document, independently of the web server.
// Keep the development server (HMR / visual editing) unchanged.
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const dotenv = require("dotenv");

function buildPolicy(html, backendUrl = "") {
  const scripts = new Set(["'self'"]);
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const src = match[1].match(/\bsrc=["']([^"']+)["']/i);
    if (src && /^(?:https?:)?\/\//i.test(src[1])) {
      const origin = new URL(src[1], "https://localhost").origin;
      scripts.add(origin);
    } else if (!src && match[2].trim()) {
      scripts.add(`'sha256-${createHash("sha256").update(match[2]).digest("base64")}'`);
    }
  }
  const connections = new Set(["'self'"]);
  if (backendUrl && !["undefined", "null"].includes(backendUrl)) {
    const backend = new URL(backendUrl);
    if (!["https:", "http:"].includes(backend.protocol) || backend.username || backend.password) {
      throw new Error("REACT_APP_BACKEND_URL must be an HTTP(S) URL without credentials");
    }
    connections.add(backend.origin);
  }
  return [
    "default-src 'self'",
    `script-src ${[...scripts].join(" ")}`,
    "script-src-attr 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' https: data: blob:",
    `connect-src ${[...connections].join(" ")}`,
  ].join("; ");
}

function hardenBuild() {
  const root = path.resolve(__dirname, "..");
  // Match CRA's production dotenv priority, without overriding the process env.
  for (const file of [".env.production.local", ".env.local", ".env.production", ".env"]) {
    const envPath = path.join(root, file);
    if (fs.existsSync(envPath)) {
      const expand = require("dotenv-expand");
      (expand.expand || expand)(dotenv.config({ path: envPath }));
    }
  }
  const index = path.join(root, "build", "index.html");
  let html = fs.readFileSync(index, "utf8");
  html = html.replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
  const policy = buildPolicy(html, (process.env.REACT_APP_BACKEND_URL || "").trim());
  const charset = /<meta\s+charset=["']utf-8["']\s*\/?>/i;
  if (!charset.test(html)) throw new Error("Cannot find charset for CSP insertion");
  html = html.replace(charset, (tag) => `${tag}<meta http-equiv="Content-Security-Policy" content="${policy}">`);
  fs.writeFileSync(index, html);
  console.log("Production CSP applied: external probe scripts and inline handlers blocked.");
}

if (require.main === module) hardenBuild();
module.exports = { buildPolicy };
