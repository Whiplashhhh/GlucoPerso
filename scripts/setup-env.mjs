#!/usr/bin/env node
// Creates `.env` from `.env.example` on first run and fills any empty secret
// with a strong random value. Safe to run repeatedly: existing values are kept.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SECRET_KEYS = ["BETTER_AUTH_SECRET"];
const target = process.argv[2] ?? ".env";

let content = existsSync(target)
  ? readFileSync(target, "utf8")
  : readFileSync(".env.example", "utf8");
let generated = 0;

for (const key of SECRET_KEYS) {
  const pattern = new RegExp(`^${key}=(?:""|'')?\\s*$`, "m");
  const secret = randomBytes(48).toString("base64url");
  if (pattern.test(content)) {
    content = content.replace(pattern, `${key}="${secret}"`);
    generated += 1;
  } else if (!new RegExp(`^${key}=`, "m").test(content)) {
    content += `\n${key}="${secret}"\n`;
    generated += 1;
  }
}

writeFileSync(target, content, { mode: 0o600 });
console.info(`${target} ready (${generated} secret(s) generated).`);
