// Cấu hình đọc từ biến môi trường (.env.local — đã nằm trong .gitignore qua mẫu *.local).
// Lưu ý: mọi biến VITE_* vẫn được nhúng vào bundle khi build, nên API key bắt buộc
// phải được giới hạn theo HTTP referrer trong Google Cloud Console.
const env = import.meta.env;

export const SHEET_ID = env.VITE_SHEET_ID ?? "";
export const SHEETS_API_KEY = env.VITE_SHEETS_API_KEY ?? "";
export const SHEET_NAME = env.VITE_SHEET_NAME || "Sheet1";
export const SCRIPT_URL = env.VITE_SCRIPT_URL ?? "";
// Token bí mật gửi kèm mỗi request tới Apps Script (xem APPS_SCRIPT.md).
export const SCRIPT_TOKEN = env.VITE_SCRIPT_TOKEN ?? "";

// Bật để đồng bộ trạng thái FSRS lên cột L của Sheet (cần cập nhật Apps Script — xem APPS_SCRIPT.md).
export const SRS_SHEET_SYNC = /^(1|true|yes)$/i.test(env.VITE_SRS_SHEET_SYNC ?? "");

export const DEFAULT_WORDS_PER_DAY = 20;

/** Đường dẫn tới file trong /public, tự thêm `base` của Vite (vd. /Vocabulary/). */
export const publicUrl = (path) => `${env.BASE_URL}${path.replace(/^\//, "")}`;

export const isConfigured = Boolean(SHEET_ID && SHEETS_API_KEY);
