const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { buildPolicy } = require("./harden-build.cjs");

test("CSP permits bundled JS and exact structured data, blocks probe sources and handlers", () => {
  const json = '{"@type":"FinancialService"}';
  const policy = buildPolicy(`<script type="application/ld+json">${json}</script><script defer src="/static/js/main.js"></script>`);
  assert.ok(policy.includes(`'sha256-${createHash("sha256").update(json).digest("base64")}'`));
  assert.ok(policy.includes("script-src 'self'"));
  assert.ok(policy.includes("script-src-attr 'none'"));
  assert.ok(policy.includes("object-src 'none'"));
  assert.ok(policy.includes("base-uri 'none'"));
  const scripts = policy.split(";").find((p) => p.trim().startsWith("script-src "));
  assert.ok(!scripts.includes("'unsafe-inline'") && !scripts.includes("'unsafe-eval'") && !scripts.includes("https:"));
});

test("only the configured API origin is added to connect-src", () => {
  assert.ok(buildPolicy("", "https://api.example.com/path").includes("connect-src 'self' https://api.example.com"));
  assert.ok(buildPolicy("").includes("connect-src 'self'"));
  assert.throws(() => buildPolicy("", "javascript:alert(1)"));
  assert.throws(() => buildPolicy("", "https://user:pass@api.example.com"));
});
