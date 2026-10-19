import { CalendarClock, Sprout, CircleCheck, Flame, Brain, Cloud } from "lucide-react";
import { Section } from "./components/ui";
import { cx } from "./lib/cx";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function Tile({ icon, value, label, tone, delay = 0 }) {
  const tones = {
    brand: "bg-brand-soft text-brand",
    warn: "bg-warn-soft text-warn",
    good: "bg-good-soft text-good",
    info: "bg-info-soft text-info",
  };
  return (
    <div className="card animate-fade-up p-4" style={{ animationDelay: `${delay}s` }}>
      <div className={cx("mb-3 grid size-9 place-items-center rounded-xl", tones[tone])}>{icon}</div>
      <p className="font-display text-[26px] leading-none font-bold text-ink tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs font-medium text-muted">{label}</p>
    </div>
  );
}

/** Meter một màu: độ dài = số lượng; nhãn và số luôn hiển thị bằng chữ. */
function Meter({ label, hint, value, max }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-ink-2">
          {label} {hint && <span className="text-xs text-muted">{hint}</span>}
        </span>
        <b className="font-display text-ink tabular-nums">{value}</b>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Cột: số từ đến hạn 7 ngày tới (một chuỗi → không cần chú giải). */
function Forecast({ data }) {
  const peak = Math.max(0, ...data.map((d) => d.count));
  const max = Math.max(1, peak);
  const label = (d, i) => (i === 0 ? "Nay" : i === 1 ? "Mai" : WEEKDAYS[d.date.getDay()]);
  return (
    <div>
      <div className="grid h-36 grid-cols-7 items-end gap-0.5 border-b border-line" role="img" aria-label={data.map((d, i) => `${label(d, i)}: ${d.count} từ`).join(", ")}>
        {data.map((d, i) => (
          <div key={i} tabIndex={0} className="group relative flex h-full items-end justify-center outline-none">
            <span
              className={cx(
                "pointer-events-none absolute bottom-full mb-1 rounded-lg bg-ink px-2 py-1 text-[11px] whitespace-nowrap text-canvas opacity-0 shadow-pop transition group-hover:opacity-100 group-focus-visible:opacity-100",
                i === 0 ? "left-0" : i === 6 ? "right-0" : "left-1/2 -translate-x-1/2",
              )}
            >
              {d.date.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" })}: <b>{d.count}</b> từ
            </span>
            <div
              className={cx(
                "w-3/5 max-w-9 rounded-t-[4px] transition-[height,filter] duration-700 ease-out group-hover:brightness-110",
                d.count ? "bg-brand" : "bg-line",
              )}
              style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 text-center text-[11px] font-semibold text-muted">
        {data.map((d, i) => (
          <span key={i} className={i === 0 ? "font-bold text-ink" : ""}>
            {label(d, i)}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Cao nhất <b className="font-display text-ink-2">{peak}</b> từ/ngày · hôm nay <b className="font-display text-ink-2">{data[0].count}</b>
      </p>
    </div>
  );
}

export default function Stats({ stats, plan, total, pending, perDay }) {
  const { counts, forecast, retention, retentionSamples, streak, reviewedToday, correctToday, targetRetention } = stats;
  const started = total - counts.new;
  const retPct = retention == null ? null : Math.round(retention * 100);

  return (
    <div className="scroll-soft flex h-full flex-col gap-5 px-4 pt-1 pb-6">
      <Section title="Hôm nay">
        <div className="grid grid-cols-2 gap-3">
          <Tile icon={<CalendarClock size={18} />} value={plan.due.length} label="Đến hạn ôn" tone="brand" />
          <Tile icon={<Sprout size={18} />} value={plan.newToday.length} label={`Từ mới còn lại / ${perDay}`} tone="warn" delay={0.05} />
          <Tile
            icon={<CircleCheck size={18} />}
            value={reviewedToday}
            label={reviewedToday ? `Lượt ôn · đúng ${Math.round((correctToday / reviewedToday) * 100)}%` : "Lượt ôn"}
            tone="good"
            delay={0.1}
          />
          <Tile icon={<Flame size={18} />} value={streak} label="Chuỗi ngày học" tone="info" delay={0.15} />
        </div>
      </Section>

      <Section title="Lịch ôn 7 ngày tới">
        <div className="card p-4 pt-8">
          <Forecast data={forecast} />
        </div>
      </Section>

      <Section title={`Tiến độ bộ từ · ${started}/${total}`}>
        <div className="card space-y-4 p-4">
          <Meter label="Thuộc vững" hint="(ổn định ≥ 21 ngày)" value={counts.mature} max={total} />
          <Meter label="Đang ôn" value={counts.review} max={total} />
          <Meter label="Đang học" hint="(mới học / vừa quên)" value={counts.learning} max={total} />
          <Meter label="Chưa học" value={counts.new} max={total} />
          <div className="space-y-2 border-t border-line pt-3 text-sm text-ink-2">
            <p className="flex items-center gap-2">
              <Brain size={16} className="text-brand" />
              Tỉ lệ nhớ 30 ngày:{" "}
              {retPct == null ? (
                <b className="text-muted">chưa đủ dữ liệu</b>
              ) : (
                <b className={retPct >= targetRetention ? "text-good" : "text-warn"}>
                  {retPct}% / mục tiêu {targetRetention}%
                </b>
              )}
              {retentionSamples > 0 && <span className="text-xs text-muted">({retentionSamples} lượt)</span>}
            </p>
            <p className="flex items-center gap-2">
              <Cloud size={16} className="text-brand" />
              Đồng bộ: {pending ? <b className="text-warn">{pending} kết quả đang chờ</b> : <b className="text-good">đã gửi hết</b>}
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
