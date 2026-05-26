import { useState, useEffect, useRef } from 'react';
import axios from "axios";
import dayjs from "dayjs";
import Learn from "./Learn";
import Review from "./Review";

// ─────────────────────────────────────────────────────────────────────────
// THEME & STYLES (Hệ thống thiết kế đồng nhất)
// ─────────────────────────────────────────────────────────────────────────
const THEME = {
  bgPage: "#090910",
  bgCard: "#111122",
  bgPanel: "#16162a",
  border: "#222244",
  accent: "#4c6ef5",
  accentGlow: "rgba(76, 110, 245, 0.25)",
  success: "#10b981",
  warning: "#f59e0b",
  textPrimary: "#f8fafc",
  textMuted: "#64748b",
  textDim: "#475569",
};

const styles = {
  app: {
    width: "100vw",
    height: "100dvh",
    maxWidth: "100%",
    background: THEME.bgPage,
    fontFamily: "'Be Vietnam Pro', 'Segoe UI', sans-serif",
    color: THEME.textPrimary,
    margin: "0",
    padding: "0",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxSizing: "border-box",
    position: "relative"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "clamp(12px, 2dvh, 20px) 20px clamp(6px, 1dvh, 12px)",
    flexShrink: 0,
  },
  logoArea: { display: "flex", flexDirection: "column" },
  appName: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "clamp(20px, 3dvh, 26px)",
    fontWeight: 800,
    background: `linear-gradient(135deg, #fff 30%, ${THEME.accent} 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    lineHeight: 1.1,
  },
  appSub: {
    fontSize: "clamp(9px, 1.1dvh, 11px)",
    color: THEME.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 4,
    fontWeight: 500,
  },
  rightHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10
  },
  streakBadge: {
    background: "linear-gradient(135deg, #ff6b6b, #ff8787)",
    borderRadius: 20,
    padding: "6px 14px",
    fontSize: "clamp(11px, 1.5dvh, 13px)",
    fontWeight: 700,
    boxShadow: "0 0 15px rgba(255,107,107,0.3)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  configBtn: {
    background: THEME.bgCard,
    border: `1px solid ${THEME.border}`,
    color: THEME.textPrimary,
    borderRadius: "50%",
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 18,
    transition: "all 0.2s",
  },
  statsBar: {
    display: "flex",
    gap: 12,
    padding: "0 20px clamp(10px, 1.5dvh, 16px)",
    flexShrink: 0,
  },
  statCard: (borderColor = THEME.border) => ({
    flex: 1,
    background: THEME.bgCard,
    borderRadius: 16,
    padding: "clamp(10px, 1.5dvh, 14px) 10px",
    textAlign: "center",
    border: `1px solid ${borderColor}`,
    transition: "all 0.2s ease",
    cursor: "pointer",
    userSelect: "none",
  }),
  statNum: (color) => ({
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "clamp(18px, 2.5dvh, 24px)",
    fontWeight: 700,
    color: color,
    lineHeight: 1,
  }),
  statLabel: {
    fontSize: "9px",
    color: THEME.textMuted,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: 600,
  },
  tabsWrapper: {
    display: "flex",
    margin: "0 20px clamp(10px, 1.5dvh, 16px)",
    background: THEME.bgCard,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    flexShrink: 0,
    border: `1px solid ${THEME.border}`,
  },
  tabBtn: (active) => ({
    flex: 1,
    padding: "clamp(10px, 1.3dvh, 14px) 0",
    border: "none",
    borderRadius: 10,
    fontSize: "clamp(12px, 1.6dvh, 14px)",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
    background: active ? THEME.accent : "transparent",
    color: active ? "#fff" : THEME.textMuted,
    boxShadow: active ? `0 4px 14px ${THEME.accentGlow}` : "none",
  }),
  content: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    width: "100%",
    overflow: "hidden",
  },
  toast: (type) => ({
    position: "fixed",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9999,
    background: type === "success" ? THEME.success : "#ef4444",
    color: "#fff",
    padding: "12px 24px",
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    fontSize: 14,
    fontWeight: 600,
  }),
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    flex: 1,
    background: THEME.bgPage,
  },
  spinner: {
    width: 40,
    height: 40,
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
    backgroundColor: "rgba(5, 5, 10, 0.8)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    background: THEME.bgPanel,
    border: `1px solid ${THEME.border}`,
    borderRadius: 24,
    width: "100%",
    maxWidth: 360,
    padding: 24,
    boxShadow: "0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: THEME.textPrimary },
  modalCloseBtn: {
    background: "transparent",
    border: "none",
    color: THEME.textMuted,
    fontSize: 20,
    cursor: "pointer",
    padding: 4,
  },
  modalFooterBtn: {
    width: "100%",
    padding: "12px 0",
    background: THEME.accent,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    marginTop: 20,
    boxShadow: `0 4px 12px ${THEME.accentGlow}`,
    transition: "opacity 0.2s",
  }
};

const injectStyles = () => {
  if (document.getElementById("app-global-styles")) return;
  const el = document.createElement("style");
  el.id = "app-global-styles";
  el.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes slideDown {
      from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes zoomIn {
      from { opacity: 0; transform: scale(0.95); }
      to   { opacity: 1; transform: scale(1); }
    }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body, html { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; background: ${THEME.bgPage}; }
  `;
  document.head.appendChild(el);
};

// Component Núm Vặn Tròn Slider
// Component Núm Vặn Tròn Slider (Nâng cấp)
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

  const trackColor = "#1f1f3d";
  const fillColor = isDragging ? "#748ffc" : THEME.accent;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 20,
      padding: "4px 0",
    }}>
      <span style={{
        fontSize: 13,
        color: THEME.textMuted,
        fontWeight: 500,
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
              strokeWidth={4}
              strokeLinecap="round"
            />
            {/* Fill arc */}
            {pct > 0 && (
              <path
                d={arcPath(-135, currentAngle)}
                fill="none"
                stroke={fillColor}
                strokeWidth={4}
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
            background: "linear-gradient(145deg, #1c1c38, #0f0f22)",
            border: `2px solid ${isDragging ? THEME.accent : "#252548"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isDragging
              ? `0 0 0 3px ${THEME.accentGlow}, inset 0 2px 4px rgba(0,0,0,0.5)`
              : "inset 0 2px 4px rgba(0,0,0,0.5)",
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
              background: "#0c0c18",
              border: `1.5px solid #2a2a50`,
            }} />
          </div>
        </div>

        {/* Ô NHẬP GIÁ TRỊ (Được chuyển đổi từ Div sang Input số thông minh) */}
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
            width: 64, // Tăng nhẹ độ rộng để vừa các số lớn (> 1000)
            background: THEME.bgCard,
            border: `1px solid ${isDragging ? THEME.accent : THEME.border}`,
            borderRadius: 10,
            padding: "7px 4px",
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
        Word: row[0], Meaning: row[1], Status: row[2]
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

  return (
    loading ? (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <div style={styles.loadingText}>Đang đồng bộ dữ liệu từ bộ nhớ...</div>
      </div>
    ) : (
      <div style={styles.app}>
        {toast.show && (
          <div style={{ ...styles.toast(toast.type), animation: "slideDown 0.3s ease" }}>
            {toast.message}
          </div>
        )}

        {/* Header Khu Vực */}
        <div style={styles.header}>
          <div style={styles.logoArea}>
            <div style={styles.appName}>VocaLearn</div>
            <div style={styles.appSub}>Học từ vựng thông minh</div>
          </div>
          <div style={styles.rightHeader}>
            <div style={styles.streakBadge}>🔥 {streak} Từ/Ngày</div>
            {/* Nút bấm mở thẻ cấu hình nổi */}
            <button 
              style={styles.configBtn} 
              onClick={() => setShowRangeModal(true)}
              title="Cấu hình mục tiêu"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Dashboard Thống Kê */}
        <div style={styles.statsBar}>
          <div style={styles.statCard(THEME.accent)} onClick={handleClickReset} title="Nhấn để reset trạng thái từ">
            <div style={styles.statNum(THEME.accent)}>{learningWords.length}</div>
            <div style={styles.statLabel}>🎯 Phạm vi học</div>
          </div>
          <div style={styles.statCard(showRangeModal ? THEME.accent : THEME.border)} onClick={() => setShowRangeModal(true)} >
            <div style={styles.statNum(THEME.success)}>{rememberedWords.length}</div>
            <div style={styles.statLabel}>💚 Đã thuộc</div>
          </div>
          <div style={styles.statCard()}>
            <div style={styles.statNum(THEME.warning)}>{nonRemembered.length}</div>
            <div style={styles.statLabel}>⚡ Chưa thuộc</div>
          </div>
        </div>

        {/* MODAL / THẺ NỔI CẤU HÌNH MỤC TIÊU (Được tách riêng tại đây) */}
        {showRangeModal && (
          <div style={styles.modalBackdrop} onClick={() => setShowRangeModal(false)}>
            <div 
              style={{ ...styles.modalContent, animation: "zoomIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }} 
              onClick={(e) => e.stopPropagation()} // Chặn tắt modal khi click vào bên trong panel
            >
              <div style={styles.modalHeader}>
                <span style={styles.modalTitle}>🎯 Cấu hình mục tiêu</span>
                <button style={styles.modalCloseBtn} onClick={() => setShowRangeModal(false)}>✕</button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.textMuted, marginBottom: 8 }}>
                <span>Tổng số từ khả dụng:</span>
                <span style={{ color: THEME.accent, fontWeight: 700 }}>{totalWords.length} Từ</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.textMuted }}>
                <span>Đang chọn hiển thị:</span>
                <span style={{ color: THEME.success, fontWeight: 700 }}>{learningWords.length} Từ</span>
              </div>

              <hr style={{ border: "none", borderTop: `1px solid ${THEME.border}`, margin: "16px 0 8px 0" }} />
              
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

              <button style={styles.modalFooterBtn} onClick={() => setShowRangeModal(false)}>
                Áp dụng cấu hình
              </button>
            </div>
          </div>
        )}

        {/* Hệ Thống Thanh Tab */}
        <div style={styles.tabsWrapper}>
          <button style={styles.tabBtn(activeTab === "1")} onClick={() => {setActiveTab("1")}}>
            📖 Học Từ Mới
          </button>
          <button style={styles.tabBtn(activeTab === "2")} onClick={() => {setActiveTab("2")}}>
            ✏️ Kiểm Tra
          </button>
        </div>

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
      </div>
    )
  );
}

export default App;