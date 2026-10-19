import { useEffect, useState, useSyncExternalStore } from "react";
import { srsStore, reviewWord, statusForCard, lastSentStatus, markStatusSent } from "../lib/srs";
import { enqueue, enqueueStatus } from "../lib/syncQueue";
import { SRS_SHEET_SYNC } from "../lib/config";

/** Re-render khi dữ liệu FSRS thay đổi (kể cả từ tab khác). Trả về số phiên bản. */
export const useSrsVersion = () => useSyncExternalStore(srsStore.subscribe, srsStore.getSnapshot, () => 0);

/** Thời gian hiện tại, tự cập nhật mỗi phút (để qua 4:00 sáng là sang ngày học mới). */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const onVisible = () => document.visibilityState === "visible" && setNow(new Date());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
  return now;
}

/**
 * Ghi một lần ôn vào FSRS và xếp hàng đồng bộ lên Google Sheet:
 * - cột C (Status) chỉ gửi khi đổi trạng thái (vào/ra giai đoạn ôn dài hạn);
 * - cột L (JSON FSRS) nếu bật VITE_SRS_SHEET_SYNC.
 */
export function recordReview(word, rating) {
  const res = reviewWord(word, rating);
  const status = statusForCard(res.card);
  if (status !== lastSentStatus(word)) {
    enqueueStatus(word, Number(status));
    markStatusSent(word, status);
  }
  if (SRS_SHEET_SYNC) enqueue("updateCard", word, { Card: JSON.stringify(res.stored) });
  return res;
}
