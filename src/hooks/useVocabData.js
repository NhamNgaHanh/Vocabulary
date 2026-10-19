import { useCallback, useEffect, useState } from "react";
import { fetchVocab } from "../lib/vocab";
import { isConfigured } from "../lib/config";

const CACHE_KEY = "vl-vocab-cache-v1";

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* bỏ qua */
  }
}

/**
 * Tải bộ từ theo kiểu stale-while-revalidate:
 * hiển thị ngay bản cache (nếu có) rồi cập nhật ngầm từ Google Sheets.
 * `version` chỉ tăng khi dữ liệu thực sự thay đổi.
 */
export function useVocabData() {
  const [state, setState] = useState(() => {
    const cached = readCache();
    return {
      words: cached?.words ?? [],
      settings: cached?.settings ?? { startDate: "", wordsPerDay: 20 },
      loading: !cached && isConfigured,
      refreshing: false,
      error: isConfigured ? null : "Chưa cấu hình VITE_SHEET_ID / VITE_SHEETS_API_KEY (xem .env.example)",
      fromCache: Boolean(cached),
      version: 0,
    };
  });
  const apply = useCallback((data) => {
    const sig = JSON.stringify(data);
    setState((s) => {
      const changed = sig !== JSON.stringify({ words: s.words, settings: s.settings });
      return {
        ...s,
        ...(changed ? { words: data.words, settings: data.settings, version: s.version + 1 } : {}),
        loading: false,
        refreshing: false,
        error: null,
        fromCache: false,
      };
    });
    writeCache(data);
  }, []);

  const fail = useCallback((err) => {
    if (err?.name === "AbortError") return;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    const message = offline || err instanceof TypeError ? "không có kết nối mạng" : err?.message || "lỗi tải dữ liệu";
    setState((s) => ({ ...s, loading: false, refreshing: false, error: message }));
  }, []);

  useEffect(() => {
    if (!isConfigured) return undefined;
    const ctrl = new AbortController();
    fetchVocab(ctrl.signal).then(apply, fail);
    return () => ctrl.abort();
  }, [apply, fail]);

  /** Tải lại thủ công (gọi từ event handler). */
  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, refreshing: true }));
    try {
      apply(await fetchVocab());
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  }, [apply, fail]);

  return { ...state, refresh };
}
