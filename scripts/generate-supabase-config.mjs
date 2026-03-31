/**
 * 빌드(Vercel 등): 환경 변수로 public/supabase-config.js 생성 (배포 출력 루트)
 * 로컬: env 비어 있고 public/supabase-config.js 가 있으면 덮어쓰지 않음
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const publicDir = path.join(root, "public")
const dest = path.join(publicDir, "supabase-config.js")

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

const url = (process.env.SUPABASE_URL ?? "").trim()
const key = (process.env.SUPABASE_ANON_KEY ?? "").trim()
const onVercel = Boolean(process.env.VERCEL)

if (onVercel && (!url || !key)) {
  console.error(
    "\n[Vercel] SUPABASE_URL / SUPABASE_ANON_KEY 가 비어 있습니다.\n" +
      "Vercel → Project → Settings → Environment Variables 에 두 값을 추가하세요.\n",
  )
  process.exit(1)
}

if (!url || !key) {
  if (fs.existsSync(dest)) {
    console.log(
      "[generate-supabase-config] env 비어 있음 → 기존 public/supabase-config.js 유지 (로컬)",
    )
    process.exit(0)
  }
  console.warn(
    "[generate-supabase-config] env 비어 있고 public/supabase-config.js 없음 → 빈 값으로 생성",
  )
}

const content =
  "/** 자동 생성: scripts/generate-supabase-config.mjs — Git 에 커밋하지 마세요 */\n" +
  `export const SUPABASE_URL = ${JSON.stringify(url)}\n` +
  `export const SUPABASE_ANON_KEY = ${JSON.stringify(key)}\n`

fs.writeFileSync(dest, content, "utf8")
console.log("[generate-supabase-config] public/supabase-config.js 생성 완료")
