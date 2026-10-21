import { existsSync } from "node:fs";
import { resolve } from "node:path";

function applyEnvFile(path: string) {
  if (!existsSync(path)) return;
  const text = require("node:fs").readFileSync(path, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

applyEnvFile(resolve(process.cwd(), ".env"));
applyEnvFile(resolve(process.cwd(), "../.env"));
applyEnvFile(resolve(__dirname, "../.env"));
applyEnvFile(resolve(__dirname, "../../.env"));
