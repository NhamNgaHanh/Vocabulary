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
        if (textRect.width <= boxRect.width - 32 && textRect.height <= boxRect.height - 32) break;
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
  purple50:   "#EEEDFE",
  purple200: "#AFA9EC",
  purple600: "#534AB7",
  purple700: "#3C3489",
  teal50:     "#E1F5EE",
  teal100:   "#9FE1CB",
  teal700:   "#085041",
  teal800:   "#04342C",
  gray50:     "#F8F9FA",
  gray100:   "#F1F0EC",
  gray200:   "#E2E0D9",
  gray400:   "#9B9890",
  gray600:   "#5F5E5A",
  gray800:   "#2C2C2A",
  white:     "#FFFFFF",
};

export default function Learn({ words = [] }) {
  const [index, setIndex]           = useState(0);
  const [isFlipped, setIsFlipped]   = useState(false);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [isPaused, setIsPaused]     = useState(false);
  const [phase, setPhase]           = useState("en");   // "en" | "vi" | "fade"
  
  // State quản lý phạm vi kéo 2 đầu
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd]     = useState(words.length || 1);

  const timeoutsRef   = useRef([]);
  const isPlayingRef  = useRef(false);
  const isPausedRef   = useRef(false);

  useEffect(() => { isPlayingRef.current  = isPlaying;  }, [isPlaying]);
  useEffect(() => { isPausedRef.current   = isPaused;   }, [isPaused]);

  // Đồng bộ lại khoảng kéo khi danh sách gốc 'words' thay đổi từ bên ngoài
  useEffect(() => {
    setRangeStart(1);
    setRangeEnd(words.length || 1);
    setIndex(0);
    setIsFlipped(false);
  }, [words]);

  // Đảm bảo giá trị luôn nằm trong phạm vi an toàn
  const totalWords = words.length;
  const startIdx = Math.max(1, Math.min(rangeStart, totalWords || 1));
  const endIdx = Math.max(startIdx, Math.min(rangeEnd, totalWords || 1));

  // Trích xuất mảng từ vựng được chọn dựa trên khoảng rangeStart -> rangeEnd
  const visibleWords = totalWords > 0 ? words.slice(startIdx - 1, endIdx) : [];
  const currentWord = visibleWords[index] ?? { Word: "", Meaning: "" };

  // Sửa lỗi: Cập nhật dependency của hook tự thích ứng kích thước chữ theo số từ thực tế hiển thị
  const { containerRef: frontRef, textRef: frontTextRef, fontSize: frontSize } =
    useFitText({ maxFontSize: 40, minFontSize: 18, deps: [index, visibleWords.length] });
  const { containerRef: backRef,  textRef: backTextRef,  fontSize: backSize  } =
    useFitText({ maxFontSize: 40, minFontSize: 18, deps: [index, visibleWords.length] });

  const progressPct = visibleWords.length > 0 ? ((index + 1) / visibleWords.length) * 100 : 0;
  const cardFlipped = isPlaying ? (phase === "vi" || phase === "fade") : isFlipped;

  /* ── helpers ──────────────────────────────────────────── */
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

  /* ── auto-play cycle ──────────────────────────────────── */
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

  /* ── controls ─────────────────────────────────────────── */
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
          <div style={{ textAlign: "center", padding: "48px 0", color: COLORS.gray600 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📘</div>
            <p style={{ fontWeight: 600, color: COLORS.gray800 }}>Chưa có dữ liệu từ vựng</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── render ───────────────────────────────────────────── */
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

        {/* ── THANH CHỌN PHẠM VI TỪ (2 ĐẦU) ── */}
        <div style={S.sliderWrap}>
          <div style={S.sliderHeader}>
            <span style={S.sliderTitle}>Phạm vi từ muốn học:</span>
            <span style={S.sliderValue}>
              Từ {startIdx} đến {endIdx} ({visibleWords.length} từ)
            </span>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            
            {/* THANH KÉO 1: CHỌN TỪ BẮT ĐẦU */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: COLORS.gray600, width: 45, fontWeight: 500 }}>Từ từ:</span>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray800, width: 24, textAlign: "right" }}>
                {startIdx}
              </span>
            </div>

            {/* THANH KÉO 2: CHỌN TỪ KẾT THÚC */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: COLORS.gray600, width: 45, fontWeight: 500 }}>Đến từ:</span>
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
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.gray800, width: 24, textAlign: "right" }}>
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

        {/* ── FLASHCARD ── */}
        <div
          style={{
            ...S.cardOuter,
            cursor: isPlaying ? "default" : "pointer",
            opacity: phase === "fade" ? 0 : 1,
            transform: phase === "fade" ? "scale(0.97) translateY(4px)" : "scale(1) translateY(0)",
            transition: "opacity 0.35s ease, transform 0.35s ease",
          }}
          onClick={() => { if (!isPlaying) setIsFlipped((f) => !f); }}
        >
          <div style={{ ...S.cardInner, transform: cardFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>

            {/* FRONT */}
            <div style={{ ...S.face, ...S.faceFront }} ref={frontRef}>
              <div style={S.faceLang}>EN</div>
              <div
                ref={frontTextRef}
                style={{ ...S.wordText, fontSize: frontSize, color: COLORS.purple600 }}
              >
                {currentWord.Word}
              </div>
              {!isPlaying ? (
                <div style={S.faceHint}>
                  <TapIcon /> Chạm để xem nghĩa
                </div>
              ) : phase === "en" ? (
                <div style={{ ...S.faceHint, color: COLORS.purple600 }}>
                  <SpeakerIcon color={COLORS.purple600} /> Đang phát âm…
                </div>
              ) : null}
            </div>

            {/* BACK */}
            <div style={{ ...S.face, ...S.faceBack }} ref={backRef}>
              <div style={{ ...S.faceLang, color: COLORS.teal700, background: COLORS.teal100 }}>VI</div>
              <div
                ref={backTextRef}
                style={{ ...S.wordText, fontSize: backSize, color: COLORS.teal700 }}
              >
                {currentWord.Meaning}
              </div>
              {!isPlaying ? (
                <div style={{ ...S.faceHint, color: COLORS.teal700 }}>
                  <RotateIcon /> Chạm để quay lại
                </div>
              ) : phase === "vi" ? (
                <div style={{ ...S.faceHint, color: COLORS.teal700 }}>
                  <SpeakerIcon color={COLORS.teal700} /> Đang đọc nghĩa…
                </div>
              ) : null}
            </div>

          </div>
        </div>

        {/* ── SPEAK ROW ── */}
        <div style={S.row}>
          <button
            style={S.speakBtn(COLORS.purple50, COLORS.purple600, isPlaying)}
            disabled={isPlaying}
            onClick={() => speak(currentWord.Word, "en-US")}
          >
            <SpeakerIcon color={isPlaying ? COLORS.gray400 : COLORS.purple600} />
            <span>Phát âm EN</span>
          </button>
          <button
            style={S.speakBtn(COLORS.teal50, COLORS.teal700, isPlaying)}
            disabled={isPlaying}
            onClick={() => speak(currentWord.Meaning, "vi-VN")}
          >
            <SpeakerIcon color={isPlaying ? COLORS.gray400 : COLORS.teal700} />
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

          {/* Main CTA */}
          {!isPlaying ? (
            <button style={S.primaryBtn} onClick={startPlay}>
              <PlayIcon /> Phát tự động
            </button>
          ) : isPaused ? (
            <button style={S.primaryBtn} onClick={resumePlay}>
              <PlayIcon /> Tiếp tục
            </button>
          ) : (
            <button style={{ ...S.primaryBtn, background: COLORS.gray800 }} onClick={pausePlay}>
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

        {/* ── STOP (only when playing) ── */}
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
              Nhấn <strong>Phát tự động</strong> để lật thẻ và phát âm mà không cần chạm màn hình.
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

/* ──────────────── SUB-COMPONENTS ──────────────── */

function StatusPill({ isPlaying, isPaused }) {
  if (!isPlaying)  return <div style={pill(COLORS.gray100, COLORS.gray600)}>Tự học</div>;
  if (isPaused)    return <div style={pill("#FFF8E1", "#B45309")}>Tạm dừng</div>;
  return <div style={pill(COLORS.purple50, COLORS.purple700)}>Auto play</div>;
}
const pill = (bg, color) => ({
  fontSize: 11, fontWeight: 600, padding: "4px 10px",
  borderRadius: 99, background: bg, color,
  letterSpacing: "0.04em",
});

/* ──────────────── INLINE SVG ICONS ──────────────── */
const icon = (d, size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const BookIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke={COLORS.purple600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
);

const SpeakerIcon = ({ color = "currentColor" }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
  </svg>
);

const TapIcon = () => icon(
  <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
  15
);

const RotateIcon = () => icon(
  <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.41"/></>,
  15
);

const PlayIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="white" stroke="white"
    strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const PauseIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="white"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
  </svg>
);

const StopIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill={COLORS.gray600}
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
  </svg>
);

const ChevronLeft = () => icon(
  <polyline points="15 18 9 12 15 6"/>, 18
);
const ChevronRight = () => icon(
  <polyline points="9 18 15 12 9 6"/>, 18
);

/* ──────────────── STYLES ──────────────── */
const S = {
  root: {
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    background: COLORS.gray100,
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "20px 16px 40px",
    boxSizing: "border-box",
  },
  shell: {
    width: "100%",
    maxWidth: 420,
    background: COLORS.white,
    borderRadius: 24,
    border: `1px solid ${COLORS.gray200}`,
    padding: "20px 20px 24px",
    boxSizing: "border-box",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: COLORS.purple50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  appTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.gray800,
    letterSpacing: "-0.01em",
  },
  sliderWrap: {
    background: COLORS.gray50,
    border: `1.5px solid ${COLORS.gray200}`,
    borderRadius: 14,
    padding: "10px 14px",
    marginBottom: 16,
  },
  sliderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sliderTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.gray600,
  },
  sliderValue: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.purple600,
    background: COLORS.purple50,
    padding: "2px 8px",
    borderRadius: 8,
  },
  sliderInput: (disabled) => ({
    width: "100%",
    margin: 0,
    cursor: disabled ? "not-allowed" : "pointer",
    accentColor: COLORS.purple600,
  }),
  progressWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    background: COLORS.gray100,
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: COLORS.purple600,
    borderRadius: 99,
    transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.gray600,
    flexShrink: 0,
    minWidth: 40,
    textAlign: "right",
  },
  cardOuter: {
    perspective: 1200,
    marginBottom: 16,
    userSelect: "none",
  },
  cardInner: {
    position: "relative",
    width: "100%",
    height: 248,
    transformStyle: "preserve-3d",
    transition: "transform 0.48s cubic-bezier(0.4,0,0.2,1)",
    borderRadius: 18,
  },
  face: {
    position: "absolute",
    inset: 0,
    borderRadius: 18,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    textAlign: "center",
    boxSizing: "border-box",
    border: `1.5px solid ${COLORS.gray200}`,
  },
  faceFront: {
    background: COLORS.gray50,
  },
  faceBack: {
    background: COLORS.teal50,
    border: `1.5px solid ${COLORS.teal100}`,
    transform: "rotateY(180deg)",
  },
  faceLang: {
    position: "absolute",
    top: 14,
    right: 16,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: COLORS.purple600,
    background: COLORS.purple50,
    padding: "2px 8px",
    borderRadius: 99,
  },
  wordText: {
    fontWeight: 700,
    lineHeight: 1.2,
    textAlign: "center",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    marginBottom: 12,
  },
  faceHint: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    color: COLORS.gray400,
    fontWeight: 500,
  },
  row: {
    display: "flex",
    gap: 8,
    marginBottom: 8,
  },
  speakBtn: (bg, color, disabled) => ({
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1.5px solid ${disabled ? COLORS.gray200 : bg === COLORS.purple50 ? COLORS.purple200 : COLORS.teal100}`,
    background: disabled ? COLORS.gray100 : bg,
    color: disabled ? COLORS.gray400 : color,
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s ease",
    WebkitTapHighlightColor: "transparent",
  }),
  primaryBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 16px",
    borderRadius: 14,
    border: "none",
    background: COLORS.purple600,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.15s ease",
    WebkitTapHighlightColor: "transparent",
    letterSpacing: "-0.01em",
  },
  navBtn: (disabled) => ({
    width: 46,
    height: 46,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    border: `1.5px solid ${disabled ? COLORS.gray200 : COLORS.gray200}`,
    background: disabled ? COLORS.gray100 : COLORS.white,
    color: disabled ? COLORS.gray400 : COLORS.gray800,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s ease",
    WebkitTapHighlightColor: "transparent",
  }),
  stopBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px",
    borderRadius: 12,
    border: `1.5px solid ${COLORS.gray200}`,
    background: COLORS.white,
    color: COLORS.gray600,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 8,
    transition: "background 0.15s ease",
    WebkitTapHighlightColor: "transparent",
  },
  tip: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    background: COLORS.gray50,
    border: `1px solid ${COLORS.gray200}`,
    borderRadius: 12,
    padding: "12px 14px",
    marginTop: 4,
  },
  tipIcon: { fontSize: 14, flexShrink: 0, marginTop: 1 },
  tipText: {
    fontSize: 12,
    color: COLORS.gray600,
    lineHeight: 1.6,
  },
};