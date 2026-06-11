#!/usr/bin/env node
/**
 * ai-ask Edge Function 배포 (Supabase CLI)
 * 사용: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/deploy-ai-ask-edge.mjs
 * 또는: npx supabase login 후 node scripts/deploy-ai-ask-edge.mjs
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectRef = "xmjyeethpuljiyixkiwd";

const result = spawnSync(
  "npx",
  [
    "supabase",
    "functions",
    "deploy",
    "ai-ask",
    "--no-verify-jwt",
    "--project-ref",
    projectRef,
  ],
  {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env,
  },
);

process.exit(result.status ?? 1);
