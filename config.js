/**
 * 공개 저장소용 연결 레이어: 실제 키는 secrets.js 에만 있습니다.
 *
 * 로컬/배포 서버에서 한 번 설정:
 *   secrets.example.js → secrets.js 로 복사 후 URL·anon 키 입력
 *
 * anon 키는 클라이언트에 노출되지만, RLS로 권한을 제한해야 합니다.
 * service_role 키는 여기 넣지 마세요.
 */

export { SUPABASE_URL, SUPABASE_ANON_KEY } from "./secrets.js"
