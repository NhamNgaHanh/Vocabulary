import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────
   useFitText – co giãn font theo container
───────────────────────────────────────── */
function useFitText({ maxFontSize = 48, minFontSize = 16, deps = [] } = {}) {
  const containerRef = useRef(null);
  const textRef      = useRef(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    function resize() {
      if (!containerRef.current || !textRef.current) return;
      let size = maxFontSize;
      while (size >= minFontSize) {
        textRef.current.style.fontSize   = size + "px";
        textRef.current.style.lineHeight = "1.2";
        const tRect = textRef.current.getBoundingClientRect();
        const cRect = containerRef.current.getBoundingClientRect();
        if (tRect.width <= cRect.width - 24 && tRect.height <= cRect.height - 24) break;
        size -= 2;
      }
      setFontSize(size);
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxFontSize, minFontSize, ...deps]);

  return { containerRef, textRef, fontSize };
}

/* ─────────────────────────────────────────
   Màu sắc
───────────────────────────────────────── */
const C = {
  bgPage:     "#0d0d1a",
  bgCard:     "#13132a",
  bgPanel:    "#10101f",
  border:     "#1f1f3d",
  borderAccent:"#2e2e5e",
  purple:     "#748ffc",
  purpleDim:  "rgba(76,110,245,0.15)",
  purpleMid:  "#4c6ef5",
  green:      "#34d399",
  greenDim:   "rgba(52,211,153,0.12)",
  greenBorder:"rgba(52,211,153,0.3)",
  textPrimary:"#e8e8f0",
  textMuted:  "#6b6b9a",
  textDim:    "#3e3e6a",
  white:      "#ffffff",
};

/* ─────────────────────────────────────────
   Định nghĩa animation hiệu ứng trượt thẻ
───────────────────────────────────────── */
const cardVariants = {
  enter: (direction) => ({
    x: direction > 0 ? "100%" : direction < 0 ? "-100%" : 0,
    opacity: 0,
    rotate: direction > 0 ? 8 : direction < 0 ? -8 : 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 300, damping: 26 }
  },
  exit: (direction) => ({
    x: direction > 0 ? "-100%" : direction < 0 ? "100%" : 0,
    opacity: 0,
    rotate: direction > 0 ? -8 : direction < 0 ? 8 : 0,
    transition: { duration: 0.25 }
  })
};

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
export default function Learn({ words = [] }) {
  const [index,     setIndex]     = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused,  setIsPaused]  = useState(false);
  const [phase,     setPhase]     = useState("en");   // "en" | "vi" | "fade"
  const [direction, setDirection] = useState(0);       // +1 = next, -1 = prev

  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd,   setRangeEnd]   = useState(words.length || 1);

  const timeoutsRef  = useRef([]);
  const isPlayingRef = useRef(false);
  const isPausedRef  = useRef(false);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isPausedRef.current  = isPaused;  }, [isPaused]);

  useEffect(() => {
    setRangeStart(1);
    setRangeEnd(words.length || 1);
    setIndex(0);
    setIsFlipped(false);
  }, [words]);

  const totalWords  = words.length;
  const startIdx    = Math.max(1, Math.min(rangeStart, totalWords || 1));
  const endIdx      = Math.max(startIdx, Math.min(rangeEnd, totalWords || 1));
  const visibleWords = totalWords > 0 ? words.slice(startIdx - 1, endIdx) : [];
  const currentWord  = visibleWords[index] ?? { Word: "", Meaning: "" };

  /* fit-text cho mặt trước và sau */
  const { containerRef: frontRef, textRef: frontTextRef, fontSize: frontSize } =
    useFitText({ maxFontSize: 38, minFontSize: 16, deps: [index, visibleWords.length] });
  const { containerRef: backRef, textRef: backTextRef, fontSize: backSize } =
    useFitText({ maxFontSize: 38, minFontSize: 16, deps: [index, visibleWords.length] });

  const progressPct = visibleWords.length > 0
    ? ((index + 1) / visibleWords.length) * 100 : 0;

  const cardFlipped = isPlaying
    ? (phase === "vi" || phase === "fade")
    : isFlipped;

  /* ── TTS ── */
  const speak = (text, lang = "en-US") => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  /* ── Timers ── */
  const clearAll = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const estDur = (text) => Math.max(text.length * 80 + 800, 1200);

  function playWordCycle(pos) {
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
      setDirection(1);
      setIndex(next);
      setPhase("en");
      playWordCycle(next);
    }, enDur + viDur + 500);

    timeoutsRef.current.push(t1, t2, t3);
  }

  const startPlay = () => {
    clearAll();
    setIndex(0); setIsFlipped(false); setIsPaused(false);
    setIsPlaying(true);
    isPlayingRef.current = true;
    isPausedRef.current  = false;
    setTimeout(() => playWordCycle(0), 0);
  };

  const pausePlay = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    clearAll();
    window.speechSynthesis?.cancel();
  };

  const resumePlay = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    setTimeout(() => playWordCycle(index), 0);
  };

  const stopPlay = () => {
    setIsPlaying(false); setIsPaused(false);
    isPlayingRef.current = false; isPausedRef.current = false;
    clearAll();
    window.speechSynthesis?.cancel();
    setPhase("en"); setIsFlipped(false);
  };

  /* ── Swipe handlers ── */
  const goNext = () => {
    if (isPlaying) return;
    setDirection(1);
    setIndex((p) => (p + 1 >= visibleWords.length ? 0 : p + 1));
    setIsFlipped(false);
  };

  const goPrev = () => {
    if (isPlaying) return;
    setDirection(-1);
    setIndex((p) => (p - 1 < 0 ? visibleWords.length - 1 : p - 1));
    setIsFlipped(false);
  };

  useEffect(() => { return clearAll; }, []);

  /* ─── EMPTY STATE ─── */
  if (!words || words.length === 0) {
    return (
      <div style={S.root}>
        <div style={{ textAlign: "center", padding: "48px 0", color: C.textMuted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📘</div>
          <p style={{ fontWeight: 600, color: C.textPrimary }}>Chưa có dữ liệu từ vựng</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Hãy truyền vào prop <code>words</code></p>
        </div>
      </div>
    );
  }

  /* ─── RENDER ─── */
  return (
    <div style={S.root}>
      <div style={S.shell}>

        {/* TOP BAR */}
        <div style={S.topBar}>
          <div style={S.logoMark}>
            <BookIcon />
          </div>
          <span style={S.appTitle}>Flashcard học từ</span>
          <StatusPill isPlaying={isPlaying} isPaused={isPaused} />
        </div>

        {/* RANGE SLIDERS */}
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <span style={S.panelLabel}>Phạm vi từ muốn học</span>
            <span style={S.panelBadge}>
              {startIdx}–{endIdx} · {visibleWords.length} từ
            </span>
          </div>
          <SliderRow
            label="Từ từ:"
            min={1} max={endIdx} value={startIdx}
            disabled={isPlaying}
            onChange={(v) => { setRangeStart(v); setIndex(0); setIsFlipped(false); }}
          />
          <SliderRow
            label="Đến từ:"
            min={startIdx} max={totalWords} value={endIdx}
            disabled={isPlaying}
            onChange={(v) => { setRangeEnd(v); setIndex(0); setIsFlipped(false); }}
          />
        </div>

        {/* PROGRESS */}
        <div style={S.progressRow}>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: `${progressPct}%` }} />
          </div>
          <span style={S.progressLabel}>{index + 1} / {visibleWords.length}</span>
        </div>

        {/* FLASHCARD CONTAINER */}
        <div style={S.cardOuter}>
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={index}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              drag={isPlaying ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                cursor: isPlaying ? "default" : "grab",
                touchAction: "pan-y"
              }}
              whileTap={isPlaying ? {} : { cursor: "grabbing" }}
              onDragEnd={(_, info) => {
                if (isPlaying) return;
                const x = info.offset.x;
                const velocity = info.velocity.x;

                // Swipe LEFT -> Kéo qua trái tức là xem từ tiếp theo
                if (x < -100 || velocity < -400) {
                  goNext();
                } 
                // Swipe RIGHT -> Kéo qua phải tức là xem từ trước đó
                else if (x > 100 || velocity > 400) {
                  goPrev();
                } 
                // Tap nhẹ -> Lật mặt thẻ
                // else {
                //   setIsFlipped((f) => !f);
                // }
              }}
              onTap={() =>{
                if (!isPlaying) {
                  setIsFlipped((f) => !f);
                }
              }}
            >
              {/* 3-D flip inner */}
              <div style={{
                ...S.cardInner,
                transform: cardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}>

                {/* FRONT */}
                <div style={{ ...S.face, ...S.faceFront }} ref={frontRef}>
                  <span style={{ ...S.faceLang, color: C.purple, background: C.purpleDim }}>EN</span>
                  <div
                    ref={frontTextRef}
                    style={{ ...S.wordText, fontSize: frontSize, color: C.purple }}
                  >
                    {currentWord.Word}
                  </div>
                  {!isPlaying
                    ? <div style={S.hint}><SwipeIcon /> Vuốt trái/phải · chạm để lật</div>
                    : phase === "en"
                      ? <div style={{ ...S.hint, color: C.purple }}><SpeakerIcon color={C.purple} /> Đang phát âm…</div>
                      : null
                  }
                </div>

                {/* BACK */}
                <div style={{ ...S.face, ...S.faceBack }} ref={backRef}>
                  <span style={{ ...S.faceLang, color: C.green, background: C.greenDim }}>VI</span>
                  <div
                    ref={backTextRef}
                    style={{ ...S.wordText, fontSize: backSize, color: C.green }}
                  >
                    {currentWord.Meaning}
                  </div>
                  {!isPlaying
                    ? <div style={{ ...S.hint, color: C.green }}><RotateIcon /> Vuốt hoặc chạm để lật</div>
                    : phase === "vi"
                      ? <div style={{ ...S.hint, color: C.green }}><SpeakerIcon color={C.green} /> Đang đọc nghĩa…</div>
                      : null
                  }
                </div>

              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* SWIPE INDICATOR */}
        {!isPlaying && (
          <div style={S.swipeIndicator}>
            <span style={S.swipeArrow}>←</span>
            <span style={S.swipeText}>vuốt để chuyển từ</span>
            <span style={S.swipeArrow}>→</span>
          </div>
        )}

        {/* SPEAK ROW */}
        <div style={S.row}>
          <SpeakButton
            color={C.purple} bg={C.purpleDim}
            disabled={isPlaying}
            label="Phát âm EN"
            onClick={() => speak(currentWord.Word, "en-US")}
          />
          <SpeakButton
            color={C.green} bg={C.greenDim}
            disabled={isPlaying}
            label="Đọc nghĩa VI"
            onClick={() => speak(currentWord.Meaning, "vi-VN")}
          />
        </div>

        {/* PLAY / PAUSE / STOP */}
        <div style={S.row}>
          {!isPlaying ? (
            <PrimaryButton onClick={startPlay} icon={<PlayIcon />} label="Phát tự động" />
          ) : isPaused ? (
            <PrimaryButton onClick={resumePlay} icon={<PlayIcon />} label="Tiếp tục" />
          ) : (
            <PrimaryButton
              onClick={pausePlay}
              icon={<PauseIcon />}
              label="Tạm dừng"
              style={{ background: "#1e1e3a", border: `1px solid ${C.borderAccent}` }}
            />
          )}
        </div>

        {isPlaying && (
          <button style={S.stopBtn} onClick={stopPlay}>
            <StopIcon /> Dừng lại
          </button>
        )}

        {/* TIP */}
        {!isPlaying && (
          <div style={S.tip}>
            <span style={{ fontSize: 12, flexShrink: 0 }}>💡</span>
            <span style={S.tipText}>
              Nhấn <strong>Phát tự động</strong> để lật thẻ và phát âm tự động.
              Vuốt trái/phải để chuyển từ, chạm để lật thẻ.
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   SUB-COMPONENTS
──────────────────────────────────────────────── */
function StatusPill({ isPlaying, isPaused }) {
  const idle    = { bg: "rgba(255,255,255,0.05)", color: "#8f8fad", label: "Tự học" };
  const playing = { bg: "rgba(76,110,245,0.18)",  color: "#748ffc", label: "Auto play" };
  const paused  = { bg: "rgba(251,146,60,0.18)",  color: "#fb923c", label: "Tạm dừng" };
  const p = !isPlaying ? idle : isPaused ? paused : playing;
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, padding: "3px 8px",
      borderRadius: 99, background: p.bg, color: p.color,
      letterSpacing: "0.03em",
    }}>
      {p.label}
    </div>
  );
}

function SliderRow({ label, min, max, value, disabled, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
      <span style={{ fontSize: 11, color: C.textMuted, width: 44, flexShrink: 0 }}>{label}</span>
      <input
        type="range" min={min} max={max} value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          flex: 1, height: 4, accentColor: "#4c6ef5",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      />
      <span style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, width: 20, textAlign: "right", flexShrink: 0 }}>
        {value}
      </span>
    </div>
  );
}

function SpeakButton({ color, bg, disabled, label, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 5, padding: "9px 8px",
        borderRadius: 12, border: `1px solid ${C.border}`,
        background: disabled ? C.bgPanel : bg,
        color: disabled ? C.textDim : color,
        fontSize: 12, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <SpeakerIcon color={disabled ? C.textDim : color} />
      {label}
    </button>
  );
}

function PrimaryButton({ onClick, icon, label, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 6, padding: "11px 14px",
        borderRadius: 12, border: "none",
        background: "#4c6ef5", color: "#fff",
        fontSize: 13, fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(76,110,245,0.3)",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      {icon} {label}
    </button>
  );
}

/* ─── ICONS ─── */
const BookIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
    stroke="#748ffc" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
  </svg>
);

const SpeakerIcon = ({ color = "currentColor" }) => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
  </svg>
);

const SwipeIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M15 7l5 5-5 5M9 7l-5 5 5 5"/>
  </svg>
);

const RotateIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-4.41"/>
  </svg>
);

const PlayIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="#fff" stroke="#fff"
    strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const PauseIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="#fff">
    <rect x="6" y="4" width="4" height="16" rx="1"/>
    <rect x="14" y="4" width="4" height="16" rx="1"/>
  </svg>
);

const StopIcon = () => (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="#8f8fad">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
  </svg>
);

/* ─── STYLES ─── */
const S = {
  root: {
    width: "100%", height: "100%",
    display: "flex", flexDirection: "column",
    padding: "0 14px 10px",
    boxSizing: "border-box",
    overflow: "hidden",
    background: "transparent",
  },
  shell: {
    width: "100%", height: "100%",
    display: "flex", flexDirection: "column",
    boxSizing: "border-box",
  },
  topBar: {
    display: "flex", alignItems: "center", gap: 8,
    marginBottom: 8, flexShrink: 0,
  },
  logoMark: {
    width: 28, height: 28, borderRadius: 8,
    background: C.purpleDim,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  appTitle: { fontSize: 13, fontWeight: 600, color: C.textPrimary, flex: 1 },

  panel: {
    background: C.bgPanel,
    border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "8px 12px",
    marginBottom: 8, flexShrink: 0,
  },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  panelLabel: { fontSize: 11, fontWeight: 600, color: C.textMuted },
  panelBadge: {
    fontSize: 11, fontWeight: 700, color: C.purple,
    background: C.purpleDim, padding: "2px 7px", borderRadius: 6,
  },

  progressRow: {
    display: "flex", alignItems: "center", gap: 8,
    marginBottom: 8, flexShrink: 0,
  },
  progressTrack: {
    flex: 1, height: 4, background: C.bgPanel,
    borderRadius: 99, overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: `linear-gradient(90deg, ${C.purpleMid}, ${C.purple})`,
    borderRadius: 99,
    transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
  },
  progressLabel: {
    fontSize: 11, fontWeight: 600, color: C.textDim,
    flexShrink: 0, textAlign: "right",
  },

  /* card container wrapper */
  cardOuter: {
    flex: 1, minHeight: 130,
    perspective: 1200,
    marginBottom: 4,
    userSelect: "none",
    position: "relative", /* Quan trọng: làm điểm neo cho absolute motion.div */
  },
  cardInner: {
    position: "relative", width: "100%", height: "100%",
    transformStyle: "preserve-3d",
    transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
  },
  face: {
    position: "absolute", inset: 0,
    borderRadius: 16, padding: 16,
    display: "flex", flexDirection: "column",
    justifyContent: "center", alignItems: "center",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    textAlign: "center", boxSizing: "border-box",
  },
  faceFront: {
    background: "linear-gradient(145deg, #1c1c3a, #131326)",
    border: `1px solid ${C.borderAccent}`,
  },
  faceBack: {
    background: "linear-gradient(145deg, #0b2a1e, #071a12)",
    border: `1px solid ${C.greenBorder}`,
    transform: "rotateY(180deg)",
  },
  faceLang: {
    position: "absolute", top: 11, right: 11,
    fontSize: 10, fontWeight: 700,
    padding: "2px 6px", borderRadius: 6,
  },
  wordText: {
    fontWeight: 700, lineHeight: 1.2, textAlign: "center",
    wordBreak: "break-word", whiteSpace: "pre-wrap",
    marginBottom: 8,
  },
  hint: {
    display: "flex", alignItems: "center", gap: 4,
    fontSize: 11, color: C.textMuted,
  },

  swipeIndicator: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, marginBottom: 6, flexShrink: 0,
  },
  swipeArrow: { fontSize: 14, color: C.textDim },
  swipeText:  { fontSize: 10, color: C.textDim, letterSpacing: "0.04em" },

  row: { display: "flex", gap: 6, marginBottom: 6, flexShrink: 0 },

  stopBtn: {
    width: "100%", display: "flex", alignItems: "center",
    justifyContent: "center", gap: 4, padding: "8px",
    borderRadius: 12, border: `1px solid ${C.borderAccent}`,
    background: C.bgPanel, color: "#9090b8",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    marginBottom: 4, flexShrink: 0,
    WebkitTapHighlightColor: "transparent",
  },
  tip: {
    display: "flex", alignItems: "flex-start", gap: 6,
    background: "rgba(76,110,245,0.07)",
    border: "1px solid rgba(76,110,245,0.15)",
    borderRadius: 10, padding: "8px 12px", flexShrink: 0,
  },
  tipText: { fontSize: 11, color: C.textMuted, lineHeight: 1.45 },
};