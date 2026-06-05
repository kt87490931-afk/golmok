const UPJONG_OPTIONS = [
  { cd: 'I2', nm: '음식' },
  { cd: 'G2', nm: '소매' },
  { cd: 'S2', nm: '수리·개인' },
  { cd: 'R1', nm: '예술·스포츠' },
  { cd: 'P1', nm: '교육' },
  { cd: 'L1', nm: '부동산' },
];

let condition = {
  queryText: null,
  upjong1cd: null,
  upjong1nm: null,
  regionFull: null,
  radius: 1000,
};

let analysisStep = 0;

function toast(msg) {
  if (typeof window.showToast === 'function') window.showToast(msg);
}

function getMockAnalysisData() {
  const seed = (condition.upjong1cd || 'I2').charCodeAt(0);
  return {
    dailyPopulation: 280000 + (seed % 80) * 1000,
    populationChangeRate: 17.7,
    monthlyRevenue: 13160000,
    revenueChangeRate: -2.2,
    storeCount: 175,
    closureRate: 17.8,
    peakDay: '금요일',
    peakTime: '18~23시',
    weekdayRatio: 62,
    weekendRatio: 38,
    hourlyData: [
      { time: '06', rate: 12 },
      { time: '09', rate: 28 },
      { time: '12', rate: 45 },
      { time: '15', rate: 38 },
      { time: '18', rate: 72 },
      { time: '21', rate: 95 },
      { time: '24', rate: 40 },
    ],
  };
}

function renderAnalysisResult(data) {
  const condEl = document.getElementById('analysis-condition');
  if (condEl) {
    condEl.textContent = `${condition.regionFull || '동탄'} · ${condition.upjong1nm || '음식'} · 반경 ${(condition.radius || 1000) / 1000}km`;
  }

  const pop = document.getElementById('stat-population');
  const popChg = document.getElementById('stat-population-change');
  if (pop) pop.textContent = `${(data.dailyPopulation / 10000).toFixed(1)}만명`;
  if (popChg) {
    popChg.innerHTML = `<span style="color:${data.populationChangeRate >= 0 ? '#1D9E75' : '#E24B4A'}">${data.populationChangeRate >= 0 ? '▲' : '▼'} 전월 대비 ${Math.abs(data.populationChangeRate)}%</span>`;
  }

  const rev = document.getElementById('stat-revenue');
  const revChg = document.getElementById('stat-revenue-change');
  if (rev) rev.textContent = `${Math.round(data.monthlyRevenue / 10000)}만원`;
  if (revChg) {
    revChg.innerHTML = `<span style="color:${data.revenueChangeRate >= 0 ? '#1D9E75' : '#E24B4A'}">${data.revenueChangeRate >= 0 ? '▲' : '▼'} 전년 대비 ${Math.abs(data.revenueChangeRate)}%</span>`;
  }

  const stores = document.getElementById('stat-stores');
  const storesChg = document.getElementById('stat-stores-change');
  if (stores) stores.textContent = `${data.storeCount}개`;
  if (storesChg) {
    storesChg.innerHTML = `<span style="color:#E24B4A;">▼ 전년 대비 ${Math.abs(data.closureRate)}%</span>`;
  }

  const chartEl = document.getElementById('hourly-chart');
  if (chartEl) {
    const maxRate = Math.max(...data.hourlyData.map((h) => h.rate));
    chartEl.innerHTML = data.hourlyData
      .map(
        (h) => `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
        <div style="width:100%;background:#F5A623;border-radius:3px 3px 0 0;height:${(h.rate / maxRate) * 70}px;"></div>
        <div style="font-size:9px;color:#999;">${h.time}</div>
      </div>`
      )
      .join('');
  }

  const peak = document.getElementById('peak-info');
  if (peak) {
    peak.textContent = `📍 피크타임: ${data.peakDay} ${data.peakTime} · 주중 ${data.weekdayRatio}% / 주말 ${data.weekendRatio}%`;
  }

  const ai = document.getElementById('ai-comment');
  if (ai) {
    ai.textContent = `이 상권 ${condition.upjong1nm || '음식'} 업종은 전년 대비 매출이 ${data.revenueChangeRate < 0 ? '감소' : '증가'}하고 있어요. 피크타임은 ${data.peakDay} ${data.peakTime}예요. 업소수도 줄어들어 경쟁이 낮아진 상황 — 지금이 오히려 진입 타이밍일 수 있어요!`;
  }

  const wizard = document.getElementById('analysis-wizard');
  const result = document.getElementById('analysis-result');
  if (wizard) wizard.style.display = 'none';
  if (result) result.style.display = 'block';
}

function renderWizardStep() {
  const body = document.getElementById('analysis-wizard-body');
  if (!body) return;

  if (analysisStep === 0) {
    body.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;">업종을 선택해주세요</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${UPJONG_OPTIONS.map(
          (o) =>
            `<button type="button" class="analysis-opt-btn" data-cd="${o.cd}" data-nm="${o.nm}">${o.nm}</button>`
        ).join('')}
      </div>`;
    body.querySelectorAll('.analysis-opt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        condition.upjong1cd = btn.dataset.cd;
        condition.upjong1nm = btn.dataset.nm;
        analysisStep = 1;
        renderWizardStep();
      });
    });
    return;
  }

  if (analysisStep === 1) {
    body.innerHTML = `
      <div style="font-size:14px;font-weight:700;margin-bottom:12px;">지역을 입력해주세요</div>
      <input id="analysis-region-input" type="text" class="auth-input" placeholder="예: 경기 화성시 동탄2동" style="width:100%;margin-bottom:10px;">
      <button type="button" id="analysis-region-next" class="auth-btn-primary" style="width:100%;">다음</button>`;
    document.getElementById('analysis-region-next')?.addEventListener('click', () => {
      const v = document.getElementById('analysis-region-input')?.value?.trim();
      if (!v) return toast('지역을 입력해주세요');
      condition.regionFull = v;
      analysisStep = 2;
      renderWizardStep();
    });
    return;
  }

  body.innerHTML = `
    <div style="font-size:14px;font-weight:700;margin-bottom:12px;">반경을 선택해주세요</div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      <button type="button" class="analysis-radius-btn" data-r="500">500m</button>
      <button type="button" class="analysis-radius-btn" data-r="1000">1km</button>
      <button type="button" class="analysis-radius-btn" data-r="2000">2km</button>
    </div>`;
  body.querySelectorAll('.analysis-radius-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      condition.radius = parseInt(btn.dataset.r, 10);
      renderAnalysisResult(getMockAnalysisData());
      toast('Mock 상권분석 결과를 표시합니다');
    });
  });
}

export function openAnalysisPanel() {
  const overlay = document.getElementById('analysis-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  resetAnalysis();
}

export function resetAnalysis() {
  condition = { queryText: null, upjong1cd: null, upjong1nm: null, regionFull: null, radius: 1000 };
  analysisStep = 0;
  const wizard = document.getElementById('analysis-wizard');
  const result = document.getElementById('analysis-result');
  if (wizard) wizard.style.display = 'block';
  if (result) result.style.display = 'none';
  renderWizardStep();
}

function bindAnalysisUI() {
  if (window.__golmokAnalysisBound) return;
  window.__golmokAnalysisBound = true;

  document.querySelectorAll('.ni[data-open-analysis], .nav-analysis, .tnl[data-open-analysis], .ai-detail-btn[data-open-analysis]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openAnalysisPanel();
    });
  });

  document.getElementById('close-analysis-overlay')?.addEventListener('click', () => {
    document.getElementById('analysis-overlay')?.classList.remove('open');
  });
  document.getElementById('analysis-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'analysis-overlay') e.target.classList.remove('open');
  });
  document.getElementById('btn-reset-analysis')?.addEventListener('click', resetAnalysis);

  window.resetAnalysis = resetAnalysis;
}

export function initAnalysis() {
  bindAnalysisUI();
}

document.addEventListener('DOMContentLoaded', initAnalysis);
