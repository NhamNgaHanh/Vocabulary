// Hàng đợi đồng bộ kết quả học lên Google Apps Script.
// - Lưu trong localStorage nên không mất dữ liệu khi mất mạng / tải lại trang.
// - Gộp theo dòng: cùng một từ chỉ giữ trạng thái mới nhất.
// - Gửi tuần tự, lỗi thì dừng và thử lại khi có mạng hoặc sau 30 giây.
import { SCRIPT_URL, SCRIPT_TOKEN } from "./config";

const KEY = "vl-sync-queue-v1";
const RETRY_MS = 30_000;

const listeners = new Set();
let flushing = false;
let retryTimer = null;

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* private mode / hết dung lượng — vẫn giữ trong bộ nhớ của lần gọi này */
  }
  listeners.forEach((fn) => fn(items.length));
}

/** Gửi một lệnh tới Apps Script. Ném lỗi nếu mạng hỏng hoặc server báo lỗi. */
export async function postToScript(payload) {
  if (!SCRIPT_URL) throw new Error("Chưa cấu hình VITE_SCRIPT_URL");
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    // text/plain để là "simple request", tránh preflight CORS mà Apps Script không hỗ trợ.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, token: SCRIPT_TOKEN || undefined }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* script cũ có thể không trả JSON */
  }
  if (data && (data.ok === false || data.status === "error")) {
    throw new Error(data.message || "Apps Script báo lỗi");
  }
  return data;
}

/**
 * Thêm một lệnh vào hàng đợi rồi thử gửi ngay.
 * Gộp theo (action, dòng): cùng một từ chỉ giữ lệnh mới nhất của mỗi loại.
 */
export function enqueue(action, word, extra = {}) {
  const id = `${action}:${word.Row ?? word.Word}`;
  const items = read().filter((it) => (it.id ?? `updateStatus:${it.Row ?? it.Words}`) !== id);
  items.push({ id, action, Words: word.Word, Row: word.Row, ...extra, ts: Date.now() });
  write(items);
  flushQueue();
}

/** Cập nhật cột Status (C) — tương thích Apps Script cũ. */
export const enqueueStatus = (word, status) => enqueue("updateStatus", word, { Status: status });

export async function flushQueue() {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  flushing = true;
  clearTimeout(retryTimer);
  try {
    let items = read();
    while (items.length) {
      const head = items[0];
      // eslint-disable-next-line no-unused-vars
      const { id, ts, ...payload } = head;
      await postToScript({ action: "updateStatus", ...payload });
      // Đọc lại vì trong lúc chờ có thể đã có mục mới được thêm vào;
      // chỉ xoá đúng mục vừa gửi (nếu từ đó vừa được trả lời lại thì giữ mục mới).
      items = read().filter((it) => it.ts !== head.ts || it.id !== head.id);
      write(items);
    }
  } catch (err) {
    console.warn("[sync] tạm dừng, sẽ thử lại:", err.message);
    retryTimer = setTimeout(flushQueue, RETRY_MS);
  } finally {
    flushing = false;
  }
}

export const pendingCount = () => read().length;

/** Đăng ký nhận số mục đang chờ; trả về hàm huỷ đăng ký. */
export function subscribeQueue(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Xoá các mục đang chờ (dùng khi reset toàn bộ trạng thái). */
export function clearQueue() {
  write([]);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", flushQueue);
}
