import { useState, useEffect, useRef } from 'react';
import axios from "axios";
import dayjs from "dayjs";
import Learn from "./Learn";
import Review from "./Review";
import PetCat from "./PetCat";

// ─────────────────────────────────────────────────────────────────────────
// THEME & STYLES (Hệ thống thiết kế Premium — Light / Glassmorphism 2026)
// ─────────────────────────────────────────────────────────────────────────
const THEME = {
  // Background gradient: trắng -> tím nhạt -> xanh nhạt
  bgGradient: "linear-gradient(160deg, #ffffff 0%, #f3eeff 45%, #eaf3ff 100%)",
  bgPage: "#f6f4ff",
  cardBg: "#ffffff",
  cardBgSoft: "rgba(255,255,255,0.78)",
  border: "rgba(124, 92, 255, 0.10)",
  borderSoft: "rgba(17, 17, 34, 0.06)",

  accent: "#7c5cff",
  accentDeep: "#5b3df0",
  accent2: "#4f7cff",
  accentGradient: "linear-gradient(135deg, #8f6bff 0%, #6f5bff 45%, #4f8bff 100%)",
  accentGlow: "rgba(124, 92, 255, 0.30)",

  success: "#19b37d",
  successSoft: "#e6f9f1",
  successGradient: "linear-gradient(135deg, #34e0a1 0%, #19b37d 100%)",

  warning: "#f5a524",
  warningSoft: "#fff5e3",

  danger: "#ff6b6b",
  dangerSoft: "#ffeef0",
  dangerGradient: "linear-gradient(135deg, #ff9d9d 0%, #ff6b6b 100%)",

  streakGradient: "linear-gradient(135deg, #ffb648 0%, #ff7d4d 100%)",
  streakGlow: "rgba(255, 125, 77, 0.35)",

  textPrimary: "#181230",
  textSecondary: "#3f3a5c",
  textMuted: "#8d89a8",
  textDim: "#b6b3cc",
};

const styles = {
  app: {
    width: "100vw",
    height: "100dvh",
    maxWidth: "100%",
    background: THEME.bgGradient,
    fontFamily: "'Be Vietnam Pro', 'Segoe UI', sans-serif",
    color: THEME.textPrimary,
    margin: "0",
    padding: "0",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxSizing: "border-box",
    position: "relative",
  },
  blobTop: {
    position: "absolute",
    top: -120,
    right: -90,
    width: 280,
    height: 280,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(143,107,255,0.35), rgba(143,107,255,0) 70%)",
    filter: "blur(10px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  blobBottom: {
    position: "absolute",
    bottom: -140,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(79,139,255,0.30), rgba(79,139,255,0) 70%)",
    filter: "blur(10px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "clamp(14px, 2.4dvh, 22px) 20px clamp(8px, 1.2dvh, 14px)",
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
  },
  logoArea: { display: "flex", flexDirection: "column" },
  appName: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "clamp(22px, 3.2dvh, 28px)",
    fontWeight: 800,
    letterSpacing: -0.5,
    background: `linear-gradient(135deg, ${THEME.textPrimary} 25%, ${THEME.accent} 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    lineHeight: 1.1,
  },
  appSub: {
    fontSize: "clamp(10px, 1.2dvh, 12px)",
    color: THEME.textMuted,
    letterSpacing: 0.4,
    marginTop: 4,
    fontWeight: 500,
  },
  rightHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  streakBadge: {
    background: THEME.streakGradient,
    borderRadius: 20,
    padding: "9px 16px",
    fontSize: "clamp(12px, 1.5dvh, 13px)",
    fontWeight: 700,
    color: "#fff",
    boxShadow: `0 8px 20px ${THEME.streakGlow}`,
    display: "flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  },
  configBtn: {
    background: "rgba(255,255,255,0.9)",
    border: `1px solid ${THEME.border}`,
    color: THEME.accent,
    borderRadius: "50%",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 17,
    boxShadow: "0 6px 16px rgba(124,92,255,0.18)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    flexShrink: 0,
  },
  statsBar: {
    display: "flex",
    gap: 10,
    padding: "4px 20px clamp(14px, 2dvh, 20px)",
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
  },
  statCard: (accentColor, bgTint, active) => ({
    flex: 1,
    background: bgTint || THEME.cardBg,
    borderRadius: 22,
    padding: "clamp(12px, 1.8dvh, 16px) 8px",
    textAlign: "center",
    border: active ? `1.5px solid ${accentColor}` : `1px solid ${THEME.borderSoft}`,
    boxShadow: active
      ? `0 10px 24px ${accentColor}33`
      : "0 6px 18px rgba(40, 30, 90, 0.06)",
    cursor: "pointer",
    userSelect: "none",
  }),
  statIcon: {
    fontSize: "clamp(15px, 2dvh, 18px)",
    marginBottom: 4,
    display: "block",
  },
  statNum: (color) => ({
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "clamp(17px, 2.4dvh, 22px)",
    fontWeight: 700,
    color: color,
    lineHeight: 1.1,
  }),
  statLabel: {
    fontSize: "9.5px",
    color: THEME.textMuted,
    marginTop: 2,
    fontWeight: 300,
  },
  tabsWrapper: {
    display: "flex",
    margin: "0 20px clamp(12px, 1.8dvh, 18px)",
    background: "rgba(255,255,255,0.65)",
    borderRadius: 18,
    padding: 5,
    gap: 4,
    flexShrink: 0,
    border: `1px solid ${THEME.border}`,
    boxShadow: "0 6px 18px rgba(40,30,90,0.05)",
    position: "relative",
    zIndex: 1,
  },
  tabBtn: (active) => ({
    flex: 1,
    padding: "clamp(11px, 1.4dvh, 14px) 0",
    border: "none",
    borderRadius: 14,
    fontSize: "clamp(12.5px, 1.6dvh, 14px)",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.3s cubic-bezier(0.4,0,0.2,1), color 0.3s, box-shadow 0.3s, transform 0.15s",
    background: active ? THEME.accentGradient : "transparent",
    color: active ? "#fff" : THEME.textMuted,
    boxShadow: active ? `0 8px 18px ${THEME.accentGlow}` : "none",
  }),
  content: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    width: "100%",
    overflow: "hidden",
    position: "relative",
    zIndex: 1,
  },
  toast: (type) => ({
    position: "fixed",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9999,
    background: type === "success" ? THEME.successGradient : THEME.dangerGradient,
    color: "#fff",
    padding: "13px 26px",
    borderRadius: 16,
    boxShadow: "0 16px 36px rgba(40,30,90,0.22)",
    fontSize: 14,
    fontWeight: 600,
  }),
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    flex: 1,
    background: THEME.bgGradient,
  },
  spinner: {
    width: 42,
    height: 42,
    border: `3px solid ${THEME.border}`,
    borderTop: `3px solid ${THEME.accent}`,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: THEME.textMuted, fontSize: 14, fontWeight: 500 },

  // STYLES DÀNH RIÊNG CHO MODAL NỔI
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(30, 20, 60, 0.28)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: `1px solid ${THEME.border}`,
    borderRadius: 28,
    width: "100%",
    maxWidth: 360,
    padding: 26,
    boxShadow: "0 30px 60px rgba(40,30,90,0.25), inset 0 1px 0 rgba(255,255,255,0.6)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 16.5, fontWeight: 800, color: THEME.textPrimary },
  modalCloseBtn: {
    background: THEME.bgPage,
    border: "none",
    color: THEME.textMuted,
    fontSize: 16,
    width: 30,
    height: 30,
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalFooterBtn: {
    width: "100%",
    padding: "14px 0",
    background: THEME.accentGradient,
    color: "#fff",
    border: "none",
    borderRadius: 16,
    fontWeight: 700,
    fontSize: 14.5,
    cursor: "pointer",
    marginTop: 22,
    boxShadow: `0 10px 24px ${THEME.accentGlow}`,
    transition: "transform 0.15s ease, box-shadow 0.2s ease",
  },

  // BOTTOM NAVIGATION (trang trí theo phong cách iOS — chưa gắn route thật)
  bottomNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    margin: 10,
    borderRadius: 20,
    padding: "10px 22px",
    paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: `1px solid ${THEME.border}`,
    flexShrink: 0,
    position: "relative",
    zIndex: 1,
  },
  navItem: (active) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    color: active ? THEME.accent : THEME.textDim,
    fontSize: 10.5,
    fontWeight: 600,
    flex: 1,
    cursor: "default",
  }),
  navIcon: { fontSize: 18, lineHeight: 1 },
  navCenterBtn: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: THEME.accentGradient,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    color: "#fff",
    boxShadow: `0 10px 22px ${THEME.accentGlow}`,
    marginTop: -26,
    border: "4px solid #fff",
    flexShrink: 0,
    cursor: "default",
  },
};

const injectStyles = () => {
  if (document.getElementById("app-global-styles")) return;
  const el = document.createElement("style");
  el.id = "app-global-styles";
  el.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes slideDown {
      from { opacity: 0; transform: translateX(-50%) translateY(-14px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes zoomIn {
      from { opacity: 0; transform: scale(0.92) translateY(8px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes floatY {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body, html { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; background: ${THEME.bgPage}; }

    .vl-fade-up { animation: fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) backwards; }
    .vl-float { animation: floatY 4.5s ease-in-out infinite; }

    .vl-stat-card { transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease; }
    .vl-stat-card:hover { transform: scale(1.03); }
    .vl-stat-card:active { transform: scale(0.97); }

    .vl-config-btn:hover { transform: rotate(25deg) scale(1.06); box-shadow: 0 8px 20px rgba(124,92,255,0.28); }
    .vl-config-btn:active { transform: scale(0.92); }

    .vl-tab-btn:active { transform: scale(0.97); }

    .vl-modal-footer-btn:hover { transform: translateY(-1px); box-shadow: 0 14px 30px rgba(124,92,255,0.4); }
    .vl-modal-footer-btn:active { transform: scale(0.97); }

    .vl-modal-close:hover { background: #eee9ff; color: #7c5cff; }

    .hide-arrows::-webkit-outer-spin-button,
    .hide-arrows::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .hide-arrows[type=number] { -moz-appearance: textfield; }
  `;
  document.head.appendChild(el);
};

// Component Núm Vặn Tròn Slider
// Component Núm Vặn Tròn Slider (Nâng cấp — phong cách pastel sáng)
function SliderRow({ label, min, max, value, disabled, onChange }) {
  const knobRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  // State cục bộ phục vụ việc gõ phím tạm thời (tránh bị nhảy số khi người dùng đang gõ dở)
  const [inputValue, setInputValue] = useState(value);

  // Đồng bộ lại inputValue khi value từ cha thay đổi (ví dụ do vặn núm)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const pct = (value - min) / (max - min || 1);
  const currentAngle = -135 + pct * 270;

  // Arc SVG params
  const SIZE = 64;
  const R = 26;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const polarX = (deg) => CX + R * Math.sin(toRad(deg));
  const polarY = (deg) => CY - R * Math.cos(toRad(deg));

  const arcPath = (startDeg, endDeg) => {
    const x1 = polarX(startDeg), y1 = polarY(startDeg);
    const x2 = polarX(endDeg),   y2 = polarY(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
  };

  // 1. Xử lý logic Xoay Núm Vặn
  const handlePointerMove = (e) => {
    if (!knobRef.current || disabled) return;
    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;
    const angleRad = Math.atan2(clientY - centerY, clientX - centerX);
    let angleDeg = angleRad * (180 / Math.PI) + 90;
    if (angleDeg > 180) angleDeg -= 360;
    if (angleDeg < -180) angleDeg += 360;
    let targetAngle = Math.max(-135, Math.min(135, angleDeg));
    const targetPct = (targetAngle + 135) / 270;
    const newValue = Math.round(min + targetPct * (max - min));
    if (newValue !== value) onChange(newValue);
  };

  const handlePointerDown = (e) => {
    if (disabled) return;
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try { e.target.releasePointerCapture(e.pointerId); } catch {}
  };

  // 2. Xử lý logic Nhập số trực tiếp từ Bàn phím
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val); // Cập nhật hiển thị text liên tục khi đang gõ

    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      // Ép số nằm trong phạm vi an toàn [min, max] trước khi báo lên cha
      const clamped = Math.max(min, Math.min(max, parsed));
      if (clamped !== value) {
        onChange(clamped);
      }
    }
  };

  // Khi người dùng click ra ngoài hoặc bấm Enter: Đảm bảo số hiển thị được chuẩn hóa sạch sẽ
  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < min) {
      onChange(min);
      setInputValue(min);
    } else if (parsed > max) {
      onChange(max);
      setInputValue(max);
    } else {
      setInputValue(parsed);
    }
  };

  const trackColor = "#ece8fb";
  const fillColor = isDragging ? THEME.accentDeep : THEME.accent;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 18,
      padding: "4px 0",
    }}>
      <span style={{
        fontSize: 13,
        color: THEME.textSecondary,
        fontWeight: 600,
        minWidth: 60,
      }}>
        {label}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Knob container */}
        <div
          ref={knobRef}
          onPointerDown={handlePointerDown}
          onPointerMove={isDragging ? handlePointerMove : undefined}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: SIZE,
            height: SIZE,
            position: "relative",
            cursor: disabled ? "not-allowed" : isDragging ? "grabbing" : "grab",
            opacity: disabled ? 0.4 : 1,
            touchAction: "none",
            flexShrink: 0,
          }}
        >
          {/* SVG Arc */}
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          >
            {/* Track arc */}
            <path
              d={arcPath(-135, 135)}
              fill="none"
              stroke={trackColor}
              strokeWidth={5}
              strokeLinecap="round"
            />
            {/* Fill arc */}
            {pct > 0 && (
              <path
                d={arcPath(-135, currentAngle)}
                fill="none"
                stroke={fillColor}
                strokeWidth={5}
                strokeLinecap="round"
                style={{ transition: isDragging ? "none" : "stroke 0.15s" }}
              />
            )}
          </svg>

          {/* Knob body */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "linear-gradient(145deg, #ffffff, #f3f1fd)",
            border: `2px solid ${isDragging ? THEME.accent : "#e6e2fa"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isDragging
              ? `0 0 0 4px ${THEME.accentGlow}, 0 2px 6px rgba(124,92,255,0.18)`
              : "0 2px 6px rgba(40,30,90,0.10)",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}>
            {/* Pointer tick */}
            <div style={{
              position: "absolute",
              width: 3,
              height: 12,
              background: fillColor,
              borderRadius: 99,
              top: "50%",
              marginTop: -12,
              transformOrigin: "50% 100%",
              transform: `rotate(${currentAngle}deg)`,
              transition: isDragging ? "none" : "background 0.15s",
            }} />
            {/* Center dot */}
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#fff",
              border: `1.5px solid #ddd8f5`,
            }} />
          </div>
        </div>

        {/* Ô NHẬP GIÁ TRỊ */}
        <input
          type="number"
          min={min}
          max={max}
          disabled={disabled}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleInputBlur();
              e.currentTarget.blur(); // Tự động bỏ focus khi ấn Enter
            }
          }}
          style={{
            width: 64,
            background: THEME.bgPage,
            border: `1.5px solid ${isDragging ? THEME.accent : THEME.border}`,
            borderRadius: 12,
            padding: "8px 4px",
            textAlign: "center",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            color: isDragging ? fillColor : THEME.textPrimary,
            lineHeight: 1,
            outline: "none",
            transition: "border-color 0.15s, color 0.15s, box-shadow 0.15s",
            WebkitAppearance: "none",
            MozAppearance: "textfield",
          }}
          // Tiện ích ẩn hai mũi tên lên/xuống mặc định của input number để giữ UI sạch đẹp
          className="hide-arrows"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// COMPONENT CHÍNH APP
// ─────────────────────────────────────────────────────────────────────────
function App() {
  useEffect(() => { injectStyles(); }, []);

  const [activeTab, setActiveTab] = useState("1");
  const [totalWords, setTotalWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, type: "", message: "" });
  const [streak, setStreak] = useState(0);
  
  const [rememberedWords, setRememberedWords] = useState([]);
  const [nonRemembered, setNonRemembered] = useState([]);
  const [learningWords, setLearningWords] = useState([]); 
  const [showRangeModal, setShowRangeModal] = useState(false); // <-- Quản lý ẩn hiện Modal dạng thẻ nổi
  
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  const loadCloudData = async (isFirstLoad = false) => {
    try {
      const sheetId = "18aKZQSaFWhP1yV-XJAKPLEt2dMPkgtHkXPo3PLppySQ";
      const apiKey = "AIzaSyCmL1B_6Lv3wu7OtUjVyLx3CufpckGZnW4";
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1?key=${apiKey}`;
      const res = await axios.get(url);
      
      const allWords = res?.data?.values?.slice(1)?.map(row => ({
        Word: row[0], Meaning: row[1], Status: row[2], IPA: row[5], Example: row[6], Synonyms: row[7], Antonyms: row[8], Notes: row[10] ? row[10].split("|").map(item => item.trim()): []
      })) || [];
      
      if (allWords.length === 0) return;

      setTotalWords(allWords);

      const today = dayjs();
      const startday = res?.data?.values?.[0]?.[3]
        ? dayjs(res.data.values[0][3], "DD/MM/YYYY")
        : dayjs();
      const rangeSize = res?.data?.values?.[0]?.[4] ? parseInt(res.data.values[0][4], 10) : 20;
      setStreak(rangeSize);
      const diffDays = today.diff(startday, "day");
      const startdayindex = diffDays * rangeSize;
      const enddayindex = startdayindex + rangeSize;

      const defaultStart = Math.max(1, Math.min(startdayindex + 1, allWords.length));
      const defaultEnd = Math.max(1, Math.min(enddayindex, allWords.length));
      setRangeStart(defaultStart);
      setRangeEnd(defaultEnd);
      const filtered = allWords.slice(defaultStart - 1, defaultEnd);
      setRememberedWords(filtered.filter(w => w.Status === "1"));
      setNonRemembered(filtered.filter(w => w.Status !== "1"));
      setLearningWords([...filtered].sort(() => Math.random() - 0.5));
      if (isFirstLoad) {
        showToast("success", `Hệ thống đã sẵn sàng với ${allWords.length} từ vựng`);
      }
    } catch (err) {
      showToast("error", "Không tải được dữ liệu từ Cloud");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCloudData(true);
  }, []);

  const startIdx = Math.max(1, Math.min(rangeStart, totalWords.length || 1));
  const endIdx = Math.max(startIdx, Math.min(rangeEnd, totalWords.length || 1));
  
  useEffect(() => {
    if (totalWords.length === 0) return;
    const filtered = totalWords.slice(startIdx - 1, endIdx);
    setRememberedWords(filtered.filter(w => w.Status === "1"));
    setNonRemembered(filtered.filter(w => w.Status !== "1"));
    setLearningWords([...filtered].sort(() => Math.random() - 0.5));
  }, [startIdx, endIdx, totalWords]);

  const handleClickReset = async () => {
    if(!window.confirm("Bạn muốn reset lại trạng thái học tập của dải từ này?")) return;
    setLoading(true);
    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbzBCRTzrGnN8-oGB1iF9a78F3r1AsPloNPGd_qipcx2qYkZQzB6j9batyMyAfTEpYEf/exec",
        {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "resetstatus" }),
        }
      );
      await response.json();
      showToast("success", "Đã khởi tạo lại trạng thái thành công");
    } catch (error) {
      console.error("Lỗi đồng bộ:", error);
      showToast("error", "Đồng bộ thất bại");
    } finally {
      loadCloudData();
    }
  };

  // Giá trị hiển thị thuần UI — tính trực tiếp từ dữ liệu sẵn có, không thêm state/logic mới
  const memorizedRate = learningWords.length > 0
    ? Math.round((rememberedWords.length / learningWords.length) * 100)
    : 0;

  return (
    loading ? (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <div style={styles.loadingText}>Đang đồng bộ dữ liệu từ bộ nhớ...</div>
      </div>
    ) : (
      <div style={styles.app}>
        <div style={styles.blobTop} />
        <div style={styles.blobBottom} />

        {toast.show && (
          <div style={{ ...styles.toast(toast.type), animation: "slideDown 0.3s ease" }}>
            {toast.message}
          </div>
        )}
        <PetCat />
        {/* Header Khu Vực */}
        <div style={styles.bottomNav}>
          {/* <div style={styles.logoArea}>
            <div style={styles.appName}>VocaLearn</div>
            <div style={styles.appSub}>Học từ vựng thông minh</div>
          </div>
          <div style={styles.rightHeader}>
            <div className="vl-float" style={styles.streakBadge}>🔥 {streak} Từ/Ngày</div>
            {/* Nút bấm mở thẻ cấu hình nổi */}
          {/*
            <button
              className="vl-config-btn"
              style={styles.configBtn}
              onClick={() => setShowRangeModal(true)}
              title="Cấu hình mục tiêu"
            >
              ⚙️
            </button>
          </div> */}
          {/* <div style={styles.bottomNav}> */}
            <div style={styles.navItem(true)}>
              <span style={styles.navIcon} onClick={() => { setActiveTab("1") }}>🏠</span>
              Học Từ
            </div>
            <div style={styles.navItem(false)}>
              <span style={styles.navIcon} onClick={() => { setActiveTab("2") }}>📚</span>
              Ôn Tập
            </div>
            <div style={styles.navCenterBtn}>✨</div>
            <div style={styles.navItem(false)}>
              <span style={styles.navIcon}>📊</span>
              Thống kê
            </div>
            <div style={styles.navItem(false)}>
              <span style={styles.navIcon} onClick={() => setShowRangeModal(true)} >⚙️</span>
              Cài đặt
            </div>
          {/* </div> */}
        </div>

        {/* Dashboard Thống Kê */}
        {/* <div style={styles.statsBar}>
          <div
            className="vl-stat-card vl-fade-up"
            style={{ ...styles.statCard(THEME.accent), animationDelay: "0.02s" }}
            onClick={handleClickReset}
            title="Nhấn để reset trạng thái từ"
          >
            <span style={styles.statIcon}>🎯</span>
            <div style={styles.statNum(THEME.accent)}>{learningWords.length}</div>
            <div style={styles.statLabel}>Phạm vi học</div>
          </div>

          <div
            className="vl-stat-card vl-fade-up"
            style={{ ...styles.statCard(THEME.success, THEME.successSoft, showRangeModal), animationDelay: "0.08s" }}
            onClick={() => setShowRangeModal(true)}
          >
            <span style={styles.statIcon}>✅</span>
            <div style={styles.statNum(THEME.success)}>{rememberedWords.length}</div>
            <div style={styles.statLabel}>Đã thuộc</div>
          </div>

          <div
            className="vl-stat-card vl-fade-up"
            style={{ ...styles.statCard(THEME.warning, THEME.warningSoft), animationDelay: "0.14s" }}
          >
            <span style={styles.statIcon}>⭕</span>
            <div style={styles.statNum(THEME.warning)}>{nonRemembered.length}</div>
            <div style={styles.statLabel}>Chưa thuộc</div>
          </div>

          <div
            className="vl-stat-card vl-fade-up"
            style={{ ...styles.statCard(THEME.accent2), animationDelay: "0.20s" }}
          >
            <span style={styles.statIcon}>📈</span>
            <div style={styles.statNum(THEME.accent2)}>{memorizedRate}%</div>
            <div style={styles.statLabel}>Tỉ lệ ghi nhớ</div>
          </div>
        </div> */}

        {/* MODAL / THẺ NỔI CẤU HÌNH MỤC TIÊU */}
        {showRangeModal && (
          <div style={styles.modalBackdrop} onClick={() => setShowRangeModal(false)}>
            <div
              style={{ ...styles.modalContent, animation: "zoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
              onClick={(e) => e.stopPropagation()} // Chặn tắt modal khi click vào bên trong panel
            >
              <div style={styles.modalHeader}>
                <span style={styles.modalTitle}>🎯 Cấu hình mục tiêu</span>
                <button className="vl-modal-close" style={styles.modalCloseBtn} onClick={() => setShowRangeModal(false)}>✕</button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: THEME.textMuted, marginBottom: 8 }}>
                <span>Tổng số từ khả dụng:</span>
                <span style={{ color: THEME.accent, fontWeight: 700 }}>{totalWords.length} Từ</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: THEME.textMuted }}>
                <span>Đang chọn hiển thị:</span>
                <span style={{ color: THEME.success, fontWeight: 700 }}>{learningWords.length} Từ</span>
              </div>

              <hr style={{ border: "none", borderTop: `1px solid ${THEME.borderSoft}`, margin: "18px 0 6px 0" }} />

              <SliderRow
                label="Từ số:"
                min={1}
                max={totalWords.length || 1}
                value={startIdx}
                onChange={(v) => {
                  setRangeStart(v);
                  if (v > endIdx) setRangeEnd(v);
                }}
              />

              <SliderRow
                label="Đến số:"
                min={1}
                max={totalWords.length || 1}
                value={endIdx}
                onChange={(v) => {
                  setRangeEnd(v);
                  if (v < startIdx) setRangeStart(v);
                }}
              />
              <div style={styles.statsBar}>
                <div
                  className="vl-stat-card vl-fade-up"
                  style={{ ...styles.statCard(THEME.accent), animationDelay: "0.02s" }}
                  onClick={handleClickReset}
                  title="Nhấn để reset trạng thái từ"
                >
                  <span style={styles.statIcon}>🎯</span>
                  <div style={styles.statNum(THEME.accent)}>{learningWords.length}</div>
                  <div style={styles.statLabel}>Phạm vi học</div>
                </div>

                <div
                  className="vl-stat-card vl-fade-up"
                  style={{ ...styles.statCard(THEME.success, THEME.successSoft, showRangeModal), animationDelay: "0.08s" }}
                  onClick={() => setShowRangeModal(true)}
                >
                  <span style={styles.statIcon}>✅</span>
                  <div style={styles.statNum(THEME.success)}>{rememberedWords.length}</div>
                  <div style={styles.statLabel}>Đã thuộc</div>
                </div>

                <div
                  className="vl-stat-card vl-fade-up"
                  style={{ ...styles.statCard(THEME.warning, THEME.warningSoft), animationDelay: "0.14s" }}
                >
                  <span style={styles.statIcon}>⭕</span>
                  <div style={styles.statNum(THEME.warning)}>{nonRemembered.length}</div>
                  <div style={styles.statLabel}>Chưa thuộc</div>
                </div>

                <div
                  className="vl-stat-card vl-fade-up"
                  style={{ ...styles.statCard(THEME.accent2), animationDelay: "0.20s" }}
                >
                  <span style={styles.statIcon}>📈</span>
                  <div style={styles.statNum(THEME.accent2)}>{memorizedRate}%</div>
                  <div style={styles.statLabel}>Tỉ lệ ghi nhớ</div>
                </div>
              </div>
              <button className="vl-modal-footer-btn" style={styles.modalFooterBtn} onClick={() => setShowRangeModal(false)}>
                Áp dụng cấu hình
              </button>


            </div>
          </div>
        )}

        {/* Hệ Thống Thanh Tab (Segmented control kiểu iOS) */}
        {/* <div style={styles.tabsWrapper}>
          <button className="vl-tab-btn" style={styles.tabBtn(activeTab === "1")} onClick={() => { setActiveTab("1") }}>
            📖 Học Từ Mới
          </button>
          <button className="vl-tab-btn" style={styles.tabBtn(activeTab === "2")} onClick={() => { setActiveTab("2") }}>
            ✏️ Kiểm Tra
          </button>
        </div> */}

        {/* Khu Vực Hiển Thị Thẻ Học */}
        <div style={styles.content}>
          {activeTab === "1" && (
            <Learn key={`learn-${startIdx}-${endIdx}`} words={learningWords} />
          )}
          {activeTab === "2" && (
            <Review
              key={`review-${startIdx}-${endIdx}`}
              words={nonRemembered}
              setWords={setNonRemembered}
              remember={rememberedWords}
              setRememberedWords={setRememberedWords}
            />
          )}
        </div>

        {/* Bottom Navigation kiểu iOS — trang trí, chưa gắn routing thật */}
        {/* <div style={styles.bottomNav}>
          <div style={styles.navItem(true)}>
            <span style={styles.navIcon} onClick={() => { setActiveTab("1") }}>🏠</span>
            Học Từ
          </div>
          <div style={styles.navItem(false)}>
            <span style={styles.navIcon} onClick={() => { setActiveTab("2") }}>📚</span>
            Ôn Tập
          </div>
          <div style={styles.navCenterBtn}>✨</div>
          <div style={styles.navItem(false)}>
            <span style={styles.navIcon}>📊</span>
            Thống kê
          </div>
          <div style={styles.navItem(false)}>
            <span style={styles.navIcon}>⚙️</span>
            Cài đặt
          </div>
        </div> */}
      </div>
    )
  );
}

export default App;
