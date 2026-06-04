/** 로그인·회원가입 모달 DOM (login_instructions.md) */
export function mountAuthModals() {
  if (document.getElementById('login-overlay')) return true;

  const tpl = document.createElement('template');
  tpl.innerHTML = `
<div class="modal-bg" id="login-overlay">
  <div class="modal auth-modal-sheet">
    <div class="auth-handle"></div>
    <div class="modal-head">
      <div class="auth-modal-brand">
        <img src="/assets/gmlogo.png" alt="골목대장" width="32" height="32">
        <div><div class="modal-title">골목대장</div><div class="auth-modal-sub">소상공인 상권 커뮤니티</div></div>
      </div>
      <button type="button" class="modal-close" id="close-login"><i class="ti ti-x"></i></button>
    </div>
    <div class="auth-tabs">
      <button type="button" class="auth-tab act" data-tab="login">로그인</button>
      <button type="button" class="auth-tab" data-tab="signup">회원가입</button>
    </div>
    <div class="auth-modal-body">
      <div id="tab-login-content">
        <p class="auth-intro">소상공인 커뮤니티 이용을 위해 로그인해주세요.</p>
        <div class="auth-social-col">
          <button type="button" class="auth-btn-google" id="btn-google-login"><i class="ti ti-brand-google"></i> Google로 시작하기</button>
          <button type="button" class="auth-btn-kakao" id="btn-kakao-login">카카오 (준비중)</button>
          <button type="button" class="auth-btn-naver" id="btn-naver-login">네이버 (준비중)</button>
        </div>
        <div class="auth-divider"><span>또는 이메일로</span></div>
        <input id="login-email" type="email" class="auth-input" placeholder="이메일 주소">
        <input id="login-password" type="password" class="auth-input" placeholder="비밀번호">
        <button type="button" class="auth-btn-primary" id="btn-email-login">로그인</button>
        <button type="button" class="auth-link-btn" id="btn-forgot-open">비밀번호를 잊으셨나요?</button>
        <div id="login-error" class="auth-error" style="display:none;"></div>
      </div>
      <div id="tab-signup-content" style="display:none;">
        <div class="auth-social-col" style="margin-bottom:20px;">
          <button type="button" class="auth-btn-google" id="btn-google-signup"><i class="ti ti-brand-google"></i> Google로 가입하기</button>
          <button type="button" class="auth-btn-kakao" id="btn-kakao-signup">카카오 (준비중)</button>
          <button type="button" class="auth-btn-naver" id="btn-naver-signup">네이버 (준비중)</button>
        </div>
        <div class="auth-divider"><span>또는 이메일로</span></div>
        <div class="signup-form-fields" style="display:flex;flex-direction:column;gap:10px;">
          <div><label class="signup-label">닉네임 <span class="req">*</span></label>
          <input id="signup-nickname" type="text" class="auth-input" placeholder="2자 이상 입력 (예: 동탄대장)" maxlength="20"></div>
          <div><label class="signup-label">이메일 <span class="req">*</span></label>
          <input id="signup-email" type="email" class="auth-input" placeholder="이메일 주소"></div>
          <div><label class="signup-label">비밀번호 <span class="req">*</span> <span class="signup-hint">(대문자·숫자·특수문자 포함 8자 이상)</span></label>
          <div class="pw-wrap"><input id="signup-password" type="password" class="auth-input" placeholder="비밀번호 입력">
          <button type="button" class="pw-toggle" data-pw="signup-password" aria-label="비밀번호 표시"><i class="ti ti-eye"></i></button></div>
          <div id="password-strength"></div></div>
          <div><label class="signup-label">비밀번호 확인 <span class="req">*</span></label>
          <div class="pw-wrap"><input id="signup-password-confirm" type="password" class="auth-input" placeholder="비밀번호 재입력">
          <button type="button" class="pw-toggle" data-pw="signup-password-confirm" aria-label="비밀번호 표시"><i class="ti ti-eye"></i></button></div>
          <div id="password-match-msg" class="signup-hint"></div></div>
          <div><label class="signup-label">연락처 <span class="req">*</span> <span class="signup-hint">(추후 PASS 본인인증 연동)</span></label>
          <input id="signup-phone" type="tel" class="auth-input" placeholder="010-0000-0000" maxlength="13"></div>
          <div class="signup-section-divider"></div>
          <div class="signup-optional-title">선택 정보 (나중에 마이페이지에서도 변경 가능)</div>
          <div><label class="signup-label">현재 상태</label>
          <div class="status-grid">
            <label class="status-label"><input type="radio" name="user-status" value="operating" checked hidden>
            <div class="status-btn act" data-value="operating">🏪<br>가게 운영중</div></label>
            <label class="status-label"><input type="radio" name="user-status" value="preparing" hidden>
            <div class="status-btn" data-value="preparing">📋<br>창업 준비중</div></label>
            <label class="status-label"><input type="radio" name="user-status" value="prospective" hidden>
            <div class="status-btn" data-value="prospective">🔍<br>예비창업자</div></label>
          </div></div>
          <div id="upjong-field"><label class="signup-label">업종</label>
          <select id="signup-upjong" class="auth-input">
            <option value="">업종을 선택해주세요</option>
            <option value="I2">음식</option><option value="G2">소매</option><option value="S2">수리·개인</option>
            <option value="R1">예술·스포츠</option><option value="P1">교육</option><option value="L1">부동산</option>
            <option value="I1">숙박</option><option value="M1">과학·기술</option><option value="Q1">보건의료</option>
            <option value="N1">시설관리·임대</option>
          </select></div>
          <div><label class="signup-label">주요 활동 지역 <span class="signup-hint">(가입 후 우리동네 피드 자동 설정)</span></label>
          <input id="signup-region" type="text" class="auth-input" placeholder="예: 경기 화성시 동탄2동"></div>
          <div class="auth-agree-box signup-agree">
            <label class="agree-row agree-all-row"><input type="checkbox" id="agree-all"> <strong>전체 동의</strong></label>
            <label class="agree-row"><input type="checkbox" id="agree-terms"> <span>[필수] 서비스 이용약관 동의</span>
            <a href="/terms.html" target="_blank" rel="noopener">보기</a></label>
            <label class="agree-row"><input type="checkbox" id="agree-privacy"> <span>[필수] 개인정보 처리방침 동의</span>
            <a href="/privacy.html" target="_blank" rel="noopener">보기</a></label>
            <label class="agree-row"><input type="checkbox" id="agree-marketing"> <span>[선택] 마케팅 정보 수신 동의</span></label>
          </div>
          <button type="button" class="auth-btn-primary" id="btn-email-signup">이메일로 가입하기</button>
        </div>
        <div id="signup-error" class="auth-error" style="display:none;"></div>
      </div>
      <div id="tab-forgot-content" style="display:none;">
        <p class="auth-forgot-desc">가입한 이메일로 비밀번호 재설정 링크를 보냅니다.</p>
        <input id="forgot-email" type="email" class="auth-input" placeholder="이메일 주소">
        <button type="button" class="auth-btn-primary" id="btn-send-reset">재설정 링크 보내기</button>
        <button type="button" class="auth-link-btn" id="btn-back-login">로그인으로 돌아가기</button>
        <div id="forgot-error" class="auth-error" style="display:none;"></div>
        <div id="forgot-success" class="auth-success" style="display:none;"></div>
      </div>
    </div>
  </div>
</div>
<div class="modal-bg" id="verify-email-overlay">
  <div class="modal auth-modal-sheet" style="text-align:center;">
    <div style="font-size:40px;margin-bottom:12px;">📧</div>
    <div class="modal-title">이메일을 확인해주세요</div>
    <p style="font-size:13px;color:#555;line-height:1.6;margin:12px 0;">
      <span id="verify-email-address" style="color:#C17F24;font-weight:700;"></span> 으로 인증 메일을 보냈습니다.<br>
      링크 클릭 후 로그인해주세요.
    </p>
    <button type="button" class="auth-btn-outline" id="btn-resend-email">인증 메일 다시 보내기</button>
    <button type="button" class="auth-link-btn" id="btn-close-verify">확인</button>
  </div>
</div>
<div class="modal-bg" id="profile-setup-overlay">
  <div class="modal auth-modal-sheet">
    <div class="modal-title" style="text-align:center;">프로필을 설정해주세요</div>
    <p style="font-size:12px;color:#999;text-align:center;margin:8px 0 16px;">회원가입을 마무리합니다 (나중에 변경 가능)</p>
    <label class="auth-label">닉네임 *</label>
    <input id="profile-nickname" type="text" class="auth-input" placeholder="예: 동탄대장">
    <label class="auth-label">활동 지역</label>
    <input id="profile-region" type="text" class="auth-input" placeholder="예: 경기 화성시 동탄2동">
    <label class="auth-label">업종</label>
    <select id="profile-upjong" class="auth-input">
      <option value="">업종 선택</option>
      <option value="I2">음식</option>
      <option value="G2">소매</option>
      <option value="S2">수리·개인</option>
      <option value="etc">기타 / 창업준비</option>
    </select>
    <button type="button" class="auth-btn-primary" id="btn-save-profile">시작하기</button>
    <button type="button" class="auth-link-btn" id="btn-skip-profile">나중에 설정하기</button>
  </div>
</div>`;
  tpl.content.querySelectorAll('.modal-bg').forEach((el) => document.body.appendChild(el));
  return true;
}
