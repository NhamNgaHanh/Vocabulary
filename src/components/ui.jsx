import { motion } from "framer-motion";
import { cx } from "../lib/cx";

const BTN = {
  primary:
    "bg-linear-to-br from-brand to-brand-2 text-white shadow-glow hover:brightness-105 disabled:opacity-50 disabled:shadow-none",
  soft: "bg-brand-soft text-brand-ink hover:brightness-[0.98] disabled:opacity-50",
  ghost: "bg-surface text-ink-2 border border-line hover:bg-surface-2 disabled:opacity-50",
  danger: "bg-bad-soft text-bad hover:brightness-[0.98] disabled:opacity-50",
  good: "bg-good-soft text-good hover:brightness-[0.98] disabled:opacity-50",
};

export function Button({ variant = "soft", size = "md", className, children, ...props }) {
  const sizes = {
    sm: "h-9 px-3 text-[13px] rounded-xl gap-1.5",
    md: "h-11 px-4 text-sm rounded-2xl gap-2",
    lg: "h-13 px-5 text-[15px] rounded-2xl gap-2",
  };
  return (
    <button
      type="button"
      className={cx("tap inline-flex items-center justify-center font-semibold select-none", sizes[size], BTN[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "tap relative inline-flex size-10 items-center justify-center rounded-2xl border border-line bg-surface text-ink-2 shadow-card hover:text-brand",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const CHIP = {
  brand: "bg-brand-soft text-brand-ink",
  good: "bg-good-soft text-good",
  bad: "bg-bad-soft text-bad",
  warn: "bg-warn-soft text-warn",
  info: "bg-info-soft text-info",
  neutral: "bg-surface-2 text-muted",
};

export function Chip({ tone = "neutral", className, children }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", CHIP[tone], className)}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, max = 100, tone = "brand", className }) {
  const pct = max ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const fill = { brand: "from-brand to-brand-2", good: "from-good to-good", warn: "from-warn to-warn" }[tone];
  return (
    <div className={cx("h-1.5 overflow-hidden rounded-full bg-surface-2", className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full bg-linear-to-r transition-[width] duration-500 ease-out", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Nút chọn dạng phân đoạn, viên nền trượt mượt giữa các lựa chọn. */
export function Segmented({ id, items, value, onChange, className }) {
  return (
    <div role="tablist" className={cx("inline-flex rounded-2xl bg-surface-2 p-1", className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={cx(
              "relative flex-1 rounded-xl px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors",
              active ? "text-ink" : "text-muted hover:text-ink-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-xl bg-surface shadow-card"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {it.label}
              {it.count != null && (
                <span className={cx("rounded-full px-1.5 text-[11px] font-bold font-display", active ? "bg-brand-soft text-brand-ink" : "bg-surface text-muted")}>
                  {it.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Thanh trượt + ô số; màu phần đã chọn chạy theo giá trị. */
export function RangeField({ label, hint, min, max, step = 1, value, onChange, suffix = "" }) {
  const fill = `${((value - min) / (max - min || 1)) * 100}%`;
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="rounded-lg bg-brand-soft px-2 py-0.5 font-display text-sm font-bold text-brand-ink tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range w-full"
        style={{ "--fill": fill }}
      />
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 text-left">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={cx("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-brand" : "bg-surface-2 border border-line")}>
        <motion.span
          className="absolute top-1 left-1 size-5 rounded-full bg-white shadow"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 35 }}
        />
      </span>
    </button>
  );
}

export function Section({ title, icon, children, className }) {
  return (
    <section className={cx("animate-fade-up", className)}>
      {title && (
        <h2 className="mb-2.5 flex items-center gap-2 px-1 text-[13px] font-bold tracking-wide text-muted uppercase">
          {icon}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
