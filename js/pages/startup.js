import { getWeatherForecast } from '../sojanggong-api.js?v=20260629';
import { initPageShell, bootPage } from '../page_common.js';
import { getCurrentUser, getUserProfile } from '../community.js?v=20260624';

const UPJONG_NAMES = {
  I2: '음식',
  G2: '소매',
  S2: '수리·개인',
  R1: '예술·스포츠',
  P1: '교육',
  L1: '부동산',
  I1: '숙박',
  M1: '과학·기술',
  Q1: '보건의료',
  N1: '시설관리·임대',
};

const WEATHER_CONFIG = {
  sunny: { icon: '☀️', label: '맑음', min: 80, color: '#F5A623' },
  cloudy: { icon: '⛅', label: '구름많음', min: 60, color: '#378ADD' },
  rainy: { icon: '🌧️', label: '흐림', min: 40, color: '#6C757D' },
  thunder: { icon: '⛈️', label: '주의', min: 0, color: '#E24B4A' },
};

function toast(msg) {
  if (typeof window.showToast === 'function') window.showToast(msg);
  else alert(msg);
}

function getWeatherConfig(score) {
  if (score >= 80) return WEATHER_CONFIG.sunny;
  if (score >= 60) return WEATHER_CONFIG.cloudy;
  if (score >= 40) return WEATHER_CONFIG.rainy;
  return WEATHER_CONFIG.thunder;
}

function renderResult(data, upjong, region) {
  const wc = getWeatherConfig(data.weatherScore || 0);

  document.getElementById('weather-icon').textContent = wc.icon;
  const labelEl = document.getElementById('weather-label');
  if (labelEl) {
    labelEl.textContent = data.weatherLabel || wc.label;
    labelEl.style.color = wc.color;
  }
  const scoreEl = document.getElementById('weather-score');
  if (scoreEl) {
    scoreEl.textContent = data.weatherScore ?? '-';
    scoreEl.style.color = wc.color;
  }
  const descEl = document.getElementById('weather-desc');
  if (descEl) descEl.textContent = data.weatherDesc || '';

  const condEl = document.getElementById('analysis-condition-text');
  if (condEl) condEl.textContent = `${region} · ${UPJONG_NAMES[upjong] || upjong} 기준 분석`;

  const pop = ((data.dailyPopulation || 0) / 10000).toFixed(1);
  const popEl = document.getElementById('stat-population');
  if (popEl) popEl.textContent = `${pop}만명`;
  const popChange = data.populationChange ?? 0;
  const popChgEl = document.getElementById('stat-pop-change');
  if (popChgEl) {
    popChgEl.innerHTML = `<span style="color:${popChange >= 0 ? '#1D9E75' : '#E24B4A'}">${popChange >= 0 ? '▲' : '▼'} 전월 대비 ${Math.abs(popChange)}%</span>`;
  }

  const rev = Math.round((data.monthlyRevenue || 0) / 10000);
  const revEl = document.getElementById('stat-revenue');
  if (revEl) revEl.textContent = `${rev}만원`;
  const revChange = data.revenueChange ?? 0;
  const revChgEl = document.getElementById('stat-rev-change');
  if (revChgEl) {
    revChgEl.innerHTML = `<span style="color:${revChange >= 0 ? '#1D9E75' : '#E24B4A'}">${revChange >= 0 ? '▲' : '▼'} 전년 대비 ${Math.abs(revChange)}%</span>`;
  }

  const storesEl = document.getElementById('stat-stores');
  if (storesEl) storesEl.textContent = `${data.storeCount ?? 0}개`;
  const storeChange = data.storeChange ?? 0;
  const storeChgEl = document.getElementById('stat-store-change');
  if (storeChgEl) {
    storeChgEl.innerHTML = `<span style="color:${storeChange >= 0 ? '#E24B4A' : '#1D9E75'}">${storeChange >= 0 ? '▲' : '▼'} 전년 대비 ${Math.abs(storeChange)}%</span>`;
  }

  const bars = document.getElementById('hourly-bars');
  if (bars && data.hourlyData?.length) {
    const maxRate = Math.max(...data.hourlyData.map((h) => h.rate || 0), 1);
    bars.innerHTML = data.hourlyData
      .map(
        (h) => `
      <div class="hourly-bar-wrap">
        <div class="hourly-bar" style="height:${((h.rate || 0) / maxRate) * 70}px;background:${h.rate === maxRate ? '#E24B4A' : '#F5A623'};"></div>
        <div class="hourly-bar-label">${h.time}</div>
      </div>`
      )
      .join('');
  }

  const peakEl = document.getElementById('peak-info');
  if (peakEl) peakEl.textContent = `📍 피크타임: ${data.peakDay || '-'} ${data.peakTime || ''}`;

  const aiEl = document.getElementById('ai-analysis-text');
  if (aiEl) {
    aiEl.textContent =
      `${region} ${UPJONG_NAMES[upjong] || upjong} 업종은 ` +
      `${revChange < 0 ? '매출이 감소하고' : '매출이 증가하고'} 있어요. ` +
      `피크타임은 ${data.peakDay || '-'} ${data.peakTime || ''}이에요. ` +
      `업소수가 ${storeChange < 0 ? '줄어들어' : '늘어나고 있어'} ` +
      `${storeChange < 0 ? '경쟁이 낮아진 상황입니다.' : '경쟁이 치열해지고 있습니다.'}`;
  }

  const resultEl = document.getElementById('startup-result');
  if (resultEl) resultEl.style.display = 'block';
  resultEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function searchStartup() {
  const upjong = document.getElementById('startup-upjong')?.value;
  const region = document.getElementById('startup-region')?.value?.trim();

  if (!upjong) {
    toast('업종을 선택해주세요');
    return;
  }
  if (!region) {
    toast('지역을 입력해주세요');
    return;
  }

  const loadingEl = document.getElementById('startup-loading');
  const resultEl = document.getElementById('startup-result');
  if (loadingEl) loadingEl.style.display = 'block';
  if (resultEl) resultEl.style.display = 'none';
  const btn = document.getElementById('btn-startup-search');
  if (btn) btn.disabled = true;

  try {
    const result = await getWeatherForecast({ regionCode: region, upjongCode: upjong });
    if (!result?.data) throw new Error('데이터 없음');
    renderResult(result.data, upjong, region);
  } catch (err) {
    console.error('창업기상도 오류:', err);
    toast('분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
    if (btn) btn.disabled = false;
  }
}

function resetSearch() {
  const resultEl = document.getElementById('startup-result');
  if (resultEl) resultEl.style.display = 'none';
  const upjongEl = document.getElementById('startup-upjong');
  const regionEl = document.getElementById('startup-region');
  if (upjongEl) upjongEl.value = '';
  if (regionEl) regionEl.value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function prefillFromProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const profile = await getUserProfile(user.id);
    const regionEl = document.getElementById('startup-region');
    const upjongEl = document.getElementById('startup-upjong');
    if (regionEl && profile?.region_full) regionEl.value = profile.region_full;
    if (upjongEl && profile?.upjong1cd) upjongEl.value = profile.upjong1cd;
  } catch (e) {
    console.warn('prefillFromProfile', e);
  }
}

bootPage(() => {
  initPageShell('weather');
  document.getElementById('btn-startup-search')?.addEventListener('click', searchStartup);
  document.getElementById('btn-startup-reset')?.addEventListener('click', resetSearch);
  prefillFromProfile();
  window.searchStartup = searchStartup;
  window.resetSearch = resetSearch;
});
