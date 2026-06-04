/** 로그인·회원가입 모달 DOM (login_instructions.md) */
export function mountAuthModals() {
  if (document.getElementById('login-overlay')) return;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
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
        <div class="auth-social-col">
          <button type="button" class="auth-btn-google" id="btn-google-login">Google로 시작하기</button>
          <button type="button" class="auth-btn-kakao" id="btn-kakao-login">카카오로 시작하기</button>
          <button type="button" class="auth-btn-naver" id="btn-naver-login">네이버로 시작하기</button>
        </div>
        <div class="auth-divider"><span>또는 이메일로</span></div>
        <input id="login-email" type="email" class="auth-input" placeholder="이메일 주소">
        <input id="login-password" type="password" class="auth-input" placeholder="비밀번호">
        <button type="button" class="auth-btn-primary" id="btn-email-login">로그인</button>
        <button type="button" class="auth-link-btn" id="btn-forgot-open">비밀번호를 잊으셨나요?</button>
        <div id="login-error" class="auth-error" style="display:none;"></div>
      </div>
      <div id="tab-signup-content" style="display:none;">
        <div class="auth-social-col">
          <button type="button" class="auth-btn-google" id="btn-google-signup">Google로 가입하기</button>
          <button type="button" class="auth-btn-kakao" id="btn-kakao-signup">카카오로 가입하기</button>
          <button type="button" class="auth-btn-naver" id="btn-naver-signup">네이버로 가입하기</button>
        </div>
        <div class="auth-divider"><span>또는 이메일로</span></div>
        <input id="signup-nickname" type="text" class="auth-input" placeholder="닉네임 (2자 이상)" maxlength="20">
        <input id="signup-email" type="email" class="auth-input" placeholder="이메일 주소">
        <input id="signup-password" type="password" class="auth-input" placeholder="비밀번호 (8자 이상)">
        <input id="signup-password-confirm" type="password" class="auth-input" placeholder="비밀번호 확인">
        <div class="auth-agree-box">
          <label><input type="checkbox" id="agree-all"> <strong>전체 동의</strong></label>
          <label><input type="checkbox" id="agree-terms"> [필수] 서비스 이용약관</label>
          <label><input type="checkbox" id="agree-privacy"> [필수] 개인정보 처리방침</label>
          <label><input type="checkbox" id="agree-marketing"> [선택] 마케팅 수신</label>
        </div>
        <button type="button" class="auth-btn-primary" id="btn-email-signup">이메일로 가입하기</button>
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
  document.body.appendChild(wrap);
}
