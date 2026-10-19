// ─────────────────────────────────────────────────────────────────────────
// Lặp lại ngắt quãng bằng FSRS (thư viện ts-fsrs).
// - Trạng thái thẻ lưu trên máy (localStorage); có thể đồng bộ lên cột L của
//   Google Sheet nếu bật VITE_SRS_SHEET_SYNC (xem APPS_SCRIPT.md).
// - "Một ngày học" bắt đầu lúc 4:00 sáng (giống Anki) để học khuya vẫn tính là hôm trước.
// ─────────────────────────────────────────────────────────────────────────
import { fsrs, generatorParameters, createEmptyCard, Rating, State } from "ts-fsrs";

export { Rating, State };

const STORE_KEY = "vl-srs-v1";
const DAY_CUTOFF_HOURS = 4;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MAX_LOGS = 20_000;
/** Thẻ hẹn lại trong khoảng này coi là "đang học" → hỏi lại ngay trong phiên. */
export const RELEARN_WINDOW_MS = 30 * 60_000;
/** Ngưỡng độ ổn định (ngày) để coi là "thuộc vững". */
export const MATURE_DAYS = 21;

export const DEFAULT_SETTINGS = {
  newPerDay: null, // null = lấy theo ô E1 của Sheet
  reviewLimit: 200,
  retention: 90, // %
};

/* ───────────────────────── Tiện ích ngày ───────────────────────── */

const pad = (n) => String(n).padStart(2, "0");

/** Khoá ngày học "YYYY-MM-DD" (ranh giới 4:00 sáng giờ máy). */
export function dayKey(d = new Date()) {
  const x = new Date(new Date(d).getTime() - DAY_CUTOFF_HOURS * HOUR);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

/** Thời điểm bắt đầu ngày học chứa `d`. */
export function startOfStudyDay(d = new Date()) {
  const x = new Date(new Date(d).getTime() - DAY_CUTOFF_HOURS * HOUR);
  x.setHours(0, 0, 0, 0);
  return new Date(x.getTime() + DAY_CUTOFF_HOURS * HOUR);
}

export const endOfStudyDay = (d = new Date()) => new Date(startOfStudyDay(d).getTime() + DAY);

/** Mô tả khoảng thời gian ngắn gọn: "1 phút", "10 phút", "3 ngày", "2,5 tháng". */
export function formatInterval(ms) {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} phút`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} giờ`;
  const d = Math.round(ms / DAY);
  if (d < 31) return `${d} ngày`;
  const mo = ms / (30 * DAY);
  if (mo < 12) return `${mo.toFixed(mo < 3 ? 1 : 0).replace(".", ",")} tháng`;
  return `${(ms / (365 * DAY)).toFixed(1).replace(".", ",")} năm`;
}

export const wordKey = (w) => (w?.Word ?? "").trim().toLowerCase();

/* ───────────────────────── Lưu trữ ───────────────────────── */

const emptyData = () => ({ cards: {}, logs: [], bonus: {}, sent: {}, settings: { ...DEFAULT_SETTINGS } });

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && typeof raw === "object") {
      return { ...emptyData(), ...raw, settings: { ...DEFAULT_SETTINGS, ...raw.settings } };
    }
  } catch {
    /* hỏng dữ liệu → bắt đầu lại */
  }
  return emptyData();
}

let data = load();
let version = 0;
const listeners = new Set();

function commit() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("[srs] không lưu được:", err);
  }
  version += 1;
  listeners.forEach((fn) => fn());
}

/** Dùng với useSyncExternalStore. */
export const srsStore = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot: () => version,
};

if (typeof window !== "undefined") {
  // Đồng bộ giữa nhiều tab đang mở.
  window.addEventListener("storage", (e) => {
    if (e.key !== STORE_KEY) return;
    data = load();
    version += 1;
    listeners.forEach((fn) => fn());
  });
}

/* ───────────────────────── Thẻ ───────────────────────── */

function serialize(card, extra = {}) {
  return {
    due: new Date(card.due).toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? new Date(card.last_review).toISOString() : undefined,
    ...extra,
  };
}

function revive(stored) {
  if (!stored) return null;
  return {
    ...stored,
    due: new Date(stored.due),
    last_review: stored.last_review ? new Date(stored.last_review) : undefined,
  };
}

let schedulerCache = { retention: null, f: null };
function scheduler() {
  const retention = Math.min(0.97, Math.max(0.7, (data.settings.retention ?? 90) / 100));
  if (schedulerCache.retention !== retention) {
    schedulerCache = {
      retention,
      f: fsrs(generatorParameters({ request_retention: retention, enable_fuzz: true, enable_short_term: true })),
    };
  }
  return schedulerCache.f;
}

export const getStoredCard = (word) => data.cards[wordKey(word)] ?? null;
export const getCard = (word) => revive(getStoredCard(word));

/** Xác suất còn nhớ (0–1) tại thời điểm `now`, hoặc null nếu là từ mới. */
export function retrievability(word, now = new Date()) {
  const c = getCard(word);
  if (!c || c.state === State.New) return null;
  return scheduler().get_retrievability(c, now, false);
}

/** Xem trước lịch hẹn của từng mức đánh giá: { [Rating]: ms tới lần ôn sau }. */
export function previewIntervals(word, now = new Date()) {
  const card = getCard(word) ?? createEmptyCard(now);
  const rec = scheduler().repeat(card, now);
  const out = {};
  for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
    out[r] = new Date(rec[r].card.due).getTime() - now.getTime();
  }
  return out;
}

/**
 * Ghi nhận một lần ôn. Trả về { card, prevState, stillLearning }.
 * `stillLearning` = thẻ hẹn lại trong vòng 30 phút → nên hỏi lại trong phiên này.
 */
export function reviewWord(word, rating, now = new Date()) {
  const key = wordKey(word);
  const prevStored = data.cards[key];
  const prev = revive(prevStored) ?? createEmptyCard(now);
  const { card } = scheduler().next(prev, now, rating);
  data.cards[key] = serialize(card, { first: prevStored?.first ?? dayKey(now) });
  data.logs.push({ k: key, r: rating, s: prev.state, t: now.toISOString() });
  if (data.logs.length > MAX_LOGS) data.logs.splice(0, data.logs.length - MAX_LOGS);
  commit();
  return {
    card,
    stored: data.cards[key],
    prevState: prev.state,
    stillLearning: new Date(card.due).getTime() - now.getTime() < RELEARN_WINDOW_MS,
  };
}

/** Trạng thái Status (0/1) đã gửi gần nhất cho cột C của Sheet. */
export const lastSentStatus = (word) => data.sent[wordKey(word)] ?? word.Status;
export function markStatusSent(word, status) {
  data.sent[wordKey(word)] = String(status);
  commit();
}

/** Lấy giá trị "Status" tương ứng của thẻ (1 = đã vào giai đoạn ôn dài hạn). */
export const statusForCard = (card) => (card && card.state === State.Review ? "1" : "0");

/**
 * Hợp nhất với dữ liệu Sheet khi tải:
 * - Cột L có trạng thái FSRS mới hơn (đồng bộ từ thiết bị khác) → lấy bản Sheet.
 * - Từ có Status = "1" nhưng chưa có thẻ → tạo thẻ "đã biết", rải lịch ôn trong 7 ngày
 *   để không dồn cả trăm từ vào cùng một ngày.
 */
export function mergeFromSheet(words, now = new Date()) {
  let changed = false;
  const startDay = startOfStudyDay(now);
  for (const w of words) {
    const key = wordKey(w);
    if (!key) continue;
    const local = data.cards[key];

    if (w.Srs) {
      try {
        const remote = JSON.parse(w.Srs);
        const rTime = remote.last_review ? Date.parse(remote.last_review) : 0;
        const lTime = local?.last_review ? Date.parse(local.last_review) : -1;
        if (remote.due && rTime > lTime) {
          data.cards[key] = { ...remote, first: local?.first ?? remote.first ?? "sheet" };
          changed = true;
          continue;
        }
      } catch {
        /* JSON hỏng trong ô Sheet → bỏ qua */
      }
    }

    if (!local && w.Status === "1") {
      const { card } = scheduler().next(createEmptyCard(now), now, Rating.Easy);
      let h = 0;
      for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      card.due = new Date(startDay.getTime() + ((h % 7) + 1) * DAY + 6 * HOUR);
      data.cards[key] = serialize(card, { first: "seed" });
      data.sent[key] = "1";
      changed = true;
    }
  }
  if (changed) commit();
}

/* ───────────────────────── Hàng đợi hôm nay ───────────────────────── */

export const getSettings = () => data.settings;

export function updateSettings(patch) {
  data.settings = { ...data.settings, ...patch };
  commit();
}

export function addBonusNew(n, now = new Date()) {
  const k = dayKey(now);
  data.bonus = { [k]: (data.bonus[k] ?? 0) + n }; // chỉ giữ ngày hiện tại
  commit();
}

const reviewsOn = (k) => data.logs.filter((l) => l.s !== State.New && dayKey(l.t) === k).length;

/**
 * Tính việc cần làm hôm nay.
 * - due: từ đến hạn (đã sắp xếp: hạn sớm nhất trước), bị giới hạn bởi reviewLimit.
 * - newToday: từ mới còn được giới thiệu hôm nay (theo thứ tự trong Sheet).
 * - learnWords: toàn bộ từ mới của hôm nay (đã bắt đầu + chưa bắt đầu) — ổn định suốt ngày.
 */
export function buildToday(words, sheetPerDay, now = new Date()) {
  const s = data.settings;
  const today = dayKey(now);
  const end = endOfStudyDay(now).getTime();
  const due = [];
  const introduced = [];
  const fresh = [];

  for (const w of words) {
    const c = data.cards[wordKey(w)];
    if (!c) {
      fresh.push(w);
      continue;
    }
    if (c.first === today) introduced.push(w);
    const t = Date.parse(c.due);
    if (t <= end) due.push({ w, t });
  }

  due.sort((a, b) => a.t - b.t);
  const perDay = (s.newPerDay ?? sheetPerDay ?? 20) + (data.bonus[today] ?? 0);
  const newToday = fresh.slice(0, Math.max(0, perDay - introduced.length));
  const reviewRoom = Math.max(0, s.reviewLimit - reviewsOn(today));
  const dueWords = due.slice(0, reviewRoom).map((d) => d.w);

  return {
    due: dueWords,
    dueTotal: due.length,
    dueNow: due.filter((d) => d.t <= now.getTime()).length,
    newToday,
    introducedToday: introduced,
    learnWords: [...introduced, ...newToday].sort((a, b) => (a.Row ?? 0) - (b.Row ?? 0)),
    perDay,
    remainingFresh: fresh.length,
  };
}

/* ───────────────────────── Thống kê ───────────────────────── */

/** Số ngày học liên tiếp (hôm nay chưa học thì vẫn giữ chuỗi tới hôm qua). */
export function getStreak(now = new Date()) {
  const days = new Set(data.logs.map((l) => dayKey(l.t)));
  let cursor = startOfStudyDay(now).getTime();
  if (!days.has(dayKey(now))) cursor -= DAY;
  let streak = 0;
  while (days.has(dayKey(new Date(cursor + HOUR)))) {
    streak += 1;
    cursor -= DAY;
  }
  return streak;
}

export function computeStats(words, now = new Date()) {
  const counts = { new: 0, learning: 0, review: 0, mature: 0 };
  const startDay = startOfStudyDay(now).getTime();
  const forecast = Array.from({ length: 7 }, (_, i) => ({ date: new Date(startDay + i * DAY), count: 0 }));

  for (const w of words) {
    const c = data.cards[wordKey(w)];
    if (!c) {
      counts.new += 1;
      continue;
    }
    if (c.state === State.Learning || c.state === State.Relearning) counts.learning += 1;
    else if (c.stability >= MATURE_DAYS) counts.mature += 1;
    else counts.review += 1;

    const idx = Math.max(0, Math.floor((Date.parse(c.due) - startDay) / DAY));
    if (idx < 7) forecast[idx].count += 1;
  }

  // Tỉ lệ nhớ thật: các lần ôn thẻ dài hạn (state Review) trong 30 ngày, không chọn "Quên".
  const since = now.getTime() - 30 * DAY;
  const recent = data.logs.filter((l) => l.s === State.Review && Date.parse(l.t) >= since);
  const retention = recent.length ? recent.filter((l) => l.r !== Rating.Again).length / recent.length : null;

  const streak = getStreak(now);

  const today = dayKey(now);
  const todayLogs = data.logs.filter((l) => dayKey(l.t) === today);

  return {
    counts,
    forecast,
    retention,
    retentionSamples: recent.length,
    streak,
    reviewedToday: todayLogs.length,
    correctToday: todayLogs.filter((l) => l.r !== Rating.Again).length,
    targetRetention: data.settings.retention,
  };
}

/* ───────────────────────── Sao lưu / reset ───────────────────────── */

export function exportProgress() {
  return { app: "VocaLearn", type: "srs-progress", version: 1, exportedAt: new Date().toISOString(), data };
}

export function importProgress(json) {
  const incoming = json?.data;
  if (!incoming || typeof incoming.cards !== "object") throw new Error("File không đúng định dạng tiến độ VocaLearn");
  data = { ...emptyData(), ...incoming, settings: { ...DEFAULT_SETTINGS, ...incoming.settings } };
  commit();
  return Object.keys(data.cards).length;
}

export function resetProgress() {
  data = { ...emptyData(), settings: data.settings };
  commit();
}
