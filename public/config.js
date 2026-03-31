/**
 * Supabase 연결 값은 supabase-config.js (public/ 안, Git 제외).
 *
 * 로컬: public 폴더에서 supabase-config.example.js → supabase-config.js 복사 후 편집
 * Vercel: Environment Variables + 빌드 시 public/supabase-config.js 자동 생성
 *
 * anon 키는 브라우저에 포함됩니다. RLS 로 제한하세요. service_role 은 넣지 마세요.
 */

export { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js"
