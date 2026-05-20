import { useState, useEffect, useRef, useLayoutEffect } from "react";

function useFitText({ maxFontSize = 48, minFontSize = 16, deps = [] } = {}) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    function resizeToFit() {
      if (!containerRef.current || !textRef.current) return;
      let size = maxFontSize;
      while (size >= minFontSize) {
        textRef.current.style.fontSize = size + "px";
        textRef.current.style.lineHeight = "1.2";
        const textRect = textRef.current.getBoundingClientRect();
        const boxRect = containerRef.current.getBoundingClientRect();
        // Giảm bớt padding ảo khi tính toán kích thước chữ để tối ưu không gian màn hình nhỏ
        if (textRect.width <= boxRect.width - 24 && textRect.height <= boxRect.height - 24) break;
        size -= 2;
      }
      setFontSize(size);
    }
    resizeToFit();
    window.addEventListener("resize", resizeToFit);
    return () => window.removeEventListener("resize", resizeToFit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxFontSize, minFontSize, ...deps]);

  return { containerRef, textRef, fontSize };
}

const COLORS = {
  // Giữ nguyên bảng màu gốc nhưng bổ sung màu nền tối đồng bộ theme hệ thống
  bgDark:     "#141428",
  borderDark: "#1e1e38",
  purple50:   "#EEEDFE",
  purple200:  "#AFA9EC",
  purple600:  "#534AB7",
  purple700:  "#3C3489",
  teal50:     "#E1F5EE",
  teal100:    "#9FE1CB",
  teal700:    "#085041",
  teal800:    "#04342C",
  gray50:     "#F8F9FA",
  gray100:    "#F1F0EC",
  gray200:    "#E2E0D9",
  gray400:    "#9B9890",
  gray600:    "#5F5E5A",
  gray800:    "#2C2C2A",
  white:      "#FFFFFF",
};

export default function Learn({ words = [] }) {
  const [index, setIndex]           = useState(0);
  const [isFlipped, setIsFlipped]   = useState(false);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [isPaused, setIsPaused]     = useState(false);
  const [phase, setPhase]           = useState("en"); 
  
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd]     = useState(words.length || 1);

  const timeoutsRef   = useRef([]);
  const isPlayingRef  = useRef(false);
  const isPausedRef   = useRef(false);

  useEffect(() => { isPlayingRef.current  = isPlaying;  }, [isPlaying]);
  useEffect(() => { isPausedRef.current   = isPaused;   }, [isPaused]);

  useEffect(() => {
    setRangeStart(1);
    setRangeEnd(words.length || 1);
    setIndex(0);
    setIsFlipped(false);
  }, [words]);

  const totalWords = words.length;
  const startIdx = Math.max(1, Math.min(rangeStart, totalWords || 1));
  const endIdx = Math.max(startIdx, Math.min(rangeEnd, totalWords || 1));

  const visibleWords = totalWords > 0 ? words.slice(startIdx - 1, endIdx) : [];
  const currentWord = visibleWords[index] ?? { Word: "", Meaning: "" };

  const { containerRef: frontRef, textRef: frontTextRef, fontSize: frontSize } =
    useFitText({ maxFontSize: 38, minFontSize: 16, deps: [index, visibleWords.length] });
  const { containerRef: backRef,  textRef: backTextRef,  fontSize: backSize  } =
    useFitText({ maxFontSize: 38, minFontSize: 16, deps: [index, visibleWords.length] });

  const progressPct = visibleWords.length > 0 ? ((index + 1) / visibleWords.length) * 100 : 0;
  const cardFlipped = isPlaying ? (phase === "vi" || phase === "fade") : isFlipped;

  const speak = (text, lang = "en-US") => {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const clearAll = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const estDur = (text) => Math.max(text.length * 80 + 800, 1200);

  const playWordCycle = (pos) => {
    if (!isPlayingRef.current || isPausedRef.current) return;
    const w = visibleWords[pos];
    if (!w) return;
    const enDur = estDur(w.Word);
    const viDur = Math.min(estDur(w.Meaning), 2800);

    setPhase("en");
    speak(w.Word, "en-US");

    const t1 = setTimeout(() => {
      if (!isPlayingRef.current || isPausedRef.current) return;
      setPhase("vi");
      speak(w.Meaning, "vi-VN");
    }, enDur);

    const t2 = setTimeout(() => {
      if (!isPlayingRef.current || isPausedRef.current) return;
      setPhase("fade");
    }, enDur + viDur);

    const t3 = setTimeout(() => {
      if (!isPlayingRef.current || isPausedRef.current) return;
      if (pos >= visibleWords.length - 1) { stopPlay(); return; }
      const next = pos + 1;
      setIndex(next);
      setPhase("en");
      playWordCycle(next);
    }, enDur + viDur + 400);

    timeoutsRef.current.push(t1, t2, t3);
  };

  const startPlay = () => {
    clearAll();
    setIndex(0); setIsFlipped(false); setIsPaused(false);
    setIsPlaying(true);
    setTimeout(() => {
      if (isPlayingRef.current && !isPausedRef.current) playWordCycle(0);
    }, 0);
  };

  const pausePlay = () => {
    setIsPaused(true);
    clearAll();
    window.speechSynthesis.cancel();
  };

  const resumePlay = () => {
    setIsPaused(false);
    setTimeout(() => {
      if (isPlayingRef.current && !isPausedRef.current) playWordCycle(index);
    }, 0);
  };

  const stopPlay = () => {
    setIsPlaying(false); setIsPaused(false);
    clearAll();
    window.speechSynthesis.cancel();
    setPhase("en"); setIsFlipped(false);
  };

  const prevWord = () => {
    setIndex((p) => (p - 1 < 0 ? visibleWords.length - 1 : p - 1));
    setIsFlipped(false);
  };

  const nextWord = () => {
    setIndex((p) => (p + 1 >= visibleWords.length ? 0 : p + 1));
    setIsFlipped(false);
  };

  useEffect(() => { if (!isPlaying) clearAll(); return clearAll; }, [isPlaying]);

  if (!words || words.length === 0) {
    return (
      <div style={S.root}>
        <div style={S.shell}>
          <div style={{ textAlign: "center", padding: "32px 0", color: COLORS.gray400 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📘</div>
            <p style={{ fontWeight: 600 }}>Chưa có dữ liệu từ vựng</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.root}>
      <div style={S.shell}>

        {/* ── TOP BAR ── */}
        <div style={S.topBar}>
          <div style={S.logoMark}>
            <BookIcon />
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.appTitle}>Flashcard học từ</div>
          </div>
          <StatusPill isPlaying={isPlaying} isPaused={isPaused} />
        </div>

        {/* ── THANH CHỌN PHẠM VI TỪ ── */}
        <div style={S.sliderWrap}>
          <div style={S.sliderHeader}>
            <span style={S.sliderTitle}>Phạm vi từ muốn học:</span>
            <span style={S.sliderValue}>
              Từ {startIdx} đến {endIdx} ({visibleWords.length} từ)
            </span>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "#8f8fad", width: 42, fontWeight: 500 }}>Từ từ:</span>
              <input
                type="range"
                min={1}
                max={endIdx} 
                value={startIdx}
                disabled={isPlaying}
                onChange={(e) => {
                  setRangeStart(Number(e.target.value));
                  setIndex(0); 
                  setIsFlipped(false);
                }}
                style={S.sliderInput(isPlaying)}
              />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", width: 20, textAlign: "right" }}>
                {startIdx}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "#8f8fad", width: 42, fontWeight: 500 }}>Đến từ:</span>
              <input
                type="range"
                min={startIdx} 
                max={totalWords}
                value={endIdx}
                disabled={isPlaying}
                onChange={(e) => {
                  setRangeEnd(Number(e.target.value));
                  setIndex(0); 
                  setIsFlipped(false);
                }}
                style={S.sliderInput(isPlaying)}
              />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", width: 20, textAlign: "right" }}>
                {endIdx}
              </span>
            </div>
          </div>
        </div>

        {/* ── PROGRESS ── */}
        <div style={S.progressWrap}>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: `${progressPct}%` }} />
          </div>
          <span style={S.progressLabel}>{index + 1} / {visibleWords.length}</span>
        </div>

        {/* ── FLASHCARD (CO GIÃN LINH HOẠT THEO CHIỀU CAO TRỐNG) ── */}
        <div
          style={{
            ...S.cardOuter,
            cursor: isPlaying ? "default" : "pointer",
            opacity: phase === "fade" ? 0 : 1,
            transform: phase === "fade" ? "scale(0.98) translateY(2px)" : "scale(1) translateY(0)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
          }}
          onClick={() => { if (!isPlaying) setIsFlipped((f) => !f); }}
        >
          <div style={{ ...S.cardInner, transform: cardFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>

            {/* FRONT */}
            <div style={{ ...S.face, ...S.faceFront }} ref={frontRef}>
              <div style={S.faceLang}>EN</div>
              <div
                ref={frontTextRef}
                style={{ ...S.wordText, fontSize: frontSize, color: "#748ffc" }}
              >
                {currentWord.Word}
              </div>
              {!isPlaying ? (
                <div style={S.faceHint}>
                  <TapIcon /> Chạm để xem nghĩa
                </div>
              ) : phase === "en" ? (
                <div style={{ ...S.faceHint, color: "#748ffc" }}>
                  <SpeakerIcon color="#748ffc" /> Đang phát âm…
                </div>
              ) : null}
            </div>

            {/* BACK */}
            <div style={{ ...S.face, ...S.faceBack }} ref={backRef}>
              <div style={{ ...S.faceLang, color: COLORS.teal700, background: COLORS.teal100 }}>VI</div>
              <div
                ref={backTextRef}
                style={{ ...S.wordText, fontSize: backSize, color: "#34d399" }}
              >
                {currentWord.Meaning}
              </div>
              {!isPlaying ? (
                <div style={{ ...S.faceHint, color: "#34d399" }}>
                  <RotateIcon /> Chạm để quay lại
                </div>
              ) : phase === "vi" ? (
                <div style={{ ...S.faceHint, color: "#34d399" }}>
                  <SpeakerIcon color="#34d399" /> Đang đọc nghĩa…
                </div>
              ) : null}
            </div>

          </div>
        </div>

        {/* ── SPEAK ROW ── */}
        <div style={S.row}>
          <button
            style={S.speakBtn("rgba(76,110,245,0.1)", "#748ffc", isPlaying)}
            disabled={isPlaying}
            onClick={() => speak(currentWord.Word, "en-US")}
          >
            <SpeakerIcon color={isPlaying ? COLORS.gray600 : "#748ffc"} />
            <span>Phát âm EN</span>
          </button>
          <button
            style={S.speakBtn("rgba(52,211,153,0.1)", "#34d399", isPlaying)}
            disabled={isPlaying}
            onClick={() => speak(currentWord.Meaning, "vi-VN")}
          >
            <SpeakerIcon color={isPlaying ? COLORS.gray600 : "#34d399"} />
            <span>Đọc nghĩa VI</span>
          </button>
        </div>

        {/* ── NAV + MAIN CONTROL ROW ── */}
        <div style={S.row}>
          <button
            style={S.navBtn(isPlaying && !isPaused)}
            disabled={isPlaying && !isPaused}
            onClick={prevWord}
          >
            <ChevronLeft />
          </button>

          {!isPlaying ? (
            <button style={S.primaryBtn} onClick={startPlay}>
              <PlayIcon /> Phát tự động
            </button>
          ) : isPaused ? (
            <button style={S.primaryBtn} onClick={resumePlay}>
              <PlayIcon /> Tiếp tục
            </button>
          ) : (
            <button style={{ ...S.primaryBtn, background: "#343a40" }} onClick={pausePlay}>
              <PauseIcon /> Tạm dừng
            </button>
          )}

          <button
            style={S.navBtn(isPlaying && !isPaused)}
            disabled={isPlaying && !isPaused}
            onClick={nextWord}
          >
            <ChevronRight />
          </button>
        </div>

        {/* ── STOP ── */}
        {isPlaying && (
          <button style={S.stopBtn} onClick={stopPlay}>
            <StopIcon /> Dừng lại
          </button>
        )}

        {/* ── TIP ── */}
        {!isPlaying && (
          <div style={S.tip}>
            <span style={S.tipIcon}>💡</span>
            <span style={S.tipText}>
              Nhấn <strong>Phát tự động</strong> để lật thẻ và phát âm không cần chạm.
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

/* ──────────────── SUB-COMPONENTS ──────────────── */
function StatusPill({ isPlaying, isPaused }) {
  if (!isPlaying)  return <div style={pill("rgba(255,255,255,0.05)", "#8f8fad")}>Tự học</div>;
  if (isPaused)    return <div style={pill("rgba(251,146,60,0.15)", "#fb923c")}>Tạm dừng</div>;
  return <div style={pill("rgba(76,110,245,0.15)", "#748ffc")}>Auto play</div>;
}
const pill = (bg, color) => ({
  fontSize: 10, fontWeight: 600, padding: "3px 8px",
  borderRadius: 99, background: bg, color,
  letterSpacing: "0.02em",
});

/* ──────────────── INLINE SVG ICONS ──────────────── */
const icon = (d, size = 16) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const BookIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
    stroke="#748ffc" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
);

const SpeakerIcon = ({ color = "currentColor" }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
  </svg>
);

const TapIcon = () => icon(
  <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
  14
);

const RotateIcon = () => icon(
  <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.41"/></>,
  14
);

const PlayIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="white" stroke="white"
    strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const PauseIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="white"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
  </svg>
);

const StopIcon = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="#8f8fad"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
  </svg>
);

const ChevronLeft = () => icon(<polyline points="15 18 9 12 15 6"/>, 16);
const ChevronRight = () => icon(<polyline points="9 18 15 12 9 6"/>, 16);

/* ──────────────── STYLES ĐÃ FIX PHÂN PHỐI TỶ LỆ DỌC ──────────────── */
const S = {
  root: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "0 16px 12px",
    boxSizing: "border-box",
    overflow: "hidden",
    background: "transparent",
  },
  shell: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexShrink: 0,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "rgba(76,110,245,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  appTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
  },
  sliderWrap: {
    background: COLORS.bgDark,
    border: `1px solid ${COLORS.borderDark}`,
    borderRadius: 12,
    padding: "8px 12px",
    marginBottom: 8,
    flexShrink: 0,
  },
  sliderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sliderTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#8f8fad",
  },
  sliderValue: {
    fontSize: 11,
    fontWeight: 700,
    color: "#748ffc",
    background: "rgba(76,110,245,0.15)",
    padding: "2px 6px",
    borderRadius: 6,
  },
  sliderInput: (disabled) => ({
    flex: 1,
    margin: 0,
    height: 4,
    cursor: disabled ? "not-allowed" : "pointer",
    accentColor: "#4c6ef5",
  }),
  progressWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexShrink: 0,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    background: COLORS.bgDark,
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #4c6ef5, #748ffc)",
    borderRadius: 99,
    transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#5a5a8a",
    flexShrink: 0,
    textAlign: "right",
  },
  
  /* FLASHCARD SẼ ĂN TRỌN TOÀN BỘ KHÔNG GIAN DỌC CÒN LẠI CỦA THIẾT BỊ */
  cardOuter: {
    flex: 1,
    minHeight: 120, // Đảm bảo giao diện không sụp đổ kể cả ở thiết bị siêu lùn
    perspective: 1200,
    marginBottom: 8,
    userSelect: "none",
  },
  cardInner: {
    position: "relative",
    width: "100%",
    height: "100%",
    transformStyle: "preserve-3d",
    transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
  },
  face: {
    position: "absolute",
    inset: 0,
    borderRadius: 16,
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    textAlign: "center",
    boxSizing: "border-box",
  },
  faceFront: {
    //background: "linear-gradient(135deg, #1e1e3f, #14142d)",
    background: "linear-gradient(135deg, #ffffff, #ffffff)",
    border: "1px solid #2a2a5a",
  },
  faceBack: {
    background: "linear-gradient(135deg, #0f2d24, #061f18)",
    border: "1px solid #10b981",
    transform: "rotateY(180deg)",
  },
  faceLang: {
    position: "absolute",
    top: 12,
    right: 12,
    fontSize: 10,
    fontWeight: 700,
    color: "#748ffc",
    background: "rgba(76,110,245,0.15)",
    padding: "2px 6px",
    borderRadius: 6,
  },
  wordText: {
    fontWeight: 700,
    lineHeight: 1.2,
    textAlign: "center",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    marginBottom: 8,
  },
  faceHint: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "#5a5a8a",
    fontWeight: 500,
  },
  row: {
    display: "flex",
    gap: 6,
    marginBottom: 6,
    flexShrink: 0,
  },
  speakBtn: (bg, color, disabled) => ({
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "10px",
    borderRadius: 12,
    border: `1px solid ${COLORS.borderDark}`,
    background: disabled ? "#101020" : COLORS.bgDark,
    color: disabled ? "#444466" : color,
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    WebkitTapHighlightColor: "transparent",
  }),
  primaryBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 14px",
    borderRadius: 12,
    border: "none",
    background: "#4c6ef5",
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(76,110,245,0.25)",
    WebkitTapHighlightColor: "transparent",
  },
  navBtn: (disabled) => ({
    width: 40,
    height: 40,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    border: `1px solid ${COLORS.borderDark}`,
    background: disabled ? "#101020" : COLORS.bgDark,
    color: disabled ? "#444466" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    WebkitTapHighlightColor: "transparent",
  }),
  stopBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "8px",
    borderRadius: 12,
    border: "1px solid #2a2a5a",
    background: "#1e1e3f",
    color: "#b0b0d0",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 4,
    flexShrink: 0,
    WebkitTapHighlightColor: "transparent",
  },
  tip: {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
    background: "rgba(76,110,245,0.06)",
    border: "1px solid rgba(76,110,245,0.15)",
    borderRadius: 10,
    padding: "8px 12px",
    flexShrink: 0,
  },
  tipIcon: { fontSize: 12, flexShrink: 0 },
  tipText: {
    fontSize: 11,
    color: "#8f8fad",
    lineHeight: 1.4,
  },
};