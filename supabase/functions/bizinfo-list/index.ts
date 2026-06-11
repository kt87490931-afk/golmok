import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  fetchBizinfoPrograms,
  filterAndRankPrograms,
  inferPolicyFilters,
  isBizinfoKeyConfigured,
} from "./bizinfo_lib.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "POST only" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const question = String(body.question || body.keyword || "").trim();
    const limit = Math.min(Math.max(parseInt(String(body.limit || "10"), 10) || 10, 1), 30);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: rows } = await supabase.rpc("get_ai_server_config");
    const cfg: Record<string, string> = {};
    (rows || []).forEach((r: { key: string; value: string }) => { cfg[r.key] = r.value; });

    const bizKey = cfg.BIZINFO_API_KEY;
    if (!isBizinfoKeyConfigured(bizKey)) {
      return json({
        success: false,
        error: "기업마당 API 키(BIZINFO_API_KEY)가 등록되지 않았습니다.",
      });
    }

    const filters = inferPolicyFilters(question || "소상공인 지원");
    const all = await fetchBizinfoPrograms(bizKey!, {
      searchCnt: 80,
      searchLclasId: body.searchLclasId || filters.searchLclasId,
      hashtags: body.hashtags || filters.hashtags,
    });

    const programs = filterAndRankPrograms(all, question || "소상공인 지원", limit);

    return json({
      success: true,
      programs,
      totalFetched: all.length,
      source: "bizinfo",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("bizinfo-list", msg);
    return json({ success: false, error: msg }, 502);
  }
});
