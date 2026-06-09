import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const ver = '20260640';

const communityMain = `
      <div class="main-content">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div>
            <h2 style="font-size:20px;font-weight:700;">전체 게시판</h2>
            <p style="font-size:13px;color:#999;margin-top:4px;">전국 소상공인 대장님들의 이야기</p>
          </div>
          <button type="button" data-open-write style="background:#F5A623;color:#fff;border:none;border-radius:20px;padding:8px 18px;font-size:13px;font-weight:500;cursor:pointer;"><i class="ti ti-pencil"></i> 글쓰기</button>
        </div>
        <div style="display:flex;border-bottom:1px solid #E8E4DC;margin-bottom:16px;overflow-x:auto;">
          <button type="button" class="cat-tab" data-cat="all" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:14px;white-space:nowrap;border-bottom:2px solid transparent;">전체</button>
          <button type="button" class="cat-tab" data-cat="qna" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:14px;white-space:nowrap;border-bottom:2px solid transparent;">질문·고민</button>
          <button type="button" class="cat-tab" data-cat="info" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:14px;white-space:nowrap;border-bottom:2px solid transparent;">정보공유</button>
          <button type="button" class="cat-tab" data-cat="startup" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:14px;white-space:nowrap;border-bottom:2px solid transparent;">창업준비</button>
          <button type="button" class="cat-tab" data-cat="issue" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:14px;white-space:nowrap;border-bottom:2px solid transparent;">이슈</button>
          <button type="button" class="cat-tab" data-cat="event" style="padding:10px 16px;border:none;background:none;cursor:pointer;font-size:14px;white-space:nowrap;border-bottom:2px solid transparent;">이벤트</button>
        </div>
        <div id="community-post-list" class="plist" style="border-radius:12px;overflow:hidden;border:1px solid var(--border);"></div>
        <div id="loading-indicator" style="text-align:center;padding:20px;color:#999;display:none;">불러오는 중...</div>
      </div>`;

const neighborhoodMain = `
      <div class="main-content" id="neighborhood-content">
        <div style="margin-bottom:16px;">
          <h2 style="font-size:20px;font-weight:700;">우리동네</h2>
          <p style="font-size:13px;color:#999;margin-top:4px;display:flex;align-items:center;gap:6px;"><i class="ti ti-map-pin" style="color:#F5A623;"></i> <span id="current-region">경기 화성시 동탄2동</span> 기준</p>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          <button type="button" class="range-btn act" data-range="dong" style="padding:7px 16px;border-radius:20px;font-size:13px;cursor:pointer;border:1px solid #F5A623;background:#F5A623;color:#fff;">우리동네</button>
          <button type="button" class="range-btn" data-range="sigungu" style="padding:7px 16px;border-radius:20px;font-size:13px;cursor:pointer;border:1px solid #E8E4DC;background:transparent;color:#555;">인근 동네</button>
          <button type="button" class="range-btn" data-range="all" style="padding:7px 16px;border-radius:20px;font-size:13px;cursor:pointer;border:1px solid #E8E4DC;background:transparent;color:#555;">전체 지역</button>
        </div>
        <div style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:700;margin-bottom:8px;">이번 주 우리동네 이벤트·이슈</div>
          <div id="neighborhood-events"></div>
        </div>
        <div id="neighborhood-post-list" class="plist" style="border-radius:12px;overflow:hidden;border:1px solid var(--border);"></div>
      </div>`;

const industryMain = `
      <div class="main-content">
        <div style="margin-bottom:20px;">
          <h2 style="font-size:20px;font-weight:700;">업종별 게시판</h2>
          <p style="font-size:13px;color:#999;margin-top:4px;">같은 업종 대장님들의 이야기를 모아보세요</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px;">
          <button type="button" class="industry-btn act" data-code="" data-name="전체" style="padding:14px 8px;border-radius:12px;border:1px solid #F5A623;background:#FFF8E7;cursor:pointer;text-align:center;"><div style="font-size:22px;margin-bottom:4px;">🏪</div><div class="industry-label" style="font-size:12px;font-weight:500;color:#C17F24;">전체</div></button>
          <button type="button" class="industry-btn" data-code="I2" data-name="음식" style="padding:14px 8px;border-radius:12px;border:1px solid #E8E4DC;background:#fff;cursor:pointer;text-align:center;"><div style="font-size:22px;margin-bottom:4px;">🍽️</div><div class="industry-label" style="font-size:12px;font-weight:500;color:#555;">음식</div></button>
          <button type="button" class="industry-btn" data-code="G2" data-name="소매" style="padding:14px 8px;border-radius:12px;border:1px solid #E8E4DC;background:#fff;cursor:pointer;text-align:center;"><div style="font-size:22px;margin-bottom:4px;">🛍️</div><div class="industry-label" style="font-size:12px;font-weight:500;color:#555;">소매</div></button>
          <button type="button" class="industry-btn" data-code="S2" data-name="수리·개인" style="padding:14px 8px;border-radius:12px;border:1px solid #E8E4DC;background:#fff;cursor:pointer;text-align:center;"><div style="font-size:22px;margin-bottom:4px;">🔧</div><div class="industry-label" style="font-size:12px;font-weight:500;color:#555;">수리·개인</div></button>
          <button type="button" class="industry-btn" data-code="R1" data-name="예술·스포츠" style="padding:14px 8px;border-radius:12px;border:1px solid #E8E4DC;background:#fff;cursor:pointer;text-align:center;"><div style="font-size:22px;margin-bottom:4px;">🎨</div><div class="industry-label" style="font-size:12px;font-weight:500;color:#555;">예술·스포츠</div></button>
          <button type="button" class="industry-btn" data-code="P1" data-name="교육" style="padding:14px 8px;border-radius:12px;border:1px solid #E8E4DC;background:#fff;cursor:pointer;text-align:center;"><div style="font-size:22px;margin-bottom:4px;">📚</div><div class="industry-label" style="font-size:12px;font-weight:500;color:#555;">교육</div></button>
          <button type="button" class="industry-btn" data-code="L1" data-name="부동산" style="padding:14px 8px;border-radius:12px;border:1px solid #E8E4DC;background:#fff;cursor:pointer;text-align:center;"><div style="font-size:22px;margin-bottom:4px;">🏠</div><div class="industry-label" style="font-size:12px;font-weight:500;color:#555;">부동산</div></button>
          <button type="button" class="industry-btn" data-code="I1" data-name="숙박" style="padding:14px 8px;border-radius:12px;border:1px solid #E8E4DC;background:#fff;cursor:pointer;text-align:center;"><div style="font-size:22px;margin-bottom:4px;">🛏️</div><div class="industry-label" style="font-size:12px;font-weight:500;color:#555;">숙박</div></button>
          <button type="button" class="industry-btn" data-code="Q1" data-name="보건의료" style="padding:14px 8px;border-radius:12px;border:1px solid #E8E4DC;background:#fff;cursor:pointer;text-align:center;"><div style="font-size:22px;margin-bottom:4px;">🏥</div><div class="industry-label" style="font-size:12px;font-weight:500;color:#555;">보건의료</div></button>
          <button type="button" class="industry-btn" data-code="M1" data-name="과학·기술" style="padding:14px 8px;border-radius:12px;border:1px solid #E8E4DC;background:#fff;cursor:pointer;text-align:center;"><div style="font-size:22px;margin-bottom:4px;">🔬</div><div class="industry-label" style="font-size:12px;font-weight:500;color:#555;">과학·기술</div></button>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div style="font-size:14px;font-weight:700;"><span id="selected-industry-name">전체</span> 게시글</div>
          <div id="industry-post-count" style="font-size:12px;color:#999;"></div>
        </div>
        <div id="industry-post-list" class="plist" style="border-radius:12px;overflow:hidden;border:1px solid var(--border);"></div>
        <div id="store-status-wrap"></div>
      </div>`;

const startupMain = `
      <div class="main-content startup-wrap" style="max-width:720px;margin:0 auto;padding:24px 16px 80px;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="font-size:48px;margin-bottom:8px;">🌤️</div>
          <h2 style="font-size:24px;font-weight:700;margin-bottom:6px;">창업기상도</h2>
          <p style="font-size:14px;color:#999;">내 업종과 지역의 창업 성공 가능성을 날씨로 확인하세요</p>
        </div>
        <div style="background:#fff;border-radius:16px;border:1px solid #E8E4DC;padding:24px;margin-bottom:20px;">
          <div style="font-size:15px;font-weight:700;margin-bottom:16px;color:#C17F24;display:flex;align-items:center;gap:6px;"><i class="ti ti-search"></i> 분석 조건 입력</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;" class="startup-search-row">
            <div><label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px;">업종 <span style="color:#E24B4A;">*</span></label>
              <select id="startup-upjong" style="width:100%;border:1px solid #E8E4DC;border-radius:10px;padding:10px 14px;font-size:14px;">
                <option value="">업종 선택</option>
                <option value="I2">음식</option><option value="G2">소매</option><option value="S2">수리·개인</option>
                <option value="R1">예술·스포츠</option><option value="P1">교육</option><option value="L1">부동산</option>
                <option value="I1">숙박</option><option value="M1">과학·기술</option><option value="Q1">보건의료</option><option value="N1">시설관리·임대</option>
              </select></div>
            <div><label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:5px;">지역 <span style="color:#E24B4A;">*</span></label>
              <input id="startup-region" type="text" placeholder="예: 경기 화성시 동탄2동" style="width:100%;border:1px solid #E8E4DC;border-radius:10px;padding:10px 14px;font-size:14px;"></div>
          </div>
          <button type="button" id="btn-startup-search" style="width:100%;background:#F5A623;color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;"><i class="ti ti-cloud"></i> 창업기상도 분석</button>
        </div>
        <div id="startup-loading" style="text-align:center;padding:40px;display:none;"><div style="width:36px;height:36px;border:3px solid #E8E4DC;border-top-color:#F5A623;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px;"></div><div style="font-size:14px;color:#999;">분석 중입니다...</div></div>
        <div id="startup-result" style="display:none;background:#fff;border-radius:16px;border:1px solid #E8E4DC;padding:24px;">
          <div style="text-align:center;padding:20px 0;margin-bottom:20px;">
            <div id="weather-icon" style="font-size:64px;margin-bottom:8px;">🌤️</div>
            <div id="weather-label" style="font-size:22px;font-weight:700;margin-bottom:6px;">맑음</div>
            <div id="weather-score" style="font-size:48px;font-weight:700;color:#F5A623;line-height:1;margin-bottom:6px;">72</div>
            <div style="font-size:12px;color:#999;margin-bottom:8px;">/100점</div>
            <div id="weather-desc" style="font-size:14px;color:#555;line-height:1.7;max-width:400px;margin:0 auto;"></div>
          </div>
          <div style="background:#FFF8E7;border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#8B5A10;display:flex;align-items:center;gap:6px;"><i class="ti ti-map-pin"></i><span id="analysis-condition-text"></span></div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
            <div style="background:#EBF4FF;border-radius:12px;padding:14px;text-align:center;"><div style="font-size:11px;color:#555;margin-bottom:6px;"><i class="ti ti-users" style="color:#378ADD;"></i> 일 유동인구</div><div id="stat-population" style="font-size:20px;font-weight:700;"></div><div id="stat-pop-change" style="font-size:11px;margin-top:3px;"></div></div>
            <div style="background:#FFF8E7;border-radius:12px;padding:14px;text-align:center;"><div style="font-size:11px;color:#555;margin-bottom:6px;"><i class="ti ti-chart-bar" style="color:#C17F24;"></i> 월 평균 매출</div><div id="stat-revenue" style="font-size:20px;font-weight:700;"></div><div id="stat-rev-change" style="font-size:11px;margin-top:3px;"></div></div>
            <div style="background:#FFF1F1;border-radius:12px;padding:14px;text-align:center;"><div style="font-size:11px;color:#555;margin-bottom:6px;"><i class="ti ti-store" style="color:#E24B4A;"></i> 동종 업소수</div><div id="stat-stores" style="font-size:20px;font-weight:700;"></div><div id="stat-store-change" style="font-size:11px;margin-top:3px;"></div></div>
          </div>
          <div style="margin-bottom:16px;"><div style="font-size:13px;font-weight:700;margin-bottom:10px;">⏰ 시간대별 유동인구</div><div id="hourly-bars" style="display:flex;gap:4px;align-items:flex-end;height:80px;"></div><div id="peak-info" style="font-size:12px;color:#555;margin-top:10px;padding:8px 12px;background:#FFF8E7;border-radius:8px;"></div></div>
          <div style="background:linear-gradient(135deg,#F5A623,#E8920E);border-radius:12px;padding:16px;color:#fff;"><div style="font-size:12px;opacity:.85;margin-bottom:6px;"><i class="ti ti-robot"></i> 골목대장 AI 분석</div><div id="ai-analysis-text" style="font-size:14px;line-height:1.7;"></div></div>
          <button type="button" id="btn-startup-reset" style="width:100%;margin-top:14px;background:#fff;border:1px solid #E8E4DC;border-radius:12px;padding:12px;font-size:14px;color:#555;cursor:pointer;"><i class="ti ti-refresh"></i> 다시 검색</button>
        </div>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:768px){.startup-search-row{grid-template-columns:1fr!important;}}</style>`;

const analysisMain = `
      <div class="sbiz-analysis-wrap">
        <div class="sbiz-analysis-tabs" id="sbiz-tabs" role="tablist"></div>
        <div class="sbiz-iframe-shell">
          <div id="sbiz-iframe-loading" class="sbiz-iframe-loading">상권지도 불러오는 중...</div>
          <iframe id="sbiz-iframe" title="소상공인365 상권분석" loading="lazy" allow="geolocation"></iframe>
        </div>
      </div>
      <style>
        .page-main-content:has(.sbiz-analysis-wrap){padding:0!important;height:calc(100vh - 56px);overflow:hidden;}
        .sbiz-analysis-wrap{display:flex;flex-direction:column;height:100%;min-height:0;background:#fff;}
        .sbiz-analysis-tabs{display:flex;flex-shrink:0;overflow-x:auto;border-bottom:1px solid var(--border);background:#fff;}
        .sbiz-analysis-tabs::-webkit-scrollbar{display:none;}
        .sbiz-tab{padding:12px 20px;border:none;background:none;cursor:pointer;font-size:14px;color:var(--text2);border-bottom:2px solid transparent;white-space:nowrap;font-family:inherit;}
        .sbiz-tab.act{color:var(--chd);font-weight:600;border-bottom-color:var(--ch);}
        .sbiz-iframe-shell{flex:1;min-height:0;position:relative;background:#F7F3EB;}
        #sbiz-iframe{width:100%;height:100%;border:none;display:block;}
        .sbiz-iframe-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#F7F3EB;color:#999;font-size:14px;z-index:1;}
      </style>`;

const eventsMain = `
      <div class="main-content">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div>
            <h2 style="font-size:20px;font-weight:700;">이벤트·행사</h2>
            <p style="font-size:13px;color:#999;margin-top:4px;">우리동네 이벤트와 행사 정보</p>
          </div>
          <button type="button" onclick="openEventWriteModal()" style="background:#F5A623;color:#fff;border:none;border-radius:20px;padding:8px 18px;font-size:13px;font-weight:500;cursor:pointer;"><i class="ti ti-speakerphone"></i> 이벤트 등록</button>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:20px;overflow-x:auto;">
          <button type="button" class="event-filter-btn act" data-type="all" style="padding:7px 16px;border-radius:20px;font-size:13px;border:none;background:#F5A623;color:#fff;cursor:pointer;white-space:nowrap;font-weight:500;">전체</button>
          <button type="button" class="event-filter-btn" data-type="discount" style="padding:7px 16px;border-radius:20px;font-size:13px;border:1px solid #E8E4DC;background:#fff;color:#555;cursor:pointer;white-space:nowrap;">🏷️ 할인이벤트</button>
          <button type="button" class="event-filter-btn" data-type="groupbuy" style="padding:7px 16px;border-radius:20px;font-size:13px;border:1px solid #E8E4DC;background:#fff;color:#555;cursor:pointer;white-space:nowrap;">🛒 공동구매</button>
          <button type="button" class="event-filter-btn" data-type="meeting" style="padding:7px 16px;border-radius:20px;font-size:13px;border:1px solid #E8E4DC;background:#fff;color:#555;cursor:pointer;white-space:nowrap;">👥 모임·행사</button>
          <button type="button" class="event-filter-btn" data-type="issue" style="padding:7px 16px;border-radius:20px;font-size:13px;border:1px solid #E8E4DC;background:#fff;color:#555;cursor:pointer;white-space:nowrap;">⚠️ 이슈</button>
        </div>
        <div id="events-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;"></div>
        <div id="events-empty" style="display:none;text-align:center;padding:60px 20px;background:#fff;border-radius:12px;border:1px solid #E8E4DC;margin-top:12px;">
          <div style="font-size:48px;margin-bottom:12px;">📢</div>
          <div style="font-size:16px;font-weight:700;margin-bottom:8px;">등록된 이벤트가 없습니다</div>
          <button type="button" onclick="openEventWriteModal()" style="background:#F5A623;color:#fff;border:none;border-radius:20px;padding:10px 24px;font-size:14px;cursor:pointer;margin-top:12px;">이벤트 등록하기</button>
        </div>
      </div>`;

const policyMain = `
      <div class="main-content">
        <div style="margin-bottom:24px;">
          <h2 style="font-size:20px;font-weight:700;">정책·지원</h2>
          <p style="font-size:13px;color:#999;margin-top:4px;">소상공인을 위한 정부 지원 정책 정보</p>
        </div>
        <div style="background:linear-gradient(135deg,#F5A623,#E8920E);border-radius:14px;padding:20px;margin-bottom:20px;color:#fff;">
          <div style="font-size:14px;font-weight:700;margin-bottom:6px;">🔔 소상공인365 API 연동</div>
          <div style="font-size:13px;opacity:.9;line-height:1.6;">창업기상도·상권분석·업소현황 데이터가 연동되었습니다. 어드민에서 Mock/Real 모드를 전환할 수 있습니다.</div>
        </div>
        <div style="font-size:14px;font-weight:700;margin-bottom:12px;">🔗 바로가기</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:24px;">
          <a href="https://www.sbiz.or.kr" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:14px;background:#fff;border-radius:12px;border:1px solid #E8E4DC;text-decoration:none;color:#1A1A1A;font-size:13px;font-weight:500;"><span style="font-size:24px;">🏛️</span><div><div>소상공인진흥공단</div><div style="font-size:11px;color:#999;">정책자금·교육</div></div></a>
          <a href="https://www.sbiz.or.kr/sup/main.do" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:14px;background:#fff;border-radius:12px;border:1px solid #E8E4DC;text-decoration:none;color:#1A1A1A;font-size:13px;font-weight:500;"><span style="font-size:24px;">💰</span><div><div>정책자금 신청</div><div style="font-size:11px;color:#999;">융자·보증</div></div></a>
          <a href="https://bizinfo.go.kr" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:14px;background:#fff;border-radius:12px;border:1px solid #E8E4DC;text-decoration:none;color:#1A1A1A;font-size:13px;font-weight:500;"><span style="font-size:24px;">📋</span><div><div>기업마당</div><div style="font-size:11px;color:#999;">지원사업 통합검색</div></div></a>
          <a href="https://www.work.go.kr" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;padding:14px;background:#fff;border-radius:12px;border:1px solid #E8E4DC;text-decoration:none;color:#1A1A1A;font-size:13px;font-weight:500;"><span style="font-size:24px;">👷</span><div><div>워크넷</div><div style="font-size:11px;color:#999;">고용·노무 지원</div></div></a>
        </div>
        <div style="font-size:14px;font-weight:700;margin-bottom:12px;">📢 대장님들의 정책 정보 공유</div>
        <div id="policy-post-list" class="plist" style="border-radius:12px;overflow:hidden;border:1px solid var(--border);"></div>
      </div>`;

const pages = [
  ['community.html', '전체 게시판 - 골목대장', 'community', communityMain, 'js/pages/community.js'],
  ['neighborhood.html', '우리동네 - 골목대장', 'neighborhood', neighborhoodMain, 'js/pages/neighborhood.js'],
  ['by-industry.html', '업종별 - 골목대장', 'by-industry', industryMain, 'js/pages/by_industry.js'],
  ['events.html', '이벤트·행사 - 골목대장', 'events', eventsMain, 'js/pages/events.js'],
  ['policy.html', '정책·지원 - 골목대장', 'policy', policyMain, 'js/pages/policy.js'],
  ['analysis.html', '상권분석 - 골목대장', 'analysis', analysisMain, 'js/pages/analysis_page.js'],
];

function activateSidebar(html, activePage) {
  return html.replace(/<!-- SIDEBAR -->[\s\S]*?<\/aside>/, (sidebar) => {
    let sb = sidebar.replace(/(<a class="ni menu-item) act/g, '$1');
    sb = sb.replace(
      new RegExp(`(<a class="ni menu-item)([^>]*data-page="${activePage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`),
      '$1 act$2'
    );
    return sb;
  });
}

function buildPage(indexHtml, fileName, title, activePage, mainInner, pageScript) {
  let html = indexHtml;
  html = html.replace(/<title>[^<]+<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<a class="tnl act" href="index\.html">홈<\/a>/, '<a class="tnl" href="index.html">홈</a>');
  html = activateSidebar(html, activePage);

  const mainBlock = `  <!-- CENTER -->
  <main class="center">
    <div class="fscroll page-main-content">
${mainInner}
    </div>
  </main>`;

  html = html.replace(/<!-- CENTER -->[\s\S]*?<\/main>/, mainBlock);

  const scriptTag = `<script type="module" src="${pageScript}?v=${ver}"></script>`;
  if (!html.includes(pageScript)) {
    html = html.replace(
      /(<script type="module" src="js\/fcm\.js\?v=[^"]+"><\/script>)/,
      `$1\n${scriptTag}`
    );
  }

  const outPath = path.join(root, fileName);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log('Wrote', fileName);
}

const indexHtml = fs.readFileSync(indexPath, 'utf8');
for (const [fileName, title, activePage, mainInner, pageScript] of pages) {
  buildPage(indexHtml, fileName, title, activePage, mainInner, pageScript);
}
console.log('Done.');
