/** 골목대장 Supabase 설정 (Mu-project) */
export const SUPABASE_URL = 'https://xmjyeethpuljiyixkiwd.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtanllZXRocHVsaml5aXhraXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTUzODIsImV4cCI6MjA5NTYzMTM4Mn0.Fn55Z3vUot9V2s25mu7hK0Q-1HRyhLi5gbHn28_y4fc';

/**
 * Supabase 대시보드 → Authentication → URL Configuration 에 등록:
 * - https://golmokmaster.com/reset-password.html
 * - https://golmokmaster.com/terms.html
 * - https://golmokmaster.com/privacy.html
 * - https://m.golmokmaster.com/reset-password.html
 * - https://m.golmokmaster.com/terms.html
 * - https://m.golmokmaster.com/privacy.html
 * - https://golmokmaster.com/ , /index.html , /login.html
 * - https://m.golmokmaster.com/ , /index.html , /login.html
 * - https://golmokmaster.com/admin/index.html
 * - https://golmokmaster.com/admin/dashboard.html
 */
export function getAuthRedirectUrl() {
  const path = window.location.pathname.replace(/login\.html$/i, 'index.html');
  return `${window.location.origin}${path}`;
}

/** 비밀번호 재설정 메일 링크 리다이렉트 (Supabase Redirect URLs에 등록 필수) */
export function getPasswordResetRedirectUrl() {
  return `${window.location.origin}/reset-password.html`;
}
