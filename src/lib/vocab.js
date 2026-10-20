import { SHEET_ID, SHEETS_API_KEY, SHEET_NAME, DEFAULT_WORDS_PER_DAY } from "./config";

const splitList = (s) => (s ? s.split("|").map((x) => x.trim()).filter(Boolean) : []);
const clean = (s) => (s == null ? "" : String(s).trim());

/** Chuyển dữ liệu thô của Sheets API thành danh sách từ + cài đặt. */
export function parseSheet(values = []) {
  const header = values[0] || [];
  const words = values
    .slice(1)
    .map((row, i) => ({
      Row: i + 2, // số dòng thật trong Google Sheet (dòng 1 là tiêu đề)
      Word: clean(row[0]),
      Meaning: clean(row[1]),
      Status: clean(row[2]),
      IPA: clean(row[5]).replace(/^\/+|\/+$/g, ""),
      Example: clean(row[6]),
      Synonyms: clean(row[7]),
      Antonyms: clean(row[8]),
      Notes: splitList(row[10]),
      Srs: clean(row[11]), // cột L: trạng thái FSRS dạng JSON (tuỳ chọn)
    }))
    .filter((w) => w.Word && w.Meaning);

  const perDay = parseInt(header[4], 10);
  return {
    words,
    settings: {
      wordsPerDay: Number.isFinite(perDay) && perDay > 0 ? perDay : DEFAULT_WORDS_PER_DAY,
    },
  };
}

export async function fetchVocab(signal) {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}` +
    `/values/${encodeURIComponent(SHEET_NAME)}?key=${encodeURIComponent(SHEETS_API_KEY)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error?.message ?? "";
    } catch {
      /* không phải JSON */
    }
    const hint =
      res.status === 403 && /unregistered callers/i.test(detail)
        ? "API key rỗng hoặc sai — kiểm tra VITE_SHEETS_API_KEY"
        : res.status === 403 && /referer/i.test(detail)
          ? "API key đang chặn tên miền này — thêm trang web vào HTTP referrers"
          : res.status === 403
            ? "không có quyền đọc Sheet — bật Google Sheets API và chia sẻ Sheet 'Bất kỳ ai có link'"
            : res.status === 400
              ? "API key không hợp lệ"
              : res.status === 404
                ? "sai VITE_SHEET_ID hoặc tên trang tính"
                : detail;
    throw new Error(`Sheets API ${res.status}: ${hint}`);
  }
  const data = await res.json();
  return parseSheet(data.values);
}

