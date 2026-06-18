import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import lighthouse from "./assets/lighthouse.png";
/* ─────────────────────────────────────────
   useFitText – co giãn font theo container
   (GIỮ NGUYÊN 100% — không đổi logic)
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
   Màu sắc — Premium Light / Pastel 2026
───────────────────────────────────────── */
const C = {
  white:        "#ffffff",
  panelBg:      "rgba(255,255,255,0.62)",
  border:       "rgba(24,33,77,0.07)",
  borderSoft:   "rgba(24,33,77,0.05)",

  purple:       "#5b5bf5",
  purpleDeep:   "#4946e8",
  purpleGradient: "linear-gradient(135deg, #6E73FF 0%, #5A5CFA 100%)",
  purpleSoft:   "#EEF0FF",
  purpleSoftBorder: "rgba(91,91,245,0.20)",

  green:        "#1da866",
  greenSoft:    "#DDF9E8",
  greenSoftBorder: "rgba(29,168,102,0.28)",

  red:          "#EF6660",
  redSoft:      "#FFE8E8",
  redSoftBorder: "rgba(239,102,96,0.28)",

  amber:        "#f5a524",
  amberSoft:    "rgba(245,165,36,0.15)",

  navy:         "#18214D",
  gray:         "#8A8FA3",
  grayLight:    "#C9CCDE",

  cardShadow:   "0 20px 50px rgba(24,33,77,0.08)",
  cardShadowLg: "0 28px 60px rgba(24,33,77,0.14)",
};

/* ─────────────────────────────────────────
   Định nghĩa animation hiệu ứng trượt thẻ
   (GIỮ NGUYÊN 100% — không đổi logic animation)
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

/* Bơm CSS cho hiệu ứng hover/press (chỉ là CSS thuần, không liên quan logic) */
const injectLearnStyles = () => {
  if (document.getElementById("learn-global-styles")) return;
  const el = document.createElement("style");
  el.id = "learn-global-styles";
  el.textContent = `
    .vl-press { transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease, filter 0.2s ease; }
    .vl-press:hover { transform: scale(1.03); filter: brightness(1.02); }
    .vl-press:active { transform: scale(0.96); }
    .vl-see-more { transition: opacity 0.2s ease; }
    .vl-see-more:hover { text-decoration: underline; }
  `;
  document.head.appendChild(el);
};

/* ─────────────────────────────────────────
   MAIN COMPONENT — TOÀN BỘ LOGIC GIỮ NGUYÊN 100%
   Chỉ thay đổi JSX/CSS bên trong return()
───────────────────────────────────────── */
export default function Learn({ words = [] }) {
  useEffect(() => { injectLearnStyles(); }, []);

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
    useFitText({ maxFontSize: "3rem", minFontSize: 16, deps: [index, visibleWords.length] });
  const { containerRef: backRef, textRef: backTextRef, fontSize: backSize } =
    useFitText({ maxFontSize: "3rem", minFontSize: 16, deps: [index, visibleWords.length] });

  const progressPct = visibleWords.length > 0
    ? ((index + 1) / visibleWords.length) * 100 : 0;

  const cardFlipped = isPlaying
    ? (phase === "vi" || phase === "fade")
    : isFlipped;

  /* ── TTS (Fixed stuck engine) ── */
  const speak = (text, lang = "en-US", clearQueue = true) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !text) {
        resolve();
        return;
      }      
      if (clearQueue) {
        window.speechSynthesis.cancel();
      }      
      
      setTimeout(() => {
        try {
          window.speechSynthesis.resume(); 
          const u = new SpeechSynthesisUtterance(text.trim());
          u.lang = lang; 
          u.rate = 0.9;
          u.onend = () => resolve();
          u.onerror = () => resolve();
          window.speechSynthesis.speak(u);
        } catch (e) {
          resolve();
        }
      }, 60);
    });
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
    speak(w.Word, "en-US", true);

    const t1 = setTimeout(() => {
      if (!isPlayingRef.current || isPausedRef.current) return;
      setPhase("vi");
      speak(w.Meaning, "vi-VN", true);
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
  const changeWord = (step) => {
    if (isPlaying) return;

    const newIndex =
      (index + step + visibleWords.length) %
      visibleWords.length;

    setDirection(step);
    setIndex(newIndex);
    setIsFlipped(false);

    speak(visibleWords[newIndex]?.Word, "en-US", true);
  };

  const goNext = () => changeWord(1);
  const goPrev = () => changeWord(-1);

  useEffect(() => { return clearAll; }, []);

  /* Giá trị hiển thị thuần UI — dot indicator (chỉ tính toán hiển thị, không phải state/logic mới) */
  const dotCount = 4;
  const activeDot = visibleWords.length > 0
    ? Math.min(dotCount - 1, Math.floor((index / visibleWords.length) * dotCount))
    : 0;

  /* ─── EMPTY STATE ─── */
  if (!words || words.length === 0) {
    return (
      <div style={S.root}>
        <div style={S.emptyWrap}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📘</div>
          <p style={{ fontWeight: 700, color: C.navy, fontSize: 15 }}>Chưa có dữ liệu từ vựng</p>
          <p style={{ fontSize: 13, marginTop: 4, color: C.gray }}>Hãy truyền vào prop <code>words</code></p>
        </div>
      </div>
    );
  }

  /* ─── RENDER ─── */
  return (
    <div style={S.root}>
      <div style={S.shell}>

        {/* PANEL TRÊN: tiêu đề + trạng thái + progress */}
        <div style={{ ...S.panel, backgroundImage: `url(${lighthouse})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}>
          <div style={S.topBar}>
            <div style={S.titleGroup}>
              <span style={S.titleIcon}>📖</span>
              <span style={S.appTitle}>Học từ mới</span>
            </div>
            <StatusPill isPlaying={isPlaying} isPaused={isPaused} />
          </div>

          <div style={S.progressRow}>
            <div style={S.progressTrack}>
              <div style={{ ...S.progressFill, width: `${progressPct}%` }} />
            </div>
            <span style={S.progressLabel}>{index + 1} / {visibleWords.length}</span>
          </div>

          {/* FLASHCARD CONTAINER (CHẾ ĐỘ THỦ CÔNG) */}
          <div style={S.cardOuter}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              {!isPlaying && (
                <motion.div
                  key={index}
                  custom={direction}
                  variants={cardVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  dragDirectionLock
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    cursor: "grab",
                    touchAction: "pan-y"
                  }}
                  whileTap={{ cursor: "grabbing", scale: 0.98 }}
                  onDragEnd={(_, info) => {
                    const x = info.offset.x;
                    const velocity = info.velocity.x;
                    if (x < -100 || velocity < -400) goNext();
                    else if (x > 100 || velocity > 400) goPrev();
                  }}
                  onClick={() => {
                    const nextFlipped = !isFlipped;
                    setIsFlipped(nextFlipped);
                    if (nextFlipped) {
                      speak(currentWord.Meaning, "vi-VN", true);
                    } else {
                      speak(currentWord.Word, "en-US", true);
                    }
                  }}
                >
                  {/* 3-D flip inner */}
                  <div style={{
                    ...S.cardInner,
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}>
                    {/* FRONT — ảnh minh hoạ + EN + IPA */}
                    <div style={{ ...S.face, ...S.faceFront }}>
                      {/* <div style={S.imageBlock}>
                        <div style={S.imageGradient} />
                        <div style={S.imageDecor}>✦</div>
                        <div style={S.imageDecor2}>✧</div>
                        <span style={S.badgeEn}>EN</span>
                        <button
                          style={S.speakerFloat}
                          onClick={(e) => { e.stopPropagation(); speak(currentWord.Word, "en-US", true); }}
                        >
                          <SpeakerIcon color={C.purple} />
                        </button>
                      </div> */}

                      <div ref={frontRef} style={S.textWrap}>
                        <div ref={frontTextRef} style={{ ...S.wordText, fontSize: frontSize, color: C.navy }}>
                          {currentWord.Word}
                        </div>
                        <div style={S.ipaText}>/{currentWord.IPA}/</div>
                      </div>
                    </div>

                    {/* BACK — nghĩa tiếng Việt */}
                    <div style={{ ...S.face, ...S.faceBack }}>
                      <span style={{ ...S.badgeChip, background: C.greenSoft, color: C.green }}>VI</span>
                      <button
                        style={{ ...S.speakerFloat, top: 16, right: 16 }}
                        onClick={(e) => { e.stopPropagation(); speak(currentWord.Meaning, "vi-VN", true); }}
                      >
                        <SpeakerIcon color={C.green} />
                      </button>
                      <div ref={backRef} style={S.textWrap}>
                        <div ref={backTextRef} style={{ ...S.wordText, fontSize: backSize, color: C.navy }}>
                          {currentWord.Meaning}
                        </div>
                        <div style={{ ...S.hintRow, color: C.green }}>
                          <RotateIcon /> Chạm để lật lại
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DOT INDICATOR */}
          {!isPlaying && (
            <div style={S.dotsRow}>
              {Array.from({ length: dotCount }).map((_, i) => (
                <span key={i} style={S.dot(i === activeDot)} />
              ))}
            </div>
          )}

          {/* VÍ DỤ */}
          {!isPlaying && (
            <div style={S.exampleCard}>
              <div style={S.exampleHeader}>💡 Định Nghĩa</div>
              <div style={S.exampleList}>
                {currentWord.Notes && currentWord.Notes.map((note, i) => (
                  <div key={i} style={S.exampleItem}>
                    <span style={S.exampleNumber}>{i + 1}</span>
                    <span style={S.exampleText}>{note}</span>
                  </div>
                ))}
              </div>
              <div style={S.exampleFooter}>
                <span className="vl-see-more" style={S.seeMoreLink}>Xem thêm ví dụ →</span>
              </div>
              <div style={S.bookIllustration}>📖</div>
            </div>
          )}

          {/* {!isPlaying && (
            <div style={S.tip}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
              <span style={S.tipText}>
                Vuốt trái/phải để chuyển từ, chạm vào thẻ để lật xem nghĩa.
              </span>
            </div>
          )} */}
          {!isPlaying && (
            <div style={S.controlRow}>
              <button
                className="vl-press"
                onClick={() => speak(currentWord.Word, "en-US", true)}
                style={S.pillBtn(C.redSoft, C.red, C.redSoftBorder)}
              >
                <SpeakerIcon color={C.red} /> Nghe EN
              </button>

              <button className="vl-press" onClick={startPlay} style={S.circleBtn}>
                <PlayIcon />
              </button>

              <button
                className="vl-press"
                onClick={() => speak(currentWord.Meaning, "vi-VN", true)}
                style={S.pillBtn(C.greenSoft, C.green, C.greenSoftBorder)}
              >
                <SpeakerIcon color={C.green} /> Nghe VI
              </button>
            </div>
          )}
        </div>

        {/* SPEAK ROW / BOTTOM CONTROL — nổi phía dưới panel */}
        {/* {!isPlaying && (
          <div style={S.controlRow}>
            <button
              className="vl-press"
              onClick={() => speak(currentWord.Word, "en-US", true)}
              style={S.pillBtn(C.redSoft, C.red, C.redSoftBorder)}
            >
              <SpeakerIcon color={C.red} /> Nghe EN
            </button>

            <button className="vl-press" onClick={startPlay} style={S.circleBtn}>
              <PlayIcon />
            </button>

            <button
              className="vl-press"
              onClick={() => speak(currentWord.Meaning, "vi-VN", true)}
              style={S.pillBtn(C.greenSoft, C.green, C.greenSoftBorder)}
            >
              <SpeakerIcon color={C.green} /> Nghe VI
            </button>
          </div>
        )} */}

        {/* ─────────────────────────────────────────────────────────
            MODAL PHÁT TỰ ĐỘNG TOÀN MÀN HÌNH
           ───────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {isPlaying && (
            <motion.div
              style={{ ...S.modalBackdrop}}   
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                style={{...S.modalContent,
                  backgroundImage: `url(${lighthouse})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat"
                }}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
              >
                {/* Header Modal */}
                <div style={{...S.modalHeader}}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={S.modalTitle}>⚡ Đang phát tự động</span>
                    <span style={S.modalSubtitle}>Từ số {index + 1} trên tổng {visibleWords.length} từ</span>
                  </div>
                  <button style={S.modalCloseBtn} onClick={stopPlay}>✕ Dừng</button>
                </div>

                {/* Khung thẻ bên trong Modal */}
                <div style={S.modalCardContainer}>
                  <div style={{
                    ...S.cardInner,
                    transform: cardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}>
                    {/* FRONT */}
                    <div style={{ ...S.face, ...S.faceFront }}>                      
                      <div ref={frontRef} style={S.textWrap}>
                        <div ref={frontTextRef} style={{ ...S.wordText, fontSize: frontSize, color: C.navy }}>
                          {currentWord.Word}
                        </div>
                        {phase === "en" && (
                          <div style={{ ...S.hintRow, color: C.purple }}>
                            <SpeakerIcon color={C.purple} /> Đang phát âm…
                          </div>
                        )}
                      </div>
                    </div>

                    {/* BACK */}
                    <div style={{ ...S.face, ...S.faceBack }}>
                      <span style={{ ...S.badgeChip, background: C.greenSoft, color: C.green }}>VI</span>
                      <div ref={backRef} style={S.textWrap}>
                        <div ref={backTextRef} style={{ ...S.wordText, fontSize: backSize, color: C.navy }}>
                          {currentWord.Meaning}
                        </div>
                        {phase === "vi" && (
                          <div style={{ ...S.hintRow, color: C.green }}>
                            <SpeakerIcon color={C.green} /> Đang đọc nghĩa…
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thanh tiến trình riêng bên trong Modal */}
                <div style={{ ...S.progressTrack, margin: "16px 0", height: 6 }}>
                  <div style={{ ...S.progressFill, width: `${progressPct}%` }} />
                </div>

                {/* Các nút điều khiển dưới đáy Modal */}
                <div style={{ display: "flex", gap: 10, width: "100%" }}>
                  <button onClick={isPaused ? resumePlay : pausePlay} style={S.modalPauseBtn(isPaused)}>
                    {isPaused ? <PlayIcon /> : <PauseIcon />} {isPaused ? "Tiếp tục" : "Tạm dừng"}
                  </button>
                  <button onClick={stopPlay} style={S.modalStopBtn}>
                    <StopIcon /> Thoát phát
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   SUB-COMPONENTS & ICONS & STYLES
──────────────────────────────────────────────── */
function StatusPill({ isPlaying, isPaused }) {
  const idle    = { bg: C.purpleSoft, color: C.gray,   label: "Tự học" };
  const playing = { bg: C.purpleSoft, color: C.purple, label: "Auto play" };
  const paused  = { bg: C.amberSoft,  color: C.amber,  label: "Tạm dừng" };
  const p = !isPlaying ? idle : isPaused ? paused : playing;
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, padding: "4px 10px",
      borderRadius: 99, background: p.bg, color: p.color,
      letterSpacing: "0.02em",
    }}>
      {p.label}
    </div>
  );
}

const SpeakerIcon = ({ color = "currentColor" }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
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
  <svg width={20} height={20} viewBox="0 0 24 24" fill="#fff" stroke="#fff"
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
  <svg width={11} height={11} viewBox="0 0 24 24" fill="#EF6660">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
  </svg>
);

const S = {
  root: { width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "0 16px 14px", boxSizing: "border-box", overflow: "hidden", background: "transparent" },
  shell: { width: "100%", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden", gap: 14 },

  emptyWrap: { textAlign: "center", padding: "60px 0", background: C.white, borderRadius: 24, boxShadow: C.cardShadow },

  panel: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    background: C.panelBg,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: `1px solid ${C.border}`,
    borderRadius: 28,
    padding: "16px 16px 14px",
    boxSizing: "border-box",
    overflowY: "auto",
    gap: 10,
  },

  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  titleGroup: { display: "flex", alignItems: "center", gap: 8 },
  titleIcon: { fontSize: 16 },
  appTitle: { fontSize: 15, fontWeight: 700, color: C.navy },

  progressRow: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  progressTrack: { flex: 1, height: 6, background: "rgba(24,33,77,0.07)", borderRadius: 99, overflow: "hidden", position: "relative" },
  progressFill: { height: "100%", background: C.purpleGradient, borderRadius: 99, transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)" },
  progressLabel: { fontSize: 12, fontWeight: 700, color: C.gray, flexShrink: 0, fontFamily: "'Space Grotesk', sans-serif" },

  cardOuter: { flex: 1, minHeight: 220, perspective: 1400, userSelect: "none", position: "relative" },
  cardInner: { position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d", transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1)" },

  face: {
    position: "absolute", inset: 0, borderRadius: 24,
    display: "flex", flexDirection: "column",
    backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
    boxSizing: "border-box", overflow: "hidden", opacity: 1,
    background: C.white, boxShadow: C.cardShadow,
  },
  faceFront: {

  },
  faceBack: {
    transform: "rotateY(180deg)",
    alignItems: "center", justifyContent: "center",
    padding: 22, textAlign: "center",
    //background: "linear-gradient(160deg, #ffffff 0%, #eafbf2 100%)",
    background: C.white,

  },

  imageBlock: {
    position: "relative",
    flex: "0 0 46%",
    margin: 10,
    marginBottom: 6,
    borderRadius: 18,
    overflow: "hidden",
  },
  imageGradient: {
    position: "absolute", inset: 0,
    background: "linear-gradient(135deg, #c9cffb 0%, #a9c6ff 45%, #bfe7e2 100%)",
  },
  imageDecor: { position: "absolute", top: "22%", left: "14%", fontSize: 22, color: "rgba(255,255,255,0.85)" },
  imageDecor2: { position: "absolute", bottom: "18%", right: "20%", fontSize: 14, color: "rgba(255,255,255,0.7)" },
  badgeEn: {
    position: "absolute", top: 10, right: 10,
    background: C.white, color: C.purple,
    fontSize: 11, fontWeight: 800, padding: "4px 10px",
    borderRadius: 12, boxShadow: "0 4px 10px rgba(24,33,77,0.12)",
  },
  badgeChip: {
    position: "absolute", top: 16, left: 16,
    fontSize: 11, fontWeight: 800, padding: "4px 10px",
    borderRadius: 8,
  },
  speakerFloat: {
    position: "absolute", bottom: -18, right: 16,
    width: 40, height: 40, borderRadius: "50%",
    background: C.white, border: "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 8px 18px rgba(24,33,77,0.18)",
    cursor: "pointer", zIndex: 2,
  },

  textWrap: {
    flex: 1, minHeight: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "14px 16px 10px",
    textAlign: "center",
  },
  wordText: { fontWeight: 800, lineHeight: 1.15, textAlign: "center", wordBreak: "break-word", whiteSpace: "pre-wrap", fontFamily: "'Be Vietnam Pro', sans-serif" },
  ipaText: { fontSize: 18, color: C.gray, marginTop: 8, fontWeight: 500 },
  hintRow: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, marginTop: 10, fontWeight: 600 },

  dotsRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexShrink: 0 },
  dot: (active) => ({
    width: active ? 18 : 6, height: 6, borderRadius: 99,
    background: active ? C.purpleGradient : "#dcdcec",
    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
  }),

  exampleCard: {
    position: "relative",
    background: C.white, borderRadius: 22,
    boxShadow: C.cardShadow,
    padding: "18px 18px 16px",
    flexShrink: 0,
    overflow: "hidden",
  },
  exampleHeader: { fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 12 },
  exampleList: { display: "flex", flexDirection: "column", gap: 12 },
  exampleItem: { display: "flex", alignItems: "flex-start", gap: 10 },
  exampleNumber: {
    flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
    background: C.purpleSoft, color: C.purple,
    fontSize: 11.5, fontWeight: 800,
    display: "flex", alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  exampleText: { fontSize: 13.5, color: "#3d4566", lineHeight: 1.8, textAlign: "left" },
  exampleFooter: { marginTop: 14, display: "flex", justifyContent: "flex-end" },
  seeMoreLink: { fontSize: 12.5, fontWeight: 700, color: C.purple, cursor: "default" },
  bookIllustration: { position: "absolute", bottom: 8, right: 14, fontSize: 34, opacity: 0.10, pointerEvents: "none" },

  tip: { display: "flex", alignItems: "flex-start", gap: 8, background: C.purpleSoft, borderRadius: 14, padding: "10px 14px", flexShrink: 0 },
  tipText: { fontSize: 12, color: "#5a5f8a", lineHeight: 1.5 },

  controlRow: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0, padding: "2px 4px 4px" },
  pillBtn: (bg, color, border) => ({
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    background: bg, border: `1px solid ${border}`, color: color,
    borderRadius: 999, padding: "14px 10px", fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif",
  }),
  circleBtn: {
    width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
    background: C.purpleGradient, border: "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 14px 30px rgba(91,91,245,0.42)",
    cursor: "pointer",
    marginTop: -16,
  },

  /* ── STYLES CHO MODAL PHÁT TỰ ĐỘNG ── */
  modalBackdrop: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(20, 20, 45, 0.45)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  modalContent: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 28,
    width: "100%",
    maxWidth: 400,
    height: "90vh",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 30px 70px rgba(24,33,77,0.25)",
    boxSizing: "border-box"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    width: "100%"
  },
  modalTitle: { fontSize: 15, fontWeight: 700, color: C.navy },
  modalSubtitle: { fontSize: 12, color: C.gray },
  modalCloseBtn: {
    background: C.redSoft,
    border: `1px solid ${C.redSoftBorder}`,
    color: C.red,
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 10,
    padding: "7px 14px",
    cursor: "pointer"
  },
  modalCardContainer: {
    width: "100%",
    height: "75vh",
    perspective: 1400,
    position: "relative"
  },
  modalPauseBtn: (isPaused) => ({
    flex: 1,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    background: isPaused ? C.purpleGradient : C.purpleSoft,
    border: isPaused ? "none" : `1px solid ${C.purpleSoftBorder}`,
    color: isPaused ? "#fff" : C.purple,
    borderRadius: 16, padding: "15px 8px", fontSize: 13, fontWeight: 700,
    cursor: "pointer"
  }),
  modalStopBtn: {
    flex: 1,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    background: C.redSoft,
    border: `1px solid ${C.redSoftBorder}`,
    color: C.red,
    borderRadius: 16, padding: "15px 8px", fontSize: 13, fontWeight: 700,
    cursor: "pointer"
  }
};
