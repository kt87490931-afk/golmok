/** 골목대장 Supabase 설정 (Mu-project) */
export const SUPABASE_URL = 'https://xmjyeethpuljiyixkiwd.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtanllZXRocHVsaml5aXhraXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTUzODIsImV4cCI6MjA5NTYzMTM4Mn0.Fn55Z3vUot9V2s25mu7hK0Q-1HRyhLi5gbHn28_y4fc';

/**
 * Supabase 대시보드 → Authentication → URL Configuration 에 등록:
 * - https://golmokmaster.com/ , /index.html , /login.html
 * - https://m.golmokmaster.com/ , /index.html , /login.html
 * - (레거시) github.io/golmok , github.io/golmok-mobile 경로
 */
export function getAuthRedirectUrl() {
  const path = window.location.pathname.replace(/login\.html$/i, 'index.html');
  return `${window.location.origin}${path}`;
}
