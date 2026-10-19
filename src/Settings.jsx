import { useRef } from "react";
import { Plus, Shuffle, Download, Upload, Trash2, RefreshCw, Smartphone, Share, SquarePlus, CircleCheck, WifiOff, Keyboard, Target, Cat } from "lucide-react";
import { Button, RangeField, Section, Toggle } from "./components/ui";
import { cx } from "./lib/cx";
import { isIOS } from "./hooks/usePwa";

function Row({ children, className }) {
  return <div className={cx("card space-y-5 p-4", className)}>{children}</div>;
}

export default function Settings({
  total,
  plan,
  perDay,
  srsSettings,
  onSettings,
  prefs,
  onPref,
  busy,
  online,
  install,
  sw,
  pending,
  onAddNew,
  onShuffle,
  onSync,
  onExport,
  onImport,
  onReset,
}) {
  const importRef = useRef(null);
  const ios = isIOS();

  return (
    <div className="scroll-soft flex h-full flex-col gap-5 px-4 pt-1 pb-6">
      <Section title="Mục tiêu học" icon={<Target size={14} />}>
        <Row>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Tổng số từ", total],
              ["Đến hạn", plan.due.length],
              ["Chưa học", plan.remainingFresh],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-surface-2 py-2.5">
                <p className="font-display text-xl font-bold text-ink">{v}</p>
                <p className="text-[11px] font-medium text-muted">{k}</p>
              </div>
            ))}
          </div>
          <RangeField label="Từ mới mỗi ngày" min={0} max={100} value={perDay} onChange={(v) => onSettings({ newPerDay: v })} />
          <RangeField label="Giới hạn ôn mỗi ngày" min={10} max={500} step={10} value={srsSettings.reviewLimit} onChange={(v) => onSettings({ reviewLimit: v })} />
          <RangeField
            label="Mức nhớ mục tiêu"
            suffix="%"
            min={80}
            max={97}
            value={srsSettings.retention}
            onChange={(v) => onSettings({ retention: v })}
            hint="Cao hơn → ôn dày hơn. 90% là cân bằng tốt giữa thời gian ôn và khả năng nhớ."
          />
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onAddNew} disabled={!plan.remainingFresh}>
              <Plus size={16} /> 5 từ mới
            </Button>
            <Button onClick={onShuffle}>
              <Shuffle size={16} /> Xáo thứ tự
            </Button>
          </div>
        </Row>
      </Section>

      <Section title="Ứng dụng" icon={<Smartphone size={14} />}>
        <Row>
          {install.installed ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-good">
              <CircleCheck size={18} /> Đã cài VocaLearn trên thiết bị này
            </p>
          ) : install.canPrompt ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold">Cài VocaLearn như app</p>
                <p className="text-xs text-muted">Mở nhanh từ màn hình chính, học được cả khi offline.</p>
              </div>
              <Button variant="primary" onClick={install.promptInstall}>
                Cài app
              </Button>
            </div>
          ) : ios ? (
            <div className="text-sm">
              <p className="font-semibold">Cài lên iPhone / iPad</p>
              <ol className="mt-2 space-y-1.5 text-ink-2">
                <li className="flex items-center gap-2">
                  1. Mở trang này bằng <b>Safari</b>, bấm <Share size={16} className="text-info" /> <b>Chia sẻ</b>
                </li>
                <li className="flex items-center gap-2">
                  2. Chọn <SquarePlus size={16} className="text-info" /> <b>Thêm vào MH chính</b>
                </li>
              </ol>
            </div>
          ) : (
            <p className="text-sm text-muted">Trình duyệt đang dùng chưa hỗ trợ cài app. Hãy mở bằng Chrome, Edge hoặc Safari.</p>
          )}

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-medium text-ink-2">
              {online ? <CircleCheck size={16} className="text-good" /> : <WifiOff size={16} className="text-warn" />}
              {online ? (sw.offlineReady ? "Đã sẵn sàng dùng offline" : "Đang trực tuyến") : "Đang offline — kết quả sẽ gửi khi có mạng"}
            </span>
            {sw.needRefresh && (
              <Button size="sm" variant="primary" onClick={sw.update}>
                Cập nhật
              </Button>
            )}
          </div>

          <Toggle checked={prefs.showPet} onChange={(v) => onPref("showPet", v)} label="Mèo cảnh" hint="Chạm vào vùng trống để mèo chạy tới" />
          <Toggle checked={prefs.sounds} onChange={(v) => onPref("sounds", v)} label="Âm thanh đúng / sai" />
        </Row>
      </Section>

      <Section title="Dữ liệu & đồng bộ" icon={<RefreshCw size={14} />}>
        <Row>
          <Button variant="ghost" className="w-full" onClick={onSync} disabled={busy}>
            <RefreshCw size={16} className={busy ? "animate-spin" : ""} /> Đồng bộ với Google Sheets {pending ? `(${pending} đang chờ)` : ""}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={onExport}>
              <Download size={16} /> Xuất tiến độ
            </Button>
            <Button variant="ghost" onClick={() => importRef.current?.click()}>
              <Upload size={16} /> Nhập tiến độ
            </Button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onImport(f);
              }}
            />
          </div>
          <Button variant="danger" className="w-full" onClick={onReset} disabled={busy}>
            <Trash2 size={16} /> Reset toàn bộ tiến độ
          </Button>
        </Row>
      </Section>

      <Section title="Phím tắt (máy tính)" icon={<Keyboard size={14} />}>
        <div className="card grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 text-sm text-ink-2">
          {[
            ["← →", "Chuyển từ (Học)"],
            ["Space", "Lật thẻ"],
            ["P / Esc", "Phát tự động / dừng"],
            ["1 – 4", "Chọn đáp án (Ôn tập)"],
            ["H G E", "Chấm Khó / Tốt / Dễ"],
            ["Enter", "Câu tiếp theo"],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <kbd className="rounded-lg border border-line bg-surface-2 px-2 py-0.5 text-center font-display text-xs font-bold">{k}</kbd>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </Section>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs text-muted">
        <Cat size={14} /> VocaLearn · FSRS · PWA
      </p>
    </div>
  );
}
