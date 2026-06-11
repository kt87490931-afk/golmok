import { getApiKey, isApiEnabled, getApiMode, buildApiUrl } from './api-config.js';

function getMockData(endpoint) {
  const mocks = {
    weather: {
      result: 'success',
      data: {
        weatherScore: 72,
        weatherLabel: '맑음',
        weatherDesc:
          '창업하기 좋은 상권입니다. 유동인구가 증가하고 있으며 경쟁 강도가 낮아지고 있습니다.',
        monthlyRevenue: 13160000,
        revenueChange: -2.2,
        dailyPopulation: 316000,
        populationChange: 17.7,
        storeCount: 175,
        storeChange: -17.8,
        peakDay: '금요일',
        peakTime: '18~23시',
        hourlyData: [
          { time: '06', rate: 15 },
          { time: '09', rate: 35 },
          { time: '12', rate: 65 },
          { time: '15', rate: 45 },
          { time: '18', rate: 90 },
          { time: '21', rate: 75 },
          { time: '24', rate: 30 },
        ],
      },
    },
    hpReport: {
      result: 'success',
      data: {
        themeName: '음식',
        totalStore: 175,
        avgRevenue: 13160000,
        avgPopulation: 316000,
        competitionScore: 62,
        survivalRate12m: 68,
        rankInRegion: 3,
        totalInRegion: 24,
      },
    },
    storSttus: {
      result: 'success',
      totalCount: 175,
      data: [
        { storeName: '동탄 맛있는 김밥집', upjong: '음식', region: '동탄2동', openDate: '2024-03', status: '영업중' },
        { storeName: '화성 카페베네', upjong: '음식', region: '동탄1동', openDate: '2023-11', status: '영업중' },
        { storeName: '수원 순대국', upjong: '음식', region: '인계동', openDate: '2022-05', status: '영업중' },
      ],
    },
  };
  return mocks[endpoint] || null;
}

function normalizeWeatherPayload(raw) {
  const d = raw?.data || raw?.result || raw || {};
  return {
    weatherScore: d.weatherScore ?? d.wthrScr ?? d.score ?? 0,
    weatherLabel: d.weatherLabel ?? d.wthrLbl ?? d.label ?? '',
    weatherDesc: d.weatherDesc ?? d.wthrDesc ?? d.desc ?? d.description ?? '',
    monthlyRevenue: d.monthlyRevenue ?? d.mmAvrgSelngAmt ?? d.avgRevenue ?? 0,
    revenueChange: d.revenueChange ?? d.selngChange ?? 0,
    dailyPopulation: d.dailyPopulation ?? d.dayFlpopCnt ?? d.population ?? 0,
    populationChange: d.populationChange ?? d.flpopChange ?? 0,
    storeCount: d.storeCount ?? d.storCo ?? d.totalStore ?? 0,
    storeChange: d.storeChange ?? d.storChange ?? 0,
    peakDay: d.peakDay ?? d.peakDow ?? '금요일',
    peakTime: d.peakTime ?? d.peakTm ?? '18~23시',
    hourlyData: d.hourlyData ?? d.tmznFlpop ?? [],
  };
}

function normalizeThemePayload(raw) {
  const d = raw?.data || raw?.result || raw || {};
  return {
    themeName: d.themeName ?? d.thmNm ?? '',
    totalStore: d.totalStore ?? d.storCo ?? 0,
    avgRevenue: d.avgRevenue ?? d.mmAvrgSelngAmt ?? 0,
    avgPopulation: d.avgPopulation ?? d.dayFlpopCnt ?? 0,
    competitionScore: d.competitionScore ?? d.cmpetScr ?? 0,
    survivalRate12m: d.survivalRate12m ?? d.survRt ?? 0,
    rankInRegion: d.rankInRegion ?? d.rank ?? 0,
    totalInRegion: d.totalInRegion ?? d.totalRank ?? 0,
  };
}

function normalizeStorePayload(raw) {
  const list = raw?.data ?? raw?.list ?? raw?.items ?? [];
  const rows = Array.isArray(list) ? list : [];
  return {
    result: 'success',
    totalCount: raw?.totalCount ?? raw?.totCnt ?? rows.length,
    data: rows.map((s) => ({
      storeName: s.storeName ?? s.bizesNm ?? s.name ?? '-',
      upjong: s.upjong ?? s.indutyNm ?? '',
      region: s.region ?? s.adongNm ?? '',
      openDate: s.openDate ?? s.opnSvcDt ?? '',
      status: s.status ?? s.bizesSttusNm ?? '영업중',
    })),
  };
}

async function callApi(endpoint, keyName, params = {}) {
  const enabled = await isApiEnabled();
  if (!enabled) {
    console.warn('소진공 API가 비활성화 상태입니다');
    return null;
  }

  const mode = await getApiMode();
  if (mode === 'mock') {
    return getMockData(endpoint);
  }

  const certKey = await getApiKey(keyName);
  if (!certKey || certKey.startsWith('REPLACE_')) {
    console.warn(`API 키 미설정: ${keyName} — mock으로 대체`);
    return getMockData(endpoint);
  }

  const url = buildApiUrl(endpoint, { certKey, ...params, type: 'json' });

  try {
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.error(`API 오류 ${res.status}: ${endpoint}`);
      return getMockData(endpoint);
    }
    const data = await res.json();
    if (endpoint === 'weather') return { result: 'success', data: normalizeWeatherPayload(data) };
    if (endpoint === 'hpReport') return { result: 'success', data: normalizeThemePayload(data) };
    if (endpoint === 'storSttus') return normalizeStorePayload(data);
    return data;
  } catch (err) {
    console.error(`API 호출 실패 (${endpoint}, CORS 가능):`, err);
    return getMockData(endpoint);
  }
}

export async function getWeatherForecast({ regionCode, upjongCode }) {
  return callApi('weather', 'SOJANGGONG_WEATHER_KEY', { regionCode, upjongCode });
}

export async function getThemeAnalysis({ regionCode, radius = 500, upjongCode }) {
  return callApi('hpReport', 'SOJANGGONG_HPREPORT_KEY', { regionCode, radius, upjongCode });
}

export async function getStartupMapUrl({ lat, lng, radius = 500 }) {
  const enabled = await isApiEnabled();
  if (!enabled) return null;

  const mode = await getApiMode();
  if (mode === 'mock') return null;

  const certKey = await getApiKey('SOJANGGONG_STARTUP_KEY');
  if (!certKey || certKey.startsWith('REPLACE_')) return null;

  return buildApiUrl('startupPublic', { certKey, lat, lng, radius });
}

export async function getStoreStatus({ regionCode, upjongCode, pageIndex = 1, pageSize = 20 }) {
  return callApi('storSttus', 'SOJANGGONG_STORSTTUS_KEY', {
    regionCode,
    upjongCode,
    pageIndex,
    pageSize,
  });
}

/** 연결 테스트 — JSON 응답 샘플 (CORS 시 iframe으로 확인) */
export async function probeOpenApi(endpoint, keyName, extraParams = {}) {
  const enabled = await isApiEnabled();
  if (!enabled) return { ok: false, error: '소진공 API가 비활성 상태입니다' };

  const mode = await getApiMode();
  if (mode === 'mock') {
    return { ok: true, mode: 'mock', json: getMockData(endpoint), note: '데이터 모드가 mock입니다. 어드민에서 real로 전환하세요.' };
  }

  const certKey = await getApiKey(keyName);
  if (!certKey || certKey.startsWith('REPLACE_') || certKey.startsWith('YOUR_')) {
    return { ok: false, error: `API 키 미설정: ${keyName}` };
  }

  const url = buildApiUrl(endpoint, { certKey, type: 'json', ...extraParams });
  try {
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      ok: res.ok,
      status: res.status,
      url,
      json,
      rawPreview: json ? undefined : text.slice(0, 1500),
      keys: json && typeof json === 'object' ? Object.keys(json.data || json.result || json).slice(0, 20) : [],
    };
  } catch (err) {
    return {
      ok: false,
      error: err.message,
      url,
      hint: '브라우저 CORS 차단 가능 — 위 iframe 화면으로 데이터를 확인하세요.',
    };
  }
}

export { getApiMode };
