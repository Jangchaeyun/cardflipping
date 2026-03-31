import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js"

const PAIRS = ["🍎", "🍌", "🍒", "🍇", "🍉", "🍊", "🥝", "🍑"]
const SCORES_TABLE = "card_flip_scores"
const PAIRS_TOTAL = PAIRS.length
const FLIP_BACK_MS = 650
const LEADERBOARD_LIMIT = 25
const REFRESH_DEBOUNCE_MS = 450

const elBoard = document.getElementById("board")
const elTimer = document.getElementById("timer")
const elMoves = document.getElementById("moves")
const elBtnRestart = document.getElementById("btn-restart")
const elModal = document.getElementById("modal-overlay")
const elModalTime = document.getElementById("modal-time")
const elModalMoves = document.getElementById("modal-moves")
const elPlayerName = document.getElementById("player-name")
const elSubmitError = document.getElementById("submit-error")
const elBtnSubmit = document.getElementById("btn-submit-score")
const elBtnSkip = document.getElementById("btn-skip-submit")
const elLeaderboard = document.getElementById("leaderboard")
const elLeaderboardHint = document.getElementById("leaderboard-hint")
const elLeaderboardPanel = document.getElementById("leaderboard-panel")
const elLeaderboardError = document.getElementById("leaderboard-error")
const elBtnRefreshLeaderboard = document.getElementById("btn-refresh-leaderboard")
const elLeaderboardSection = document.getElementById("leaderboard-section")

const supabaseConfigured =
  typeof SUPABASE_URL === "string" &&
  SUPABASE_URL.length > 10 &&
  typeof SUPABASE_ANON_KEY === "string" &&
  SUPABASE_ANON_KEY.length > 20

const supabase = supabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

let cards = []
let firstIndex = null
let secondIndex = null
let lockBoard = false
let moves = 0
let matchedPairs = 0
let timerId = null
let gameStartedAt = null
let timerStarted = false
let finalizedStats = null

let leaderboardLoading = false
let leaderboardRefreshTimer = null
let leaderboardChannel = null

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildDeck() {
  const pairIds = shuffle(PAIRS.map((_, i) => i))
  const deck = []
  pairIds.forEach((pairId) => {
    deck.push({ pairId, symbol: PAIRS[pairId], faceUp: false, matched: false })
    deck.push({ pairId, symbol: PAIRS[pairId], faceUp: false, matched: false })
  })
  return shuffle(deck)
}

function resetGame() {
  stopTimer()
  cards = buildDeck()
  firstIndex = null
  secondIndex = null
  lockBoard = false
  moves = 0
  matchedPairs = 0
  gameStartedAt = null
  timerStarted = false
  finalizedStats = null
  elTimer.textContent = "0"
  elMoves.textContent = "0"
  elModal.setAttribute("hidden", "")
  elSubmitError.hidden = true
  elPlayerName.value = ""
  renderBoard({ deal: true })
}

function updateTimerDisplay() {
  if (gameStartedAt == null) return
  const sec = Math.floor((Date.now() - gameStartedAt) / 1000)
  elTimer.textContent = String(sec)
}

function startTimer() {
  if (timerStarted) return
  timerStarted = true
  gameStartedAt = Date.now()
  updateTimerDisplay()
  timerId = window.setInterval(updateTimerDisplay, 250)
}

function stopTimer() {
  if (timerId != null) {
    clearInterval(timerId)
    timerId = null
  }
}

function formatDurationMs(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n < 0) return "—"
  const totalSec = Math.round(n / 1000)
  if (totalSec < 60) {
    const s = n / 1000
    const str = s < 10 ? s.toFixed(1) : String(Math.round(s))
    return `${str.replace(/\.0$/, "")}초`
  }
  const m = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return sec ? `${m}분 ${sec}초` : `${m}분`
}

function formatShortDate(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })
}

function renderLeaderboardRows(data) {
  elLeaderboard.replaceChildren()
  data.forEach((row, i) => {
    const li = document.createElement("li")
    const rank = i + 1
    if (rank === 1) li.classList.add("is-top1")
    else if (rank === 2) li.classList.add("is-top2")
    else if (rank === 3) li.classList.add("is-top3")

    const elRank = document.createElement("span")
    elRank.className = "rank"
    elRank.textContent = `${rank}`

    const name = document.createElement("span")
    name.className = "name"
    name.textContent = row.player_name
    name.title = row.player_name

    const meta = document.createElement("span")
    meta.className = "meta"
    meta.textContent = `${row.moves} · ${formatDurationMs(row.duration_ms)}`

    const when = document.createElement("span")
    when.className = "when"
    when.textContent = formatShortDate(row.created_at)

    li.append(elRank, name, meta, when)
    elLeaderboard.append(li)
  })
}

function setLeaderboardLoading(active, quiet) {
  leaderboardLoading = active
  if (quiet) return
  elLeaderboardHint.classList.toggle("is-loading", active)
  if (active) {
    elLeaderboardHint.textContent = "순위를 불러오는 중…"
    elLeaderboardError.hidden = true
  }
  elBtnRefreshLeaderboard.disabled = active
}

function scheduleRefreshLeaderboard() {
  if (!supabase) return
  clearTimeout(leaderboardRefreshTimer)
  leaderboardRefreshTimer = setTimeout(() => {
    leaderboardRefreshTimer = null
    refreshLeaderboard({ quiet: true })
  }, REFRESH_DEBOUNCE_MS)
}

function subscribeLeaderboardRealtime() {
  if (!supabase || leaderboardChannel) return
  leaderboardChannel = supabase
    .channel("leaderboard-live")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: SCORES_TABLE,
        filter: `pairs_total=eq.${PAIRS_TOTAL}`,
      },
      () => scheduleRefreshLeaderboard(),
    )
    .subscribe()
}

async function refreshLeaderboard(options = {}) {
  const quiet = options.quiet === true
  if (!supabase) return

  if (!quiet) setLeaderboardLoading(true, false)

  const { data, error } = await supabase
    .from(SCORES_TABLE)
    .select("player_name, moves, duration_ms, created_at")
    .eq("pairs_total", PAIRS_TOTAL)
    .order("moves", { ascending: true })
    .order("duration_ms", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(LEADERBOARD_LIMIT)

  if (!quiet) setLeaderboardLoading(false, false)

  if (error) {
    elLeaderboardError.textContent = error.message || "리더보드를 불러오지 못했습니다."
    elLeaderboardError.hidden = false
    elLeaderboardHint.textContent =
      "아래 메시지를 확인하세요. RLS·Realtime 설정 또는 네트워크를 점검해 보세요."
    elLeaderboardPanel.hidden = true
    return
  }

  elLeaderboardError.hidden = true

  if (!data.length) {
    elLeaderboardHint.textContent = "아직 기록이 없습니다. 클리어 후 닉네임을 남겨 보세요."
    elLeaderboardPanel.hidden = true
    return
  }

  elLeaderboardHint.textContent = `상위 ${data.length}명 (실시간 반영 · 새로고침 가능)`
  elLeaderboardPanel.hidden = false
  renderLeaderboardRows(data)
}

function scrollToLeaderboard() {
  elLeaderboardSection?.scrollIntoView({ behavior: "smooth", block: "nearest" })
}

function renderBoard(options = {}) {
  const animateDeal = options.deal === true
  elBoard.replaceChildren()
  cards.forEach((card, index) => {
    const slot = document.createElement("div")
    slot.className = animateDeal ? "card-slot card-slot--deal" : "card-slot"
    if (animateDeal) {
      slot.style.setProperty("--deal-delay", `${index * 0.038}s`)
    }

    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "card"
    btn.setAttribute("aria-label", card.matched ? `맞춤 ${card.symbol}` : "카드")
    if (card.faceUp) btn.classList.add("is-face-up")
    if (card.matched) {
      btn.classList.add("is-matched")
      btn.disabled = true
    }

    const inner = document.createElement("div")
    inner.className = "card-inner"
    const back = document.createElement("div")
    back.className = "card-face card-back"
    back.innerHTML =
      '<span class="card-back-pattern"></span><span class="card-back-mark" aria-hidden="true">?</span>'
    const front = document.createElement("div")
    front.className = "card-face card-front"
    front.textContent = card.symbol
    inner.append(back, front)
    btn.append(inner)

    btn.addEventListener("click", () => onCardClick(index))
    slot.append(btn)
    elBoard.append(slot)
  })
}

function onCardClick(index) {
  if (lockBoard) return
  const card = cards[index]
  if (card.matched || card.faceUp) return
  if (firstIndex !== null && secondIndex !== null) return

  startTimer()
  card.faceUp = true

  if (firstIndex === null) {
    firstIndex = index
    renderBoard()
    return
  }

  if (index === firstIndex) return

  secondIndex = index
  moves += 1
  elMoves.textContent = String(moves)
  renderBoard()

  const a = cards[firstIndex]
  const b = cards[secondIndex]

  if (a.pairId === b.pairId) {
    a.matched = true
    b.matched = true
    matchedPairs += 1
    firstIndex = null
    secondIndex = null
    renderBoard()
    if (matchedPairs === PAIRS.length) {
      onWin()
    }
    return
  }

  lockBoard = true
  window.setTimeout(() => {
    a.faceUp = false
    b.faceUp = false
    firstIndex = null
    secondIndex = null
    lockBoard = false
    renderBoard()
  }, FLIP_BACK_MS)
}

function onWin() {
  stopTimer()
  const durationMs =
    gameStartedAt != null ? Math.max(0, Math.round(Date.now() - gameStartedAt)) : 0
  updateTimerDisplay()
  finalizedStats = { moves, duration_ms: durationMs }
  elModalTime.textContent = String(Math.round(durationMs / 1000))
  elModalMoves.textContent = String(finalizedStats.moves)
  elModal.removeAttribute("hidden")
  elPlayerName.focus()
}

function closeModal() {
  elModal.setAttribute("hidden", "")
  elSubmitError.hidden = true
}

async function submitScore() {
  elSubmitError.hidden = true
  const name = elPlayerName.value.trim()
  if (!name) {
    elSubmitError.textContent = "닉네임을 입력하세요."
    elSubmitError.hidden = false
    return
  }
  if (!supabase || !finalizedStats) {
    closeModal()
    return
  }

  elBtnSubmit.disabled = true
  const { error } = await supabase.from(SCORES_TABLE).insert({
    player_name: name,
    moves: finalizedStats.moves,
    duration_ms: finalizedStats.duration_ms,
    pairs_total: PAIRS_TOTAL,
  })
  elBtnSubmit.disabled = false

  if (error) {
    elSubmitError.textContent = error.message || "저장에 실패했습니다."
    elSubmitError.hidden = false
    return
  }

  closeModal()
  await refreshLeaderboard({ quiet: false })
  scrollToLeaderboard()
}

function initSupabaseUi() {
  elBtnRefreshLeaderboard.hidden = !supabaseConfigured

  if (supabaseConfigured) {
    subscribeLeaderboardRealtime()
    refreshLeaderboard({ quiet: false })
  } else {
    elLeaderboardHint.innerHTML =
      "Supabase를 쓰려면 <code>supabase-config.example.js</code>를 <code>supabase-config.js</code>로 복사하고 URL·anon public 키를 넣은 뒤 페이지를 새로고침하세요."
    elLeaderboardPanel.hidden = true
    elLeaderboardError.hidden = true
  }
}

elBtnRestart.addEventListener("click", resetGame)
elBtnSubmit.addEventListener("click", submitScore)
elBtnSkip.addEventListener("click", closeModal)
elBtnRefreshLeaderboard.addEventListener("click", () => refreshLeaderboard({ quiet: false }))
elModal.addEventListener("click", (e) => {
  if (e.target === elModal) closeModal()
})
elPlayerName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitScore()
})

resetGame()
initSupabaseUi()
