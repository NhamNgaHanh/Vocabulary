import { useState, useEffect } from 'react';
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
    transition: "all 0.25s ease",
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
  rangePanel: {
    background: THEME.bgPanel,
    borderTop: `1px solid ${THEME.border}`,
    borderBottom: `1px solid ${THEME.border}`,
    padding: "12px 20px",
    margin: "0 0 12px 0",
    flexShrink: 0,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  panelLabel: { fontSize: 12, fontWeight: 600, color: THEME.textMuted },
  panelBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: THEME.accent,
    background: THEME.accentGlow,
    padding: "3px 8px",
    borderRadius: 6,
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
};

// Inject Global CSS phục vụ Animation và Custom Range Slider
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
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body, html { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; background: ${THEME.bgPage}; }
    input[type="range"] {
      -webkit-appearance: none; width: 100%; height: 6px; background: ${THEME.border}; borderRadius: 3px; outline: none;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: ${THEME.accent}; cursor: pointer; transition: transform 0.1s;
    }
    input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.2); }
  `;
  document.head.appendChild(el);
};

// Component Slider cải tiến giao diện gọn gàng hơn
function SliderRow({ label, min, max, value, disabled, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
      <span style={{ fontSize: 12, color: THEME.textMuted, width: 50, flexShrink: 0, fontWeight: 500 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span style={{ fontSize: 13, fontWeight: 700, color: THEME.textPrimary, width: 30, textAlign: "right", flexShrink: 0 }}>
        {value}
      </span>
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
  const [streak] = useState(7);
  const [rememberedWords, setRememberedWords] = useState([]);
  const [nonRemembered, setNonRemembered] = useState([]);
  const [LearningWords, setLearningWords] = useState(0);
  const [startdayindex, setStartdayindex] = useState(0);
  const [showRange, setShowRange] = useState(false);
  // Phân đoạn Range Slider học tập
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sheetId = "18aKZQSaFWhP1yV-XJAKPLEt2dMPkgtHkXPo3PLppySQ";
        const apiKey = "AIzaSyCmL1B_6Lv3wu7OtUjVyLx3CufpckGZnW4";
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1?key=${apiKey}`;
        const res = await axios.get(url);
        
        const allWords = res?.data?.values?.slice(1)?.map(row => ({
          Word: row[0], Meaning: row[1], Status: row[2]
        })) || [];
        setTotalWords(allWords);
        setRangeStart(1);
        setRangeEnd(allWords.length || 1);
        const today = dayjs();
        const startday = res?.data?.values?.[0]?.[3]
          ? dayjs(res.data.values[0][3], "DD/MM/YYYY")
          : dayjs();
        const diffDays = today.diff(startday, "day");
        const startdayindex = (diffDays * 20);
        const enddayindex = startdayindex + 20;
        setRangeStart(Math.max(1, Math.min(startdayindex, allWords.length)));
        setRangeEnd(Math.max(1, Math.min(enddayindex, allWords.length)));
        const formattedData = res?.data?.values?.slice(1+ diffDays * 20, 1 + (diffDays + 1) * 20)?.map(row => ({
          Word: row[0], Meaning: row[1], Status: row[2]
        })) || [];
        const rememberedWords = formattedData.filter(w => w.Status === "1");
        setRememberedWords(rememberedWords);
        const nonRemembered = formattedData.filter(w => w.Status !== "1");
        setNonRemembered(nonRemembered);
        const shuffled = formattedData.sort(() => Math.random() - 0.5);
        setLearningWords(shuffled);
        showToast("success", `Hệ thống đã sẵn sàng với ${allWords.length} từ vựng`);
      } catch (err) {
        showToast("error", "Không tải được dữ liệu từ Cloud");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  const handfetchData = async () => {
    setLoading(true);
    try {
      const sheetId = "18aKZQSaFWhP1yV-XJAKPLEt2dMPkgtHkXPo3PLppySQ";
      const apiKey = "AIzaSyCmL1B_6Lv3wu7OtUjVyLx3CufpckGZnW4";
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1?key=${apiKey}`;
      const res = await axios.get(url);
      
      const allWords = res?.data?.values?.slice(1)?.map(row => ({
        Word: row[0], Meaning: row[1], Status: row[2]
      })) || [];
      setTotalWords(allWords);
      setRangeStart(1);
      setRangeEnd(allWords.length || 1);
      const today = dayjs();
        const startday = res?.data?.values?.[0]?.[3]
          ? dayjs(res.data.values[0][3], "DD/MM/YYYY")
          : dayjs();
        const diffDays = today.diff(startday, "day");
        const startdayindex = (diffDays * 20);
      const enddayindex = startdayindex + 20;
      setRangeStart(Math.max(1, Math.min(startdayindex, allWords.length)));
      setRangeEnd(Math.max(1, Math.min(enddayindex, allWords.length)));
        const formattedData = res?.data?.values?.slice(1+ diffDays * 20, 1 + (diffDays + 1) * 20)?.map(row => ({
          Word: row[0], Meaning: row[1], Status: row[2]
        })) || [];
        const rememberedWords = formattedData.filter(w => w.Status === "1");
        setRememberedWords(rememberedWords);
        const nonRemembered = formattedData.filter(w => w.Status !== "1");
        setNonRemembered(nonRemembered);
        const shuffled = formattedData.sort(() => Math.random() - 0.5);
        setLearningWords(shuffled);
      showToast("success", `Hệ thống đã sẵn sàng với ${allWords.length} từ vựng`);
    } catch (err) {
      showToast("error", "Không tải được dữ liệu từ Cloud");
    } finally {
      setLoading(false);
    }
  };
  // Tính toán danh sách lọc động dựa trên vị trí thanh Slider
  const startIdx = Math.max(1, Math.min(rangeStart, totalWords.length || 1));
  const endIdx = Math.max(startIdx, Math.min(rangeEnd, totalWords.length || 1));
  useEffect(() => {
    const filtered = totalWords.slice(startIdx - 1, endIdx);
    setRememberedWords(filtered.filter(w => w.Status === "1"));
    setNonRemembered(filtered.filter(w => w.Status !== "1"));
    setLearningWords(filtered.sort(() => Math.random() - 0.5));
  }, [startIdx, endIdx]);


  // Thống kê phân nhóm dựa trên dải dữ liệu người dùng lựa chọn lọc
  // const rememberedWords = visibleWords.filter(w => w.Status === "1");
  // const nonRemembered = visibleWords.filter(w => w.Status !== "1");

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
      setLoading(false);
      handfetchData();
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
          <div style={styles.streakBadge}>🔥 {streak} NGÀY</div>
        </div>

        {/* Dashboard Thống Kê */}
        <div style={styles.statsBar}>
          <div style={styles.statCard(THEME.accent)} onClick={handleClickReset} title="Nhấn để reset trạng thái từ">
            <div style={styles.statNum(THEME.accent)}>{LearningWords.length}</div>
            <div style={styles.statLabel}>🎯 Phạm vi học</div>
          </div>
          <div style={styles.statCard()} onClick={() => setShowRange(prev => !prev)} >
            <div style={styles.statNum(THEME.success)}>{rememberedWords.length}</div>
            <div style={styles.statLabel}>💚 Đã thuộc</div>
          </div>
          <div style={styles.statCard()}>
            <div style={styles.statNum(THEME.warning)}>{nonRemembered.length}</div>
            <div style={styles.statLabel}>⚡ Chưa thuộc</div>
          </div>
        </div>

        {/* Bảng Điều Khiển Khoảng Lọc */}
        <div style={{ ...styles.rangePanel, display: !showRange ? "none" : "block", }}>
          <div style={styles.panelHeader}>
            <span style={styles.panelLabel}>Cấu hình mục tiêu học tập</span>
            <span style={styles.panelBadge}>
              Hiển thị: {LearningWords.length} / {totalWords.length} Từ
            </span>
          </div>
          <SliderRow
            label="Từ số:"
            min={1} 
            max={totalWords.length || 1} 
            value={startIdx}
            onChange={(v) => {
              setRangeStart(v);
              if (v > endIdx) {
                setRangeEnd(v);
              }
            }}
          />
          
          {/* Thanh kéo chọn điểm kết thúc */}
          <SliderRow
            label="Đến số:"
            min={1}
            max={totalWords.length || 1} 
            value={endIdx}
            onChange={(v) => {
              setRangeEnd(v);
              if (v < startIdx) {
                setRangeStart(v);
              }
            }}
          />
        </div>

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
        {/* MẸO: Sử dụng key gắn liền với khoảng filter giúp các component con tự động reset vị trí index về 0 khi kéo thanh cuộn */}
        <div style={styles.content}>
          {activeTab === "1" && (
            <Learn key={`learn-${startIdx}-${endIdx}`} words={LearningWords} />
          )}
          {activeTab === "2" && (
            <Review key={`review-${startIdx}-${endIdx}`} words={nonRemembered} setWords={setNonRemembered} remember={rememberedWords} setRememberedWords={setRememberedWords} />
          )}
        </div>
      </div>
    )
  );
}

export default App;