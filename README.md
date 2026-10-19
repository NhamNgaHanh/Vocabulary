# VocaLearn — Học từ vựng

App React + Vite học từ vựng tiếng Anh từ Google Sheets: flashcard lật thẻ, phát âm (Web Speech API), phát tự động, **ôn tập lặp lại ngắt quãng bằng FSRS** (`ts-fsrs`), thống kê và một chú mèo cảnh 🐱.

## Giao diện & PWA

- Giao diện viết bằng **Tailwind CSS v4** (token màu trong `src/index.css`, tự đổi sáng/tối theo hệ điều hành) + **framer-motion** cho chuyển cảnh, icon **lucide-react**.
- Là **PWA** (`vite-plugin-pwa` + Workbox): cài được lên màn hình chính, mở offline (giao diện, âm thanh, ảnh được cache sẵn; bộ từ lấy bản lưu gần nhất), kết quả ôn khi offline tự gửi lại khi có mạng.
- Khi có bản build mới, app hiện thông báo **"Có phiên bản mới — Cập nhật"** thay vì tự tải lại giữa lúc đang học.
- Cài app: *Cài đặt → Ứng dụng → Cài app* (Chrome/Edge/Android) hoặc Safari → Chia sẻ → *Thêm vào MH chính* (iPhone).
- Service worker chỉ chạy trên bản build (`npm run build && npm run preview`) hoặc GitHub Pages, không chạy ở `npm run dev`.

## Cách học với FSRS

- **Học Từ → Mới hôm nay**: xem trước các từ mới của hôm nay (số lượng = *Từ mới/ngày*, mặc định lấy ô E1).
- **Ôn Tập**: trắc nghiệm các từ *đến hạn* + từ mới. Kết quả được chấm thành mức FSRS:
  - sai → **Quên** (hỏi lại sau vài câu, rồi học lại),
  - đúng → **Tốt**, hoặc **Khó** nếu nghĩ quá 10 giây; có thể bấm chọn lại **Khó / Tốt / Dễ** (kèm lịch hẹn dự kiến).
- FSRS tự tính ngày ôn tiếp theo cho từng từ để giữ **mức nhớ mục tiêu** (mặc định 90%).
- Ngày học bắt đầu lúc **4:00 sáng**, nên học khuya vẫn tính vào hôm trước.
- Từ có `Status = 1` từ trước khi có FSRS được coi là "đã biết" và được rải lịch ôn trong 7 ngày đầu.
- Tiến độ lưu trên trình duyệt; *Cài đặt → Xuất/Nhập tiến độ* để sao lưu hoặc chuyển máy, hoặc bật đồng bộ cột L (xem APPS_SCRIPT.md).

## Cài đặt

```bash
npm install
cp .env.example .env.local   # điền Sheet ID, API key, URL Apps Script
npm run dev
```

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy dev server |
| `npm run lint` | ESLint (phải 0 lỗi) |
| `npm run build` | Build vào `dist/` |
| `npm run deploy` | Lint + build + đẩy lên GitHub Pages |

## Cấu trúc Google Sheet (`Sheet1`)

| Cột | A | B | C | E1 | F | G | H | I | K | L (tuỳ chọn) |
|---|---|---|---|---|---|---|---|---|---|---|
| Nội dung | Word | Meaning | Status (`1` = đang ôn dài hạn) | Từ mới/ngày mặc định | IPA | Ví dụ | Đồng nghĩa | Trái nghĩa | Định nghĩa (ngăn bằng `\|`) | JSON trạng thái FSRS |

Từ mới được giới thiệu theo **thứ tự dòng** trong Sheet. Ô D1 (ngày bắt đầu) không còn được dùng.

## Cấu trúc mã

```
src/
  App.jsx            khung app: header, tab bar, toast, đồng bộ
  Settings.jsx       tab Cài đặt (mục tiêu, cài app, dữ liệu)
  Learn.jsx          học từ mới (flashcard, phát tự động)
  Review.jsx         kiểm tra trắc nghiệm
  Stats.jsx          thống kê
  PetCat.jsx, PetEngine.js, PetStateMachine.js   mèo cảnh
  components/        ui.jsx (Button, Chip, Segmented, RangeField…), FitText
  hooks/usePwa.js    service worker, cài app, trạng thái mạng
  hooks/useVocabData.js   tải + cache (stale-while-revalidate)
  hooks/useSrs.js    kết nối kho FSRS với React + ghi kết quả ôn
  lib/srs.js         FSRS: lưu thẻ, hàng đợi hôm nay, thống kê, sao lưu
  lib/               config, vocab (parse Sheet), tts, sound, syncQueue, random
```

## Phím tắt

- **Học từ**: `←`/`→` chuyển từ · `Space`/`Enter` lật thẻ · `P` phát tự động · `Esc` dừng phát
- **Ôn tập**: `1`–`4` chọn đáp án · `Enter`/`→` câu tiếp · `H`/`G`/`E` = Khó/Tốt/Dễ sau khi trả lời đúng

## Bảo mật

Biến `VITE_*` vẫn nằm trong bundle khi build. Hãy **giới hạn API key theo HTTP referrer** trong Google Cloud Console và **bật token cho Apps Script** — xem [APPS_SCRIPT.md](APPS_SCRIPT.md).
