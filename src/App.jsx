import { useState, useEffect } from 'react';
import axios from "axios";
import './App.css';
import Learn from "./Learn";
import Review from "./Review";

const styles = {
  app: {
    width: "100vw",
    height: "100dvh",
    maxWidth: "100%",
    maxHeight: "100dvh",
    background: "#0d0d1a",
    fontFamily: "'Be Vietnam Pro', 'Segoe UI', sans-serif",
    color: "#fff",
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
    // clamp: tối thiểu 8px, lý tưởng 1.5dvh, tối đa 14px
    padding: "clamp(8px, 1.5dvh, 14px) 16px clamp(4px, 0.8dvh, 8px)",
    flexShrink: 0,
  },
  appName: {
    fontFamily: "'Space Grotesk', sans-serif",
    // clamp font size theo chiều cao
    fontSize: "clamp(18px, 2.8dvh, 24px)",
    fontWeight: 700,
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: 1,
  },
  appSub: {
    fontSize: "clamp(8px, 1dvh, 10px)",
    color: "#5a5a8a",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 2,
  },
  streakBadge: {
    background: "linear-gradient(135deg, #ff7e4b, #e040fb)",
    borderRadius: 20,
    padding: "clamp(3px, 0.5dvh, 4px) 12px",
    fontSize: "clamp(10px, 1.4dvh, 12px)",
    fontWeight: 600,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    gap: 5,
  },

  tabsWrapper: {
    display: "flex",
    margin: "0 16px clamp(6px, 1.2dvh, 12px)",
    background: "#141428",
    borderRadius: 14,
    padding: 4,
    gap: 4,
    flexShrink: 0,
  },
  tabBtn: (active) => ({
    flex: 1,
    padding: "clamp(7px, 1dvh, 10px) 0",
    border: "none",
    borderRadius: 10,
    fontSize: "clamp(11px, 1.4dvh, 13px)",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Be Vietnam Pro', sans-serif",
    transition: "all 0.2s ease",
    background: active ? "#4c6ef5" : "transparent",
    color: active ? "#fff" : "#555575",
    boxShadow: active ? "0 4px 14px rgba(76,110,245,0.35)" : "none",
  }),

  // KEY: flex:1 + minHeight:0 để fill phần còn lại và không overflow
  content: {
    flex: 1,
    minHeight: 0,       // <-- quan trọng: cho phép co lại dưới nội dung min-content
    display: "flex",
    flexDirection: "column",
    width: "100%",
    overflow: "hidden",
  },

  statsBar: {
    display: "flex",
    gap: 8,
    padding: "0 16px clamp(6px, 1dvh, 12px)",
    flexShrink: 0,
  },
  statCard: () => ({
    flex: 1,
    background: "#141428",
    borderRadius: 12,
    padding: "clamp(6px, 1dvh, 10px) 8px",
    textAlign: "center",
    border: "1px solid #1e1e38",
  }),
  statNum: (accent) => ({
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "clamp(14px, 2dvh, 18px)",
    fontWeight: 700,
    color: accent,
    lineHeight: 1,
  }),
  statLabel: {
    fontSize: "clamp(7px, 0.9dvh, 9px)",
    color: "#44447a",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  toast: (type) => ({
    position: "fixed",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 9999,
    background: type === "success"
      ? "linear-gradient(135deg, #059669, #10b981)"
      : "linear-gradient(135deg, #dc2626, #ef4444)",
    color: "#fff",
    padding: "12px 24px",
    borderRadius: 14,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    minWidth: 240,
    textAlign: "center",
    fontSize: 14,
    fontWeight: 500,
  }),
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    flex: 1,
    minHeight: 0,
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #1e1e3f",
    borderTop: "3px solid #4c6ef5",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: "#5a5a8a", fontSize: 14 },
};

const injectStyles = () => {
  if (document.getElementById("app-keyframes")) return;
  const el = document.createElement("style");
  el.id = "app-keyframes";
  el.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes slideDown {
      from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    * { box-sizing: border-box; }
    body, html { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; }
  `;
  document.head.appendChild(el);
};

function App() {
  injectStyles();
  const [activeTab, setActiveTab] = useState("1");
  const [dataWord, setDataWord] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, type: "", message: "" });
  const [streak] = useState(7);

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
        const formattedData = res?.data?.values?.slice(1)?.map(row => ({
          Word: row[0], Meaning: row[1]
        })) || [];
        const shuffled = formattedData.sort(() => Math.random() - 0.5);
        setDataWord(shuffled);
        showToast("success", `Đã tải ${shuffled.length} từ vựng`);
      } catch (err) {
        showToast("error", "Không tải được dữ liệu");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div style={styles.app}>
      {toast.show && (
        <div style={{ ...styles.toast(toast.type), animation: "slideDown 0.3s ease" }}>
          {toast.message}
        </div>
      )}

      <div style={styles.header}>
        <div>
          <div style={styles.appName}>VocaLearn</div>
          <div style={styles.appSub}>Tiếng Anh mỗi ngày</div>
        </div>
        <div style={styles.streakBadge}>🔥 {streak} ngày</div>
      </div>

      {!loading && dataWord.length > 0 && (
        <div style={styles.statsBar}>
          <div style={styles.statCard()}>
            <div style={styles.statNum("#4c6ef5")}>{dataWord.length}</div>
            <div style={styles.statLabel}>Tổng từ</div>
          </div>
          <div style={styles.statCard()}>
            <div style={styles.statNum("#34d399")}>0</div>
            <div style={styles.statLabel}>Đã thuộc</div>
          </div>
          <div style={styles.statCard()}>
            <div style={styles.statNum("#fb923c")}>0</div>
            <div style={styles.statLabel}>Ôn lại</div>
          </div>
        </div>
      )}

      <div style={styles.tabsWrapper}>
        <button style={styles.tabBtn(activeTab === "1")} onClick={() => setActiveTab("1")}>
          📖 Học Từ Mới
        </button>
        <button style={styles.tabBtn(activeTab === "2")} onClick={() => setActiveTab("2")}>
          ✏️ Kiểm Tra
        </button>
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.loadingWrap}>
            <div style={styles.spinner} />
            <div style={styles.loadingText}>Đang tải từ vựng...</div>
          </div>
        ) : (
          <>
            {activeTab === "1" && <Learn words={dataWord} />}
            {activeTab === "2" && <Review words={dataWord} />}
          </>
        )}
      </div>
    </div>
  );
}

export default App;