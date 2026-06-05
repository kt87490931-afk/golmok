# community_pages_1.md 지시서 기반 HTML 페이지 생성
$root = Split-Path $PSScriptRoot -Parent
$indexPath = Join-Path $root "index.html"
$index = Get-Content $indexPath -Raw -Encoding UTF8
$ver = "20260614"

$sidebarHome = @'
  <aside class="sidebar">
    <div class="nsec">메뉴</div>
    <a class="ni menu-item act" data-page="home" href="index.html"><i class="ti ti-home"></i> 홈 피드</a>
    <a class="ni menu-item nav-analysis" data-page="analysis" data-open-analysis href="#"><i class="ti ti-map"></i> 상권분석</a>
    <a class="ni menu-item" data-page="weather" href="index.html"><i class="ti ti-cloud"></i> 창업기상도</a>
    <a class="ni menu-item" data-page="hot" href="index.html"><i class="ti ti-flame"></i> 핫플레이스</a>
    <div class="nsec">커뮤니티</div>
    <a class="ni menu-item" data-page="community" href="community.html"><i class="ti ti-world"></i> 전체 게시판</a>
    <a class="ni menu-item" data-page="neighborhood" href="neighborhood.html"><i class="ti ti-map-pin"></i> 우리동네</a>
    <a class="ni menu-item" data-page="by-industry" href="by-industry.html"><i class="ti ti-tag"></i> 업종별</a>
    <a class="ni menu-item" data-page="events" href="events.html"><i class="ti ti-speakerphone"></i> 이벤트·행사</a>
    <a class="ni menu-item" data-page="policy" href="policy.html"><i class="ti ti-file-text"></i> 정책·지원</a>
    <div class="nsec">내 활동</div>
    <a class="ni menu-item" data-page="saved" href="index.html" id="nav-saved-posts"><i class="ti ti-bookmark"></i> 저장한 글</a>
    <a class="ni menu-item" data-page="notify" href="index.html" id="nav-notifications"><i class="ti ti-bell"></i> 알림 <span class="nbdg" id="sidebar-notify-badge" style="display:none;">0</span></a>
    <a class="ni menu-item" data-page="myposts" href="index.html" id="nav-my-posts"><i class="ti ti-edit"></i> 내 게시글</a>
    <div class="sb-bot">
      <div class="sb-pr">
        <div class="sbav" id="sb-av">?</div>
        <div><div class="sbname" id="sb-name">로그인</div><div class="sbtype">음식 · 동탄</div></div>
        <i class="ti ti-dots" style="margin-left:auto;font-size:16px;color:#999;cursor:pointer;"></i>
      </div>
      <div id="sidebar-profile-actions"></div>
    </div>
  </aside>
'@

function Get-Sidebar($active) {
  return $sidebarHome -replace 'menu-item act" data-page="home"', 'menu-item" data-page="home"' -replace "menu-item`" data-page=`"$active`"", "menu-item act`" data-page=`"$active`""
}

function Build-Page($fileName, $title, $activePage, $mainInner, $pageScript) {
  $html = $index
  $html = $html -replace '<title>[^<]+</title>', "<title>$title</title>"
  $html = $html -replace '<a class="logo-row" href="#">', '<a class="logo-row" href="index.html">'
  $html = $html -replace '<a class="tnl act" href="#">홈</a>', '<a class="tnl" href="index.html">홈</a>'
  $html = $html -replace '<a class="tnl" href="#">정책·지원</a>', '<a class="tnl" href="policy.html">정책·지원</a>'
  $sidebar = Get-Sidebar $activePage
  $html = [regex]::Replace($html, '(?s)<!-- SIDEBAR -->.*?</aside>', "<!-- SIDEBAR -->`n$sidebar")
  $mainBlock = @"
  <main class="center">
    <div class="fscroll page-main-content">
$mainInner
    </div>
  </main>
"@
  $html = [regex]::Replace($html, '(?s)<!-- CENTER -->.*?</main>', "<!-- CENTER -->`n$mainBlock")
  $html = $html -replace '\?v=20260613', "?v=$ver"
  if ($html -notmatch [regex]::Escape($pageScript)) {
    $html = $html -replace '(<script type="module" src="js/fcm.js\?v=[^"]+"></script>)', "`$1`n<script type=`"module`" src=`"$pageScript`"></script>"
  }
  $out = Join-Path $root $fileName
  [System.IO.File]::WriteAllText($out, $html, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Wrote $fileName"
}

$communityMain = @'
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
      </div>
'@

$neighborhoodMain = @'
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
      </div>
'@

$industryMain = @'
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
      </div>
'@

$eventsMain = @'
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
      </div>
'@

$policyMain = @'
      <div class="main-content">
        <div style="margin-bottom:24px;">
          <h2 style="font-size:20px;font-weight:700;">정책·지원</h2>
          <p style="font-size:13px;color:#999;margin-top:4px;">소상공인을 위한 정부 지원 정책 정보</p>
        </div>
        <div style="background:linear-gradient(135deg,#F5A623,#E8920E);border-radius:14px;padding:20px;margin-bottom:20px;color:#fff;">
          <div style="font-size:14px;font-weight:700;margin-bottom:6px;">🔔 소진공 API 연동 준비 중</div>
          <div style="font-size:13px;opacity:.9;line-height:1.6;">곧 소상공인진흥공단의 실시간 정책 정보가 이 페이지에 자동으로 업데이트됩니다.</div>
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
      </div>
'@

Build-Page "community.html" "전체 게시판 - 골목대장" "community" $communityMain "js/pages/community.js?v=$ver"
Build-Page "neighborhood.html" "우리동네 - 골목대장" "neighborhood" $neighborhoodMain "js/pages/neighborhood.js?v=$ver"
Build-Page "by-industry.html" "업종별 - 골목대장" "by-industry" $industryMain "js/pages/by_industry.js?v=$ver"
Build-Page "events.html" "이벤트행사 - 골목대장" "events" $eventsMain "js/pages/events.js?v=$ver"
Build-Page "policy.html" "정책지원 - 골목대장" "policy" $policyMain "js/pages/policy.js?v=$ver"

Write-Host "Done."
