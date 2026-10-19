import { useRef, useState } from "react";
import styles from "./SliderRow.module.css";

const SIZE = 64;
const R = 26;
const C = SIZE / 2;
const toRad = (deg) => (deg * Math.PI) / 180;
const px = (deg) => C + R * Math.sin(toRad(deg));
const py = (deg) => C - R * Math.cos(toRad(deg));
const arcPath = (a, b) =>
  `M ${px(a)} ${py(a)} A ${R} ${R} 0 ${b - a > 180 ? 1 : 0} 1 ${px(b)} ${py(b)}`;

/** Núm vặn tròn + ô nhập số. Kéo núm, gõ số, hoặc dùng phím mũi tên khi focus núm. */
export default function SliderRow({ label, min, max, value, disabled, onChange }) {
  const knobRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  // Chuỗi đang gõ dở; null = hiển thị theo `value` (không cần effect đồng bộ).
  const [draft, setDraft] = useState(null);

  const clamp = (n) => Math.max(min, Math.min(max, n));
  const pct = (value - min) / (max - min || 1);
  const angle = -135 + pct * 270;

  const updateFromPointer = (e) => {
    if (!knobRef.current || disabled) return;
    const rect = knobRef.current.getBoundingClientRect();
    let deg = (Math.atan2(e.clientY - (rect.top + rect.height / 2), e.clientX - (rect.left + rect.width / 2)) * 180) / Math.PI + 90;
    if (deg > 180) deg -= 360;
    const target = Math.max(-135, Math.min(135, deg));
    const next = Math.round(min + ((target + 135) / 270) * (max - min));
    if (next !== value) onChange(next);
  };

  const commitDraft = () => {
    if (draft === null) return;
    const n = parseInt(draft, 10);
    onChange(Number.isNaN(n) ? min : clamp(n));
    setDraft(null);
  };

  const onKnobKey = (e) => {
    const step = e.shiftKey ? 10 : 1;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(clamp(value + step));
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(clamp(value - step));
    else return;
    e.preventDefault();
  };

  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <div className={styles.controls}>
        <div
          ref={knobRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          className={`${styles.knob} ${dragging ? styles.dragging : ""} ${disabled ? styles.disabled : ""}`}
          onPointerDown={(e) => {
            if (disabled) return;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            updateFromPointer(e);
          }}
          onPointerMove={dragging ? updateFromPointer : undefined}
          onPointerUp={(e) => {
            setDragging(false);
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => setDragging(false)}
          onKeyDown={onKnobKey}
        >
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.svg}>
            <path d={arcPath(-135, 135)} className={styles.track} />
            {pct > 0 && <path d={arcPath(-135, angle)} className={styles.fill} />}
          </svg>
          <div className={styles.body}>
            <div className={styles.tick} style={{ transform: `rotate(${angle}deg)` }} />
            <div className={styles.dot} />
          </div>
        </div>

        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          disabled={disabled}
          aria-label={`${label} (nhập số)`}
          className={styles.input}
          value={draft ?? value}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n) && n >= min && n <= max && n !== value) onChange(n);
          }}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </div>
    </div>
  );
}
