#!/usr/bin/env node
/**
 * MCP 클라이언트로 ai-ask Edge Function 배포
 * 사용: set SUPABASE_ACCESS_TOKEN=sbp_xxx && node scripts/deploy-ai-ask-via-mcp.mjs
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN 환경변수가 필요합니다.");
  console.error("Supabase Dashboard > Account > Access Tokens 에서 발급하세요.");
  process.exit(1);
}

const args = JSON.parse(
  fs.readFileSync(path.join(root, "_deploy_invoke_args.json"), "utf8"),
);

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const transport = new StdioClientTransport({
  command: npx,
  args: [
    "-y",
    "@supabase/mcp-server-supabase@latest",
    "--access-token",
    token,
    "--project-ref",
    "xmjyeethpuljiyixkiwd",
  ],
});

const client = new Client({ name: "deploy-ai-ask", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport);

try {
  const result = await client.callTool({
    name: "deploy_edge_function",
    arguments: args,
  });
  console.log(JSON.stringify(result, null, 2));
  const text = result.content?.map((c) => c.text).join("") || "";
  if (/PLACEHOLDER/i.test(text)) {
    console.error("경고: PLACEHOLDER 코드가 감지되었습니다.");
    process.exit(2);
  }
} finally {
  await client.close();
}
