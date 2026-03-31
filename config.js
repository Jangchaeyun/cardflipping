/**
 * Supabase 연결 값은 supabase-config.js (Git 제외).
 *
 * 로컬: supabase-config.example.js 를 supabase-config.js 로 복사 후 편집
 * Vercel: Environment Variables 에 SUPABASE_URL, SUPABASE_ANON_KEY →
 *         빌드 시 npm run build 가 supabase-config.js 를 생성
 *
 * anon 키는 브라우저에 포함됩니다. RLS 로 제한하세요. service_role 은 넣지 마세요.
 */

export { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js"
