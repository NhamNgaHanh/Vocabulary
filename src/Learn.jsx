import { useEffect, useEffectEvent, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Play, Pause, Square, RotateCcw, ChevronLeft, ChevronRight, Plus, Layers, ChevronDown, Sprout, CircleCheck } from "lucide-react";
import FitText from "./components/FitText";
import { Button, Chip, ProgressBar, Segmented } from "./components/ui";
import { cx } from "./lib/cx";
import { speak, cancelSpeech } from "./lib/tts";
import lighthouse from "./assets/lighthouse.webp";

const cardVariants = {
  enter: (d) => ({ x: d > 0 ? 120 : d < 0 ? -120 : 0, opacity: 0, rotate: d * 4, scale: 0.96 }),
  center: { x: 0, opacity: 1, rotate: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 30 } },
  exit: (d) => ({ x: d > 0 ? -120 : d < 0 ? 120 : 0, opacity: 0, rotate: -d * 4, scale: 0.96, transition: { duration: 0.2 } }),
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Một số trình duyệt (Safari) đôi khi không bắn onend → luôn có thời hạn dự phòng.
const say = (text, lang) => Promise.race([speak(text, lang), wait(Math.max(2500, (text?.length || 0) * 160 + 1500))]);

const BADGE_TONE = { new: "warn", learning: "bad", review: "brand", mature: "good" };

/**
 * Học từ: thẻ lật 3D, vuốt chuyển từ, phát tự động.
 * Phím tắt: ←/→ chuyển từ · Space/Enter lật thẻ · P phát tự động · Esc dừng.
 */
export default function Learn({ collections = [], getBadge, onAddNew, onStartReview }) {
  const [activeId, setActiveId] = useState(() => (collections.find((c) => c.words.length) ?? collections[0])?.id);
  const [rawIndex, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [player, setPlayer] = useState({ playing: false, paused: false, phase: "en" });

  const runRef = useRef(0);
  const draggedRef = useRef(false);

  const active = collections.find((c) => c.id === activeId) ?? collections[0];
  const words = active?.words ?? [];
  const total = words.length;
  const index = total ? Math.min(rawIndex, total - 1) : 0;
  const word = words[index] ?? { Word: "", Meaning: "", Notes: [] };
  const hasMore = Boolean(word.Notes?.length || word.Example || word.Synonyms || word.Antonyms);

  useEffect(
    () => () => {
      runRef.current += 1;
      cancelSpeech();
    },
    [],
  );

  /* ── Điều hướng thủ công ── */
  const changeWord = (step) => {
    if (player.playing || total < 2) return;
    const next = (index + step + total) % total;
    setDirection(step);
    setIndex(next);
    setIsFlipped(false);
    setShowMore(false);
    speak(words[next]?.Word, "en-US");
  };

  const flip = () => {
    const next = !isFlipped;
    setIsFlipped(next);
    speak(next ? word.Meaning : word.Word, next ? "vi-VN" : "en-US");
  };

  /* ── Phát tự động ── */
  async function runFrom(start) {
    const token = ++runRef.current;
    const alive = () => token === runRef.current;
    for (let i = start; i < total; i++) {
      const w = words[i];
      setIndex(i);
      setPlayer((p) => ({ ...p, phase: "en" }));
      await Promise.all([say(w.Word, "en-US"), wait(900)]);
      if (!alive()) return;
      setPlayer((p) => ({ ...p, phase: "vi" }));
      await Promise.all([say(w.Meaning, "vi-VN"), wait(900)]);
      if (!alive()) return;
      setPlayer((p) => ({ ...p, phase: "fade" }));
      await wait(500);
      if (!alive()) return;
    }
    stopPlay();
  }

  const startPlay = () => {
    if (!total) return;
    setIsFlipped(false);
    setShowMore(false);
    setPlayer({ playing: true, paused: false, phase: "en" });
    runFrom(0);
  };
  const pausePlay = () => {
    runRef.current += 1;
    cancelSpeech();
    setPlayer((p) => ({ ...p, paused: true }));
  };
  const resumePlay = () => {
    setPlayer((p) => ({ ...p, paused: false }));
    runFrom(index);
  };
  function stopPlay() {
    runRef.current += 1;
    cancelSpeech();
    setPlayer({ playing: false, paused: false, phase: "en" });
    setIsFlipped(false);
  }

  const switchCollection = (id) => {
    if (id === activeId) return;
    if (player.playing) stopPlay();
    setActiveId(id);
    setIndex(0);
    setDirection(0);
    setIsFlipped(false);
    setShowMore(false);
  };

  /* ── Phím tắt ── */
  const onKey = useEffectEvent((e) => {
    if (e.target.closest?.("input, textarea, [data-modal]") && !player.playing) return;
    if (player.playing) {
      if (e.key === "Escape") stopPlay();
      else if (e.key === " ") {
        e.preventDefault();
        if (player.paused) resumePlay();
        else pausePlay();
      }
      return;
    }
    if (e.key === "ArrowRight") changeWord(1);
    else if (e.key === "ArrowLeft") changeWord(-1);
    else if (e.key === " " || e.key === "Enter") {
      if (e.target.closest?.("button:not([data-card])")) return;
      e.preventDefault();
      flip();
    } else if (e.key.toLowerCase() === "p") startPlay();
  });
  useEffect(() => {
    const h = (e) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const segment = (
    <Segmented
      id="learn"
      value={active?.id}
      onChange={switchCollection}
      items={collections.map((c) => ({ value: c.id, label: c.label, count: c.words.length }))}
    />
  );

  /* ─── EMPTY ─── */
  if (!total) {
    const isNew = active?.id === "new";
    return (
      <div className="flex h-full flex-col gap-4 px-4 pt-1 pb-4">
        <div className="flex justify-center">{segment}</div>
        <div className="card flex flex-1 animate-pop flex-col items-center justify-center gap-3 p-8 text-center">
          <div className={cx("grid size-16 place-items-center rounded-3xl", isNew ? "bg-good-soft text-good" : "bg-brand-soft text-brand")}>
            {isNew ? <Sprout size={30} /> : <CircleCheck size={30} />}
          </div>
          <p className="text-lg font-bold">{isNew ? "Đã hết từ mới của hôm nay" : "Không có từ nào đến hạn"}</p>
          <p className="max-w-xs text-sm text-muted">
            {isNew ? "Bạn có thể học thêm, hoặc sang Ôn tập để làm phần đến hạn." : "FSRS sẽ nhắc khi một từ sắp bị quên."}
          </p>
          <div className="mt-3 flex w-full max-w-xs flex-col gap-2">
            {isNew && onAddNew && (
              <Button variant="primary" size="lg" onClick={onAddNew}>
                <Plus size={18} /> Học thêm 5 từ mới
              </Button>
            )}
            {onStartReview && (
              <Button variant="soft" size="lg" onClick={onStartReview}>
                <Layers size={18} /> Sang Ôn tập
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const badge = getBadge?.(word);
  const playerFlipped = player.phase === "vi" || player.phase === "fade";

  return (
    <div className="scroll-soft flex h-full flex-col gap-3 px-4 pt-1 pb-4">
      <div className="flex items-center justify-between gap-3">
        {segment}
        <span className="font-display text-sm font-bold text-ink-2 tabular-nums">
          {index + 1}
          <span className="text-muted"> / {total}</span>
        </span>
      </div>
      <ProgressBar value={index + 1} max={total} />

      {/* FLASHCARD */}
      <div className="relative h-[min(46dvh,400px)] min-h-[260px] shrink-0 perspective-[1400px]" data-pet-ignore>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={`${active?.id}-${index}`}
            data-card
            className="absolute inset-0 cursor-grab touch-pan-y rounded-[1.75rem] outline-none active:cursor-grabbing"
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag={total > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            dragDirectionLock
            whileTap={{ scale: 0.985 }}
            onDragStart={() => {
              draggedRef.current = true;
            }}
            onDragEnd={(_, info) => {
              const { x } = info.offset;
              const v = info.velocity.x;
              if (x < -90 || v < -400) changeWord(1);
              else if (x > 90 || v > 400) changeWord(-1);
            }}
            onClick={() => {
              if (draggedRef.current) {
                draggedRef.current = false;
                return;
              }
              flip();
            }}
            role="button"
            tabIndex={0}
            aria-label={isFlipped ? `Nghĩa: ${word.Meaning}. Nhấn để lật lại` : `Từ: ${word.Word}. Nhấn để xem nghĩa`}
          >
            <CardFaces word={word} flipped={isFlipped} badge={badge} manual />
          </motion.div>
        </AnimatePresence>

        {total > 1 && (
          <>
            <NavArrow side="left" onClick={() => changeWord(-1)} />
            <NavArrow side="right" onClick={() => changeWord(1)} />
          </>
        )}
      </div>

      {/* ĐIỀU KHIỂN */}
      <div className="flex items-center gap-3" data-pet-ignore>
        <Button variant="danger" size="lg" className="flex-1" onClick={() => speak(word.Word, "en-US")}>
          <Volume2 size={17} /> Nghe EN
        </Button>
        <button
          type="button"
          onClick={startPlay}
          aria-label="Phát tự động (P)"
          title="Phát tự động (P)"
          className="tap grid size-16 shrink-0 place-items-center rounded-full bg-linear-to-br from-brand to-brand-2 text-white shadow-glow hover:brightness-110"
        >
          <Play size={24} fill="currentColor" className="translate-x-0.5" />
        </button>
        <Button variant="good" size="lg" className="flex-1" onClick={() => speak(word.Meaning, "vi-VN")}>
          <Volume2 size={17} /> Nghe VI
        </Button>
      </div>

      {/* CHI TIẾT */}
      {hasMore && (
        <div className="card shrink-0 p-4" data-pet-ignore>
          <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore}>
            <span className="text-sm font-bold">💡 Định nghĩa & ví dụ</span>
            <ChevronDown size={18} className={cx("text-muted transition-transform duration-300", showMore && "rotate-180")} />
          </button>
          <AnimatePresence initial={false}>
            {showMore && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pt-3">
                  {word.Notes?.length > 0 && (
                    <ol className="space-y-2">
                      {word.Notes.map((n, i) => (
                        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-[11px] font-bold text-brand-ink">
                            {i + 1}
                          </span>
                          {n}
                        </li>
                      ))}
                    </ol>
                  )}
                  {word.Example && <Detail label="Ví dụ" value={word.Example} speakable />}
                  {word.Synonyms && <Detail label="Đồng nghĩa" value={word.Synonyms} />}
                  {word.Antonyms && <Detail label="Trái nghĩa" value={word.Antonyms} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <p className="hidden text-center text-xs text-muted md:block">← → chuyển từ · Space lật thẻ · P phát tự động</p>

      {/* TRÌNH PHÁT TỰ ĐỘNG */}
      <AnimatePresence>
        {player.playing && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-pet-ignore
            data-modal
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Phát tự động"
              className="relative isolate flex h-[min(88dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-[2rem] p-5 shadow-pop"
              initial={{ scale: 0.92, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 24, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
              <img src={lighthouse} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
              <div className="absolute inset-0 -z-10 bg-linear-to-b from-black/20 via-transparent to-black/50" />

              <div className="mb-4 flex items-start justify-between gap-3 text-white">
                <div>
                  <p className="text-[15px] font-bold drop-shadow">⚡ Đang phát tự động</p>
                  <p className="text-xs text-white/85">
                    Từ {index + 1} / {total}
                  </p>
                </div>
                <Chip tone={player.paused ? "warn" : "brand"}>{player.paused ? "Tạm dừng" : "Đang phát"}</Chip>
              </div>

              <div className="relative min-h-0 flex-1 perspective-[1400px]">
                <CardFaces word={word} flipped={playerFlipped} phase={player.paused ? null : player.phase} glass />
              </div>

              <ProgressBar value={index + 1} max={total} className="my-4 bg-white/40" />

              <div className="flex gap-3">
                <Button variant={player.paused ? "primary" : "ghost"} size="lg" className="flex-1" onClick={player.paused ? resumePlay : pausePlay}>
                  {player.paused ? <Play size={16} fill="currentColor" /> : <Pause size={16} />} {player.paused ? "Tiếp tục" : "Tạm dừng"}
                </Button>
                <Button variant="danger" size="lg" className="flex-1" onClick={stopPlay}>
                  <Square size={14} fill="currentColor" /> Dừng
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────── Sub-components ─────────────── */

function NavArrow({ side, onClick }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Từ trước" : "Từ sau"}
      className={cx(
        "tap absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface/90 text-ink-2 shadow-card backdrop-blur hover:text-brand md:grid",
        side === "left" ? "-left-5" : "-right-5",
      )}
    >
      <Icon size={20} />
    </button>
  );
}

function CardFaces({ word, flipped, manual = false, phase = null, badge = null, glass = false }) {
  const face = cx(
    "backface-hidden absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[1.75rem] px-6 pt-12 pb-7 text-center",
    glass ? "bg-surface/90 shadow-pop backdrop-blur-xl" : "card",
  );
  return (
    <div
      className="preserve-3d relative size-full transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
      style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
    >
      {/* MẶT TRƯỚC */}
      <div className={face}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-brand-soft/70 to-transparent" />
        <Chip tone="brand" className="absolute top-4 left-4">
          EN
        </Chip>
        {badge && (
          <Chip tone={BADGE_TONE[badge.tone]} className="absolute top-4 right-4">
            {badge.text}
          </Chip>
        )}
        <FitText text={word.Word} max={52} min={20} className="font-display font-bold tracking-tight text-ink" />
        {word.IPA && <p className="mt-2 shrink-0 text-lg text-muted">/{word.IPA}/</p>}
        {phase === "en" && <Speaking tone="text-brand">Đang phát âm…</Speaking>}
        {manual && (
          <p className="mt-4 flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
            <RotateCcw size={12} /> Chạm để xem nghĩa · vuốt để chuyển
          </p>
        )}
      </div>

      {/* MẶT SAU */}
      <div className={face} style={{ transform: "rotateY(180deg)" }}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-good-soft/80 to-transparent" />
        <Chip tone="good" className="absolute top-4 left-4">
          VI
        </Chip>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            speak(word.Meaning, "vi-VN");
          }}
          className="tap absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-good-soft text-good"
          aria-label="Nghe nghĩa"
        >
          <Volume2 size={16} />
        </button>
        <FitText text={word.Meaning} max={42} min={18} className="font-bold text-ink" />
        {phase === "vi" && <Speaking tone="text-good">Đang đọc nghĩa…</Speaking>}
        {manual && (
          <p className="mt-4 flex shrink-0 items-center gap-1.5 text-xs font-medium text-good">
            <RotateCcw size={12} /> Chạm để lật lại
          </p>
        )}
      </div>
    </div>
  );
}

function Speaking({ tone, children }) {
  return (
    <p className={cx("mt-3 flex shrink-0 items-center gap-2 text-xs font-semibold", tone)}>
      <span className="flex h-3 items-end gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-0.5 rounded-full bg-current"
            animate={{ height: [4, 12, 4] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
      {children}
    </p>
  );
}

function Detail({ label, value, speakable }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3.5 py-2.5">
      <p className="text-[11px] font-bold tracking-wide text-brand-ink uppercase">{label}</p>
      <div className="mt-0.5 flex items-start gap-2 text-sm leading-relaxed text-ink-2">
        <span className="flex-1">{value}</span>
        {speakable && (
          <button
            type="button"
            onClick={() => speak(value, "en-US")}
            className="tap grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"
            aria-label={`Nghe: ${value}`}
          >
            <Volume2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
