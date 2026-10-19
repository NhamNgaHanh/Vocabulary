# Bảo vệ & nâng cấp Google Apps Script

App giờ gửi kèm mỗi request các trường sau (vẫn tương thích script cũ):

```json
{ "action": "updateStatus", "Words": "apple", "Row": 12, "Status": 1, "token": "<VITE_SCRIPT_TOKEN>" }
{ "action": "resetstatus", "token": "<VITE_SCRIPT_TOKEN>" }
{ "action": "updateCard", "Words": "apple", "Row": 12, "Card": "{\"due\":\"…\",\"stability\":…}", "token": "…" }  // chỉ khi bật VITE_SRS_SHEET_SYNC
```

Từ khi có FSRS, cột **Status** chỉ được gửi khi từ *đổi trạng thái*: `1` khi từ vào giai đoạn ôn dài hạn, `0` khi bị quên và phải học lại.

## 1. Bật kiểm tra token

1. Tạo một chuỗi ngẫu nhiên dài (vd. 32 ký tự) và đặt vào `VITE_SCRIPT_TOKEN` trong `.env.local`.
2. Trong Apps Script: **Project Settings → Script properties** → thêm `APP_TOKEN` = cùng chuỗi đó.
3. Thêm đoạn kiểm tra ở đầu `doPost`:

```js
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const expected = PropertiesService.getScriptProperties().getProperty('APP_TOKEN');
  if (expected && body.token !== expected) {
    return json({ ok: false, message: 'unauthorized' });
  }
  // ... xử lý action như cũ ...
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. **Deploy → Manage deployments → Edit → New version** (URL giữ nguyên).

## 2. Cập nhật theo số dòng thay vì tên từ

Tránh ghi nhầm khi có từ trùng tên:

```js
if (body.action === 'updateStatus') {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Sheet1');
  let row = Number(body.Row);
  if (!row || sheet.getRange(row, 1).getValue() !== body.Words) {
    // fallback: tìm theo tên như cũ
    const words = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    row = words.indexOf(body.Words) + 2;
  }
  if (row >= 2) sheet.getRange(row, 3).setValue(String(body.Status));
  return json({ ok: true });
}
```

Script trả `{ ok: false }` thì app giữ kết quả trong hàng đợi và thử lại sau.

## 3. (Tuỳ chọn) Đồng bộ lịch ôn FSRS lên Sheet — dùng nhiều thiết bị

Mặc định lịch ôn FSRS chỉ lưu **trên trình duyệt** (dùng *Cài đặt → Xuất/Nhập tiến độ* để chuyển máy).
Muốn điện thoại và máy tính dùng chung lịch ôn:

1. Đặt tiêu đề ô **L1** = `SRS` (cột L sẽ chứa JSON trạng thái FSRS của từng từ — không cần sửa tay).
2. Thêm nhánh `updateCard` vào `doPost`:

```js
if (body.action === 'updateCard') {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Sheet1');
  let row = Number(body.Row);
  if (!row || sheet.getRange(row, 1).getValue() !== body.Words) {
    const words = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    row = words.indexOf(body.Words) + 2;
  }
  if (row >= 2) sheet.getRange(row, 12).setValue(body.Card); // cột L
  return json({ ok: true });
}
```

3. Trong nhánh `resetstatus`, xoá luôn cột L:
   `sheet.getRange(2, 12, sheet.getLastRow() - 1, 1).clearContent();`
4. Deploy phiên bản mới, rồi đặt `VITE_SRS_SHEET_SYNC=1` trong `.env` và chạy lại app.

Khi tải dữ liệu, app so sánh `last_review` của bản trên Sheet và bản trên máy, bản nào mới hơn thì dùng.

## 4. Giới hạn API key Google Sheets

Google Cloud Console → **APIs & Services → Credentials** → chọn key →
- *Application restrictions*: **HTTP referrers** → `https://<username>.github.io/Vocabulary/*` và `http://localhost:5173/*`
- *API restrictions*: chỉ **Google Sheets API**

Key cũ đã nằm trong lịch sử git, nên tốt nhất **tạo key mới**, cập nhật `.env.local`, rồi xoá key cũ.
