/**
 * 로컬 설정 (프로젝트 루트에서, PowerShell 예시):
 *   Copy-Item public/supabase-config.example.js public/supabase-config.js
 *
 * supabase-config.js 를 연 뒤 PROJECT_REF·anon public 키를 넣습니다.
 * (service_role 은 브라우저에 넣지 마세요.)
 *
 * Vercel: Git 에 올리지 않고, Environment Variables 에
 *   SUPABASE_URL, SUPABASE_ANON_KEY 만 등록하면 빌드 시 자동 생성됩니다.
 */

export const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co"
export const SUPABASE_ANON_KEY = ""
