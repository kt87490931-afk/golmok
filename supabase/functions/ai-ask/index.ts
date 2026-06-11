import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SOJANGGONG_BASE = "https://bigdata.sbiz.or.kr/openApi";

const REGION_CODES: Record<string, string> = {
  동탄: "4159025",
  동탄1동: "4159025100",
  동탄2동: "4159025300",
  동탄3동: "4159025600",
  수원: "4111000",
  인계동: "4111179",
  화성: "4159000",
  봉담: "4159025800",
  봉담읍: "4159025800",
  오산: "4137000",
  서울: "1100000",
  중구: "1114000",
  소공동: "1114052",
  명동: "1114065",
};

const UPJONG_CODES: Record<string, string> = {
  음식: "I2",
  치킨: "I2",
  카페: "I2",
  커피: "I2",
  소매: "G2",
  편의점: "G2",
};

const INTENT_PROMPT = `당신은 소상공인 상권 질문 분류기입니다.
사용자 질문에서 아래 정보를 추출하세요.
- region: 행정동 이름 (없으면 null)
- upjong: 업종 키워드 (없으면 null)
- requestType: "매출"|"유동인구"|"업소수"|"배달"|"창업기상도"|"경쟁분석"|"통계"|"기타"
- isRelevant: 상권/창업/소상공인 관련 여부 (true/false)
- needMoreInfo: 지역이 없어 추가 정보 필요 여부 (true/false)
반드시 JSON만 반환하세요.`;

const ANSWER_PROMPT = `당신은 골목대장 소상공인 AI 어시스턴트입니다.
아래 [소진공 API 데이터]만 근거로 답변하세요.
규칙:
1. 제공된 데이터 외 정보를 추가하지 마세요
2. 데이터가 없으면 "해당 데이터를 찾을 수 없습니다"라고 하세요
3. 친근하고 실용적으로 (대장님이라고 부르기)
4. 3~4문장 이내
JSON만 반환: {"answer":"...","summary":"...","suggestions":["q1","q2","q3","q4"]}`;

const TAB_EXAMPLES: Record<string, string[]> = {
  market: [
    "동탄2동 카페 매출이 궁금해",
    "수원 인계동 치킨집 경쟁 현황",
    "화성 봉담읍 음식점 유동인구",
    "동탄에서 창업기상도 어때?",
  ],
  stats: [
    "동탄 상권 매출 통계 보여줘",
    "수원시 카페 업소 수",
    "화성시 음식점 창업기상도",
    "동탄2동 테마상권 분석",
  ],
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

let _regionMapCache: { map: Record<string, string>; at: number } | null = null;
const REGION_CACHE_MS = 5 * 60 * 1000;

async function loadRegionMap(supabase: ReturnType<typeof createClient>) {
  if (_regionMapCache && Date.now() - _regionMapCache.at < REGION_CACHE_MS) {
    return _regionMapCache.map;
  }
  const map: Record<string, string> = { ...REGION_CODES };
  try {
    const { data } = await supabase.rpc("get_region_code_lookup");
    for (const row of data || []) {
      if (row.name) map[row.name] = row.code;
      if (row.aliases) {
        String(row.aliases).split(",").forEach((a) => {
          const alias = a.trim();
          if (alias) map[alias] = row.code;
        });
      }
    }
  } catch (e) {
    console.warn("region_codes lookup fallback", e);
  }
  _regionMapCache = { map, at: Date.now() };
  return map;
}

function resolveRegionCode(name: string | null | undefined, regionMap: Record<string, string>) {
  if (!name) return null;
  const t = String(name).trim();
  if (/^\d{7,10}$/.test(t)) return t;
  if (regionMap[t]) return regionMap[t];
  const hit = Object.keys(regionMap)
    .sort((a, b) => b.length - a.length)
    .find((k) => t.includes(k));
  return hit ? regionMap[hit] : null;
}

function resolveUpjongCode(name?: string | null) {
  if (!name) return "I2";
  const t = String(name).trim();
  if (UPJONG_CODES[t]) return UPJONG_CODES[t];
  const hit = Object.keys(UPJONG_CODES).find((k) => t.includes(k));
  return hit ? UPJONG_CODES[hit] : "I2";
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userText: string,
  maxTokens: number,
) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini 오류 ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseGeminiJson(raw);
}

function parseGeminiJson(raw: string) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const obj = JSON.parse(cleaned);
    if (obj && typeof obj.answer === "string") return obj;
    if (typeof obj === "string") return { answer: obj };
    return obj;
  } catch {
    const m = cleaned.match(/"answer"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (m) {
      try {
        return { answer: JSON.parse(`"${m[1]}"`) };
      } catch {
        return { answer: m[1] };
      }
    }
    return { answer: cleaned || raw };
  }
}

function normalizeMetrics(raw: Record<string, unknown>, region?: string, upjong?: string) {
  const d = (raw?.data || raw?.result || raw) as Record<string, unknown>;
  return {
    region: region || String(d.region ?? d.adongNm ?? ""),
    upjong: upjong || String(d.upjong ?? d.indutyNm ?? ""),
    dailyPopulation: numOrNull(d.dailyPopulation ?? d.dayFlpopCnt ?? d.population ?? d.avgPopulation),
    populationChange: numOrNull(d.populationChange ?? d.flpopChange),
    monthlyRevenue: numOrNull(d.monthlyRevenue ?? d.mmAvrgSelngAmt ?? d.avgRevenue),
    revenueChange: numOrNull(d.revenueChange ?? d.selngChange),
    storeCount: numOrNull(d.storeCount ?? d.storCo ?? d.totalStore ?? d.totalCount ?? d.totCnt),
    storeChange: numOrNull(d.storeChange ?? d.storChange),
    weatherScore: numOrNull(d.weatherScore ?? d.wthrScr ?? d.score),
    weatherLabel: String(d.weatherLabel ?? d.wthrLbl ?? d.label ?? ""),
    peakDay: String(d.peakDay ?? d.peakDow ?? ""),
    peakTime: String(d.peakTime ?? d.peakTm ?? ""),
    survivalRate12m: numOrNull(d.survivalRate12m ?? d.survRt),
    competitionScore: numOrNull(d.competitionScore ?? d.cmpetScr),
  };
}

const MOCK_PAYLOADS: Record<string, Record<string, unknown>> = {
  weather: {
    dailyPopulation: 316000,
    populationChange: 17.7,
    monthlyRevenue: 13160000,
    revenueChange: -2.2,
    storeCount: 175,
    storeChange: -17.8,
    weatherScore: 72,
    weatherLabel: "맑음",
    peakDay: "금요일",
    peakTime: "18~23시",
  },
  hpReport: {
    totalStore: 175,
    avgRevenue: 13160000,
    avgPopulation: 316000,
    competitionScore: 62,
    survivalRate12m: 68,
    rankInRegion: 3,
    totalInRegion: 24,
  },
  storSttus: { storeCount: 175, totalCount: 175 },
};

function buildMockResult(
  endpoint: string,
  regionLabel: string,
  upjongLabel: string,
  mockFallback: boolean,
) {
  const payload = MOCK_PAYLOADS[endpoint] || MOCK_PAYLOADS.weather;
  return {
    mock: true,
    mockFallback,
    data: normalizeMetrics({ data: payload }, regionLabel, upjongLabel),
    endpoint,
  };
}

function numOrNull(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : v == null ? null : n;
}

async function fetchSojanggong(
  cfg: Record<string, string>,
  endpoint: string,
  keyName: string,
  params: Record<string, string>,
  regionLabel: string,
  upjongLabel: string,
) {
  if (cfg.SOJANGGONG_API_ENABLED !== "true") {
    return { error: "API_DISABLED" as const };
  }

  const mode = cfg.SOJANGGONG_API_MODE || "mock";
  if (mode === "mock") {
    return buildMockResult(endpoint, regionLabel, upjongLabel, false);
  }

  const certKey = cfg[keyName];
  if (!certKey || certKey.startsWith("YOUR_") || certKey.startsWith("REPLACE_")) {
    console.warn(`Sojanggong key missing: ${keyName}, using mock`);
    return buildMockResult(endpoint, regionLabel, upjongLabel, true);
  }

  const url = new URL(`${SOJANGGONG_BASE}/${endpoint}`);
  url.searchParams.set("certKey", certKey);
  url.searchParams.set("type", "json");
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        Referer: "https://bigdata.sbiz.or.kr/",
        "User-Agent": "Mozilla/5.0 (compatible; GolmokMaster/1.0)",
      },
    });
    const text = await res.text();
    if (!res.ok || text.trim().startsWith("<")) {
      console.warn(`Sojanggong ${endpoint} HTTP ${res.status}, mock fallback`);
      return buildMockResult(endpoint, regionLabel, upjongLabel, true);
    }
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      return buildMockResult(endpoint, regionLabel, upjongLabel, true);
    }
    if (json.result === "fail" || json.error || json.errMsg) {
      return buildMockResult(endpoint, regionLabel, upjongLabel, true);
    }
    return {
      mock: false,
      mockFallback: false,
      data: normalizeMetrics(json, regionLabel, upjongLabel),
      endpoint,
    };
  } catch (e) {
    console.warn(`Sojanggong ${endpoint} fetch error`, e);
    return buildMockResult(endpoint, regionLabel, upjongLabel, true);
  }
}

function pickEndpoint(requestType: string) {
  const t = String(requestType || "매출");
  if (t === "창업기상도" || t === "유동인구" || t === "매출") {
    return {
      endpoint: "weather",
      key: "SOJANGGONG_WEATHER_KEY",
      extraParams: {} as Record<string, string>,
    };
  }
  if (t === "통계" || t === "경쟁분석") {
    return {
      endpoint: "hpReport",
      key: "SOJANGGONG_HPREPORT_KEY",
      extraParams: { radius: "500" },
    };
  }
  if (t === "업소수") {
    return {
      endpoint: "storSttus",
      key: "SOJANGGONG_STORSTTUS_KEY",
      extraParams: { pageIndex: "1", pageSize: "20" },
    };
  }
  if (t === "배달") {
    return {
      endpoint: "delivery",
      key: "SOJANGGONG_DELIVERY_KEY",
      extraParams: {},
    };
  }
  return {
    endpoint: "weather",
    key: "SOJANGGONG_WEATHER_KEY",
    extraParams: {},
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "POST only" }, 405);
  }

  try {
    const body = await req.json();
    const question = String(body.question || "").trim();
    const tab = String(body.tab || "market");
    const sessionId = String(body.sessionId || "").trim();
    const regionHint = body.regionHint ? String(body.regionHint) : null;

    if (!question) return jsonResponse({ success: false, error: "질문을 입력해주세요" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    let userId: string | null = null;
    if (jwt) {
      const { data: userData } = await supabase.auth.getUser(jwt);
      userId = userData?.user?.id ?? null;
    }

    const { data: settingsRows, error: settingsErr } = await supabase.rpc("get_ai_server_config");
    if (settingsErr) {
      console.error("get_ai_server_config", settingsErr);
    }

    const cfg: Record<string, string> = {};
    (settingsRows || []).forEach((r: { key: string; value: string }) => {
      cfg[r.key] = r.value;
    });

    if (cfg.GEMINI_ENABLED !== "true") {
      return jsonResponse({ success: false, error: "AI 서비스가 일시적으로 중단되었습니다" });
    }

    const apiKey = cfg.GEMINI_API_KEY;
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
      return jsonResponse({ success: false, error: "AI 서비스 준비 중입니다 (API 키 등록 필요)" });
    }

    const dailyLimit = parseInt(cfg.GEMINI_DAILY_LIMIT || "10", 10);
    const { data: limitOk } = await supabase.rpc("check_ai_daily_limit", {
      p_user_id: userId,
      p_session_id: sessionId,
      p_limit: dailyLimit,
    });

    if (!limitOk) {
      return jsonResponse({
        success: false,
        limitExceeded: true,
        error: `오늘 AI 질문 횟수(${dailyLimit}회)를 모두 사용했습니다. 내일 다시 이용해주세요!`,
      });
    }

    if (tab === "policy") {
      await supabase.from("ai_logs").insert({
        user_id: userId,
        session_id: sessionId,
        question: question.slice(0, 500),
        intent: "정책차단",
        blocked: true,
      });
      return jsonResponse({
        success: true,
        blocked: true,
        answer:
          "정책·지원 정보는 현재 소진공 상권 Open API 범위에 포함되지 않아 답변드릴 수 없어요. 상권정보·통계정보 탭에서 지역과 업종을 알려주시면 소진공 데이터로 분석해드릴게요!",
        suggestions: TAB_EXAMPLES.market,
      });
    }

    const model = cfg.GEMINI_MODEL || "gemini-2.5-flash";
    const maxTokens = parseInt(cfg.GEMINI_MAX_TOKENS || "300", 10);
    const regionMap = await loadRegionMap(supabase);
    const intent = await callGemini(apiKey, model, INTENT_PROMPT, question, 256);

    const looksMarketRelated = /상권|매출|유동|업소|창업|소상공인|음식|카페|치킨|편의점|분석|통계|동탄|수원|화성/i.test(question);
    if (intent.isRelevant === false && !looksMarketRelated) {
      await supabase.from("ai_logs").insert({
        user_id: userId,
        session_id: sessionId,
        question: question.slice(0, 500),
        intent: "차단",
        blocked: true,
      });
      return jsonResponse({
        success: true,
        blocked: true,
        answer:
          "지금 입력하신 질문은 상권분석과 직접적인 관련이 없어 답변 드리기 어려워요. 저는 소진공 빅데이터 기반의 상권 정보만 제공하고 있어요!",
        suggestions: TAB_EXAMPLES[tab] || TAB_EXAMPLES.market,
      });
    }

    let regionName = intent.region || null;
    if (!regionName && regionHint) regionName = regionHint;
    if (!regionName) {
      const hit = Object.keys(regionMap)
        .sort((a, b) => b.length - a.length)
        .find((k) => question.includes(k));
      if (hit) regionName = hit;
    }

    const regionCode = resolveRegionCode(regionName, regionMap);
    if (!regionCode) {
      return jsonResponse({
        success: true,
        needMoreInfo: true,
        answer:
          '지역(행정동)을 함께 알려주시면 더 정확하게 분석해드릴 수 있어요! 예) "동탄2동 카페", "수원 인계동 치킨"처럼 지역을 포함해서 질문해주세요 📍',
        suggestions: TAB_EXAMPLES[tab] || TAB_EXAMPLES.market,
      });
    }

    const upjongLabel = intent.upjong || "음식";
    const upjongCode = resolveUpjongCode(upjongLabel);
    const { endpoint, key, extraParams } = pickEndpoint(String(intent.requestType || "매출"));

    const apiResult = await fetchSojanggong(
      cfg,
      endpoint,
      key,
      { regionCode, upjongCode, ...extraParams },
      regionName || "",
      upjongLabel,
    );

    if ("error" in apiResult && apiResult.error === "API_DISABLED") {
      return jsonResponse({ success: false, error: "소진공 API가 비활성화되어 있습니다." });
    }

    const apiData = apiResult.data;
    const dataSource = apiResult.mockFallback ? "mock_fallback" : apiResult.mock ? "mock" : "api";
    const fallbackNote = apiResult.mockFallback
      ? "\n(참고: 서버에서 실시간 API 호출이 제한되어 샘플 데이터로 답변합니다. 상권분석 탭 iframe에서 실데이터를 확인하세요.)"
      : "";
    const dataContext = `[소진공 API 데이터]
지역: ${regionName}
업종: ${upjongLabel}
요청: ${intent.requestType || "매출"}
endpoint: ${apiResult.endpoint}
데이터: ${JSON.stringify(apiData)}${fallbackNote}
위 데이터만 보고 답변하세요.`;

    const result = await callGemini(
      apiKey,
      model,
      ANSWER_PROMPT,
      `질문: ${question}\n\n${dataContext}`,
      maxTokens,
    );

    await supabase.from("ai_logs").insert({
      user_id: userId,
      session_id: sessionId,
      question: question.slice(0, 500),
      answer: String(result.answer || "").slice(0, 1000),
      intent: String(intent.requestType || "기타"),
      api_called: apiResult.endpoint,
      blocked: false,
    });

    return jsonResponse({
      success: true,
      blocked: false,
      answer: result.answer || "답변을 생성하지 못했습니다",
      summary: result.summary || "",
      suggestions: Array.isArray(result.suggestions) && result.suggestions.length
        ? result.suggestions
        : (TAB_EXAMPLES[tab] || TAB_EXAMPLES.market),
      apiData,
      intent: { region: regionName, upjong: upjongLabel, requestType: intent.requestType },
      dataSource,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ai-ask", msg);
    if (/Gemini|API key|API_KEY|401|403|400/i.test(msg)) {
      return jsonResponse({
        success: false,
        error: "Gemini API 호출에 실패했습니다. Google AI Studio에서 발급한 API 키(AIzaSy...)인지 확인해주세요.",
      }, 502);
    }
    return jsonResponse({ success: false, error: "잠시 후 다시 시도해주세요" }, 500);
  }
});
