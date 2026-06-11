/** 기업마당 지원사업정보 API — https://www.bizinfo.go.kr/apiDetail.do?id=bizinfoApi */
export const BIZINFO_API_URL = "https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do";

export type BizProgram = {
  id: string;
  title: string;
  url: string;
  author: string;
  excInsttNm: string;
  category: string;
  target: string;
  period: string;
  summary: string;
  hashTags: string;
};

export function stripHtml(s: string) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function isBizinfoKeyConfigured(key?: string | null) {
  if (!key) return false;
  const v = String(key).trim();
  if (!v || v.length < 4) return false;
  if (v.startsWith("YOUR_") || v.startsWith("REPLACE_") || v.startsWith("여기에")) return false;
  return true;
}

export function normalizeBizinfoItems(raw: unknown): BizProgram[] {
  const root = raw as Record<string, unknown>;
  const jsonArray = root?.jsonArray;

  let items: unknown;
  if (Array.isArray(jsonArray)) {
    items = jsonArray;
  } else if (jsonArray && typeof jsonArray === "object") {
    items = (jsonArray as Record<string, unknown>).item;
  } else {
    items = root?.item;
  }

  if (!items) return [];
  if (!Array.isArray(items)) items = [items];

  return (items as Record<string, unknown>[])
    .map((it) => ({
      id: String(it.seq ?? it.pblancId ?? ""),
      title: String(it.title ?? it.pblancNm ?? "").trim(),
      url: String(it.link ?? it.pblancUrl ?? "").trim(),
      author: String(it.author ?? it.jrsdInsttNm ?? "").trim(),
      excInsttNm: String(it.excInsttNm ?? "").trim(),
      category: String(it.lcategory ?? it.pldirSportRealmLclasCodeNm ?? "").trim(),
      target: String(it.trgetNm ?? "").trim(),
      period: String(it.reqstDt ?? it.reqstBeginEndDe ?? "").trim(),
      summary: stripHtml(String(it.description ?? it.bsnsSumryCn ?? "")),
      hashTags: String(it.hashTags ?? "").trim(),
    }))
    .filter((p) => p.title);
}

export function inferPolicyFilters(question: string) {
  const q = question;
  let searchLclasId: string | undefined;
  if (/금융|대출|융자|정책자금|보증|이자/.test(q)) searchLclasId = "01";
  else if (/기술|스마트|디지털|로봇|키오스크/.test(q)) searchLclasId = "02";
  else if (/인력|고용|일자리|알바|채용/.test(q)) searchLclasId = "03";
  else if (/수출|해외/.test(q)) searchLclasId = "04";
  else if (/창업|개업|신규\s*창업/.test(q)) searchLclasId = "06";
  else if (/경영|마케팅|홍보|컨설팅/.test(q)) searchLclasId = "07";
  else if (/폐업|재기|희망리턴/.test(q)) searchLclasId = "09";

  const regions = [
    "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
    "화성", "수원", "동탄", "오산",
  ];
  const hashtags = regions.filter((r) => q.includes(r)).slice(0, 2).join(",");
  return { searchLclasId, hashtags };
}

export function scoreProgramForQuestion(p: BizProgram, question: string) {
  let score = 0;
  const hay = `${p.title} ${p.summary} ${p.category} ${p.hashTags} ${p.author} ${p.excInsttNm} ${p.target}`.toLowerCase();
  const blob = `${p.author}${p.excInsttNm}${p.target}${p.title}${p.summary}`;

  if (/소상공인|소공인|자영업|전통시장|점포/.test(blob)) score += 6;
  if (/소상공인시장진흥공단|소진공/.test(`${p.author}${p.excInsttNm}`)) score += 5;

  const words = question.replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 2);
  for (const word of words) {
    if (hay.includes(word.toLowerCase())) score += 2;
  }

  const q = question.toLowerCase();
  if (/정책자금|대출|융자|지원금|보조금/.test(q) && /금융|융자|대출|자금|보조/.test(hay)) score += 4;
  if (/창업/.test(q) && /창업/.test(hay)) score += 3;
  if (/폐업|재기/.test(q) && /재기|폐업|희망/.test(hay)) score += 3;
  if (/교육|배움/.test(q) && /교육|컨설팅|멘토/.test(hay)) score += 2;

  return score;
}

export function filterAndRankPrograms(programs: BizProgram[], question: string, limit = 5) {
  const ranked = programs
    .map((p) => ({ p, score: scoreProgramForQuestion(p, question) }))
    .filter(({ score, p }) => {
      const blob = `${p.author}${p.excInsttNm}${p.target}${p.title}`;
      return score >= 2 || /소상공인|소공인|자영업/.test(blob);
    })
    .sort((a, b) => b.score - a.score);

  if (ranked.length) return ranked.slice(0, limit).map((r) => r.p);

  const fallback = programs.filter((p) =>
    /소상공인|소공인|자영업|전통시장/.test(`${p.author}${p.excInsttNm}${p.target}${p.title}${p.summary}`),
  );
  return (fallback.length ? fallback : programs).slice(0, limit);
}

export async function fetchBizinfoPrograms(
  crtfcKey: string,
  opts: { searchCnt?: number; searchLclasId?: string; hashtags?: string } = {},
) {
  const url = new URL(BIZINFO_API_URL);
  url.searchParams.set("crtfcKey", crtfcKey);
  url.searchParams.set("dataType", "json");
  url.searchParams.set("searchCnt", String(opts.searchCnt ?? 60));
  if (opts.searchLclasId) url.searchParams.set("searchLclasId", opts.searchLclasId);
  if (opts.hashtags) url.searchParams.set("hashtags", opts.hashtags);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; GolmokMaster/1.0)",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Bizinfo HTTP ${res.status}: ${text.slice(0, 120)}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Bizinfo JSON 파싱 실패");
  }
  return normalizeBizinfoItems(json);
}

export function formatProgramsForGemini(programs: BizProgram[]) {
  return programs.map((p, i) =>
    `[${i + 1}] ${p.title}
소관: ${p.author || "-"} | 수행: ${p.excInsttNm || "-"}
분야: ${p.category || "-"} | 대상: ${p.target || "-"}
신청기간: ${p.period || "공고 확인"}
개요: ${p.summary.slice(0, 220) || "-"}
공고URL: ${p.url}`,
  ).join("\n\n");
}
