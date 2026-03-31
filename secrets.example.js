/**
 * 복사 명령 (PowerShell 예시):
 *   Copy-Item secrets.example.js secrets.js
 *
 * 그다음 secrets.js 를 열어 SUPABASE_URL, SUPABASE_ANON_KEY 를
 * Supabase 대시보드 → Project Settings → API 에서 붙여넣습니다.
 * (anon public 만 사용. service_role 은 브라우저에 넣지 마세요.)
 */

export const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co"
export const SUPABASE_ANON_KEY = ""
