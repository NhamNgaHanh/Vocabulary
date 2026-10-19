import { useEffect, useEffectEvent, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, RotateCw, Plus, Target, ArrowRight, Trophy, Dumbbell, BookOpen, PartyPopper } from "lucide-react";
import { Button, Chip, ProgressBar } from "./components/ui";
import { cx } from "./lib/cx";
import { shuffle } from "./lib/random";
import { speak, cancelSpeech } from "./lib/tts";
import { playSound, preloadSounds } from "./lib/sound";
import { Rating, previewIntervals, formatInterval, getCard } from "./lib/srs";
import { recordReview } from "./hooks/useSrs";

const AUTO_NEXT_MS = 2600;
const OPTION_COUNT = 4;
const SLOW_MS = 10_000; // đúng nhưng nghĩ quá 10 giây → "Khó"
const MAX_REPEATS = 3;

const GRADES = [
  { r: Rating.Hard, label: "Khó", key: "H", cls: "text-warn" },
  { r: Rating.Good, label: "Tốt", key: "G", cls: "text-good" },
  { r: Rating.Easy, label: "Dễ", key: "E", cls: "text-info" },
];

const randDir = () => (Math.random() < 0.5 ? "en2vi" : "vi2en");

/** Câu hỏi trắc nghiệm; đáp án nhiễu lấy từ TOÀN BỘ bộ từ. */
function buildQuestion({ word, dir }, pool) {
  const field = dir === "en2vi" ? "Meaning" : "Word";
  const answer = word[field];
  const seen = new Set([answer.toLowerCase()]);
  const wrong = [];
  for (const w of shuffle(pool)) {
    const t = w[field];
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    wrong.push({ text: t, correct: false });
    if (wrong.length === OPTION_COUNT - 1) break;
  }
  return {
    word,
    dir,
    isNew: !getCard(word),
    prompt: dir === "en2vi" ? word.Word : word.Meaning,
    answer,
    options: shuffle([{ text: answer, correct: true }, ...wrong]),
  };
}

function startSession(items, pool, practice) {
  const queue = items.map((word) => ({ word, dir: randDir(), repeat: 0 }));
  return {
    practice,
    queue,
    qIndex: 0,
    question: queue.length ? buildQuestion(queue[0], pool) : null,
    picked: null,
    grade: null,
    preview: null,
    counts: { [Rating.Again]: 0, [Rating.Hard]: 0, [Rating.Good]: 0, [Rating.Easy]: 0 },
    relearn: 0,
    finished: queue.length === 0,
  };
}

/**
 * Ôn tập theo FSRS.
 * Phím tắt: 1–4 chọn đáp án · Enter/→ câu tiếp · H/G/E = Khó/Tốt/Dễ sau khi trả lời đúng.
 */
export default function Review({ due = [], fresh = [], practicePool = [], allWords = [], dueTomorrow = 0, onAddNew }) {
  const pool = allWords.length >= OPTION_COUNT ? allWords : [...due, ...fresh];
  const [session, setSession] = useState(() => startSession([...due, ...shuffle(fresh)], pool, false));
  const timerRef = useRef(null);
  const shownAtRef = useRef(0);
  const pendingRef = useRef(null);

  const { question, picked, finished } = session;
  const locked = picked !== null;
  const isCorrect = locked && question.options[picked].correct;
  const total = session.queue.length;

  const commitPending = (gradeOverride) => {
    const p = pendingRef.current;
    if (!p) return false;
    pendingRef.current = null;
    if (p.practice) return p.grade === Rating.Again;
    return recordReview(p.word, gradeOverride ?? p.grade).stillLearning;
  };

  useEffect(() => {
    preloadSounds("ding", "buzz");
    return () => {
      clearTimeout(timerRef.current);
      cancelSpeech();
      commitPending(); // rời tab giữa chừng vẫn lưu câu vừa trả lời
    };
  }, []);

  useEffect(() => {
    if (!question) return;
    shownAtRef.current = performance.now();
    if (question.dir === "en2vi") speak(question.word.Word, "en-US");
    else speak(question.word.Meaning, "vi-VN");
  }, [question]);

  const goNext = (gradeOverride) => {
    clearTimeout(timerRef.current);
    const p = pendingRef.current;
    const finalGrade = gradeOverride ?? p?.grade;
    const again = commitPending(gradeOverride);
    const requeue = again && p ? { word: p.word, dir: randDir() } : null;
    setSession((cur) => {
      const queue = [...cur.queue];
      let relearn = cur.relearn;
      if (requeue) {
        const prevRepeat = cur.queue[cur.qIndex]?.repeat ?? 0;
        if (prevRepeat < MAX_REPEATS) {
          queue.splice(Math.min(queue.length, cur.qIndex + 4), 0, { ...requeue, repeat: prevRepeat + 1 });
          relearn += 1;
        }
      }
      const counts = finalGrade ? { ...cur.counts, [finalGrade]: cur.counts[finalGrade] + 1 } : cur.counts;
      const nextIdx = cur.qIndex + 1;
      const base = { ...cur, queue, counts, relearn, picked: null, grade: null, preview: null };
      if (nextIdx >= queue.length) return { ...base, finished: true };
      return { ...base, qIndex: nextIdx, question: buildQuestion(queue[nextIdx], pool) };
    });
  };

  const choose = (i) => {
    if (locked || !question) return;
    const correct = question.options[i].correct;
    const thinkMs = performance.now() - shownAtRef.current;
    const grade = !correct ? Rating.Again : thinkMs > SLOW_MS ? Rating.Hard : Rating.Good;
    playSound(correct ? "ding" : "buzz");
    if (!correct) speak(question.word.Word, "en-US");
    if (navigator.vibrate && !correct) navigator.vibrate(60);
    pendingRef.current = { word: question.word, grade, practice: session.practice };
    const preview = session.practice ? null : previewIntervals(question.word);
    setSession((cur) => ({ ...cur, picked: i, grade, preview }));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => goNext(), AUTO_NEXT_MS);
  };

  const restart = (items, practice) => {
    clearTimeout(timerRef.current);
    commitPending();
    setSession(startSession(shuffle(items), pool, practice));
  };

  const onKey = useEffectEvent((e) => {
    if (e.target.closest?.("input, textarea") || finished || !question) return;
    const n = parseInt(e.key, 10);
    if (!locked && n >= 1 && n <= question.options.length) return choose(n - 1);
    if (!locked) return;
    const k = e.key.toLowerCase();
    if (e.key === "Enter" || e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    } else if (isCorrect && !session.practice && ["h", "g", "e"].includes(k)) {
      goNext({ h: Rating.Hard, g: Rating.Good, e: Rating.Easy }[k]);
    }
  });
  useEffect(() => {
    const h = (e) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ── Kết thúc / không có việc ── */
  if (finished) {
    const c = session.counts;
    const answered = c[Rating.Again] + c[Rating.Hard] + c[Rating.Good] + c[Rating.Easy];
    const pct = answered ? Math.round(((answered - c[Rating.Again]) / answered) * 100) : 0;
    const nothing = answered === 0;
    const Icon = nothing ? PartyPopper : pct >= 85 ? Trophy : pct >= 60 ? Dumbbell : BookOpen;
    return (
      <div className="scroll-soft flex h-full flex-col px-4 pb-4">
        <div className="card m-auto w-full animate-pop p-6 text-center" data-pet-ignore>
          <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-linear-to-br from-brand to-brand-2 text-white shadow-glow">
            <Icon size={30} />
          </div>
          <p className="mt-4 text-lg font-bold">
            {nothing ? "Hôm nay không còn từ nào cần ôn!" : session.practice ? "Xong phần luyện tự do" : "Hoàn thành phiên ôn tập"}
          </p>

          {!nothing && (
            <>
              <p className="mt-1 text-ink-2">
                <b className="font-display text-2xl text-good">{answered - c[Rating.Again]}</b> / {answered} lần đúng · {pct}%
              </p>
              {!session.practice && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    [Rating.Again, "Quên", "bad"],
                    [Rating.Hard, "Khó", "warn"],
                    [Rating.Good, "Tốt", "good"],
                    [Rating.Easy, "Dễ", "info"],
                  ].map(([r, label, tone]) => (
                    <div key={r} className="rounded-2xl bg-surface-2 py-2">
                      <p className="font-display text-xl font-bold">{c[r]}</p>
                      <Chip tone={tone} className="mt-1">
                        {label}
                      </Chip>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <p className="mt-4 text-sm leading-relaxed text-muted">
            {session.practice
              ? "Luyện tự do không làm thay đổi lịch ôn."
              : dueTomorrow > 0
                ? `Còn ${dueTomorrow} từ đến hạn nhưng đã chạm giới hạn ôn/ngày.`
                : "Lịch FSRS đã được cập nhật — hẹn gặp lại ở lần ôn tới!"}
          </p>

          <div className="mt-5 flex flex-col gap-2">
            {onAddNew && (
              <Button variant="primary" size="lg" onClick={onAddNew}>
                <Plus size={18} /> Học thêm 5 từ mới
              </Button>
            )}
            {practicePool.length > 0 && (
              <Button variant="soft" size="lg" onClick={() => restart(practicePool, true)}>
                <Target size={18} /> Luyện tự do ({practicePool.length} từ hôm nay)
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const hint = question.dir === "en2vi" ? "Nghĩa tiếng Việt là gì?" : "Từ tiếng Anh tương ứng là gì?";
  const preview = session.preview;
  const answeredCount = Object.values(session.counts).reduce((a, b) => a + b, 0);
  const correctCount = answeredCount - session.counts[Rating.Again];

  return (
    <div className="scroll-soft flex h-full flex-col gap-3 px-4 pt-1 pb-4">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-[15px] font-bold">{session.practice ? "🎯 Luyện tự do" : "🧠 Ôn tập FSRS"}</h1>
        {session.relearn > 0 && (
          <Chip tone="warn" className="font-display">
            <RotateCw size={11} /> {session.relearn}
          </Chip>
        )}
        <Chip tone="brand" className="font-display">
          {session.qIndex + 1} / {total}
        </Chip>
      </div>
      <ProgressBar value={session.qIndex + 1} max={total} tone="good" />

      {/* CÂU HỎI */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={session.qIndex}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 360, damping: 32 }}
          className="card relative flex min-h-[170px] flex-1 flex-col items-center justify-center overflow-hidden px-5 py-8 text-center"
          data-pet-ignore
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-brand-soft/70 to-transparent" />
          {question.isNew && !session.practice && (
            <Chip tone="warn" className="absolute top-3.5 left-3.5">
              Từ mới
            </Chip>
          )}
          <Chip tone="brand" className="absolute top-3.5 right-3.5">
            {question.dir === "en2vi" ? "EN → VI" : "VI → EN"}
          </Chip>
          <button
            type="button"
            title="Nghe lại"
            onClick={() => (question.dir === "en2vi" ? speak(question.word.Word, "en-US") : speak(question.word.Meaning, "vi-VN"))}
            className="group relative max-w-full font-display text-[clamp(1.7rem,7vw,2.6rem)] leading-tight font-bold tracking-tight break-words text-ink"
          >
            {question.prompt}
            <Volume2 size={18} className="ml-2 inline-block align-middle text-muted opacity-60 transition group-hover:text-brand group-hover:opacity-100" />
          </button>
          <p className="relative mt-2 text-sm text-muted">{hint}</p>
        </motion.div>
      </AnimatePresence>

      {/* ĐÁP ÁN */}
      <div className="grid shrink-0 grid-cols-2 gap-2.5" data-pet-ignore>
        {question.options.map((opt, i) => {
          let state = "border-line bg-surface hover:border-brand/40 hover:-translate-y-0.5";
          let keyCls = "bg-brand-soft text-brand-ink";
          if (locked) {
            if (i === picked && opt.correct) {
              state = "border-good bg-good-soft text-good ring-4 ring-good/15";
              keyCls = "bg-good text-white";
            } else if (i === picked) {
              state = "border-bad bg-bad-soft text-bad ring-4 ring-bad/15 animate-shake";
              keyCls = "bg-bad text-white";
            } else if (opt.correct) {
              state = "border-good bg-good-soft text-good";
              keyCls = "bg-good text-white";
            } else state = "border-line bg-surface opacity-45";
          }
          return (
            <button
              key={`${session.qIndex}-${i}`}
              type="button"
              disabled={locked}
              onClick={() => choose(i)}
              className={cx(
                "tap flex min-h-16 items-center gap-2.5 rounded-2xl border-[1.5px] px-3.5 py-3 text-left text-[clamp(.95rem,3.8vw,1.1rem)] font-semibold break-words text-ink-2 shadow-card",
                state,
              )}
            >
              <span className={cx("grid size-6 shrink-0 place-items-center rounded-full font-display text-xs font-bold", keyCls)}>{i + 1}</span>
              <span className="min-w-0">{opt.text}</span>
            </button>
          );
        })}
      </div>

      {/* PHẢN HỒI */}
      <div className="min-h-[60px] shrink-0" data-pet-ignore aria-live="polite">
        <AnimatePresence mode="wait">
          {locked && (
            <motion.div
              key="fb"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cx(
                "flex flex-wrap items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-semibold",
                isCorrect ? "border-good/25 bg-good-soft text-good" : "border-bad/25 bg-bad-soft text-bad",
              )}
            >
              {isCorrect && preview ? (
                <>
                  <span className="mr-auto">🎉 Đúng! Ôn lại sau:</span>
                  <div className="flex gap-1.5">
                    {GRADES.map((g) => (
                      <button
                        key={g.r}
                        type="button"
                        onClick={() => goNext(g.r)}
                        title={`${g.label} — phím ${g.key}`}
                        className={cx(
                          "tap flex min-w-[62px] flex-col items-center rounded-xl border-[1.5px] bg-surface px-2 py-1 leading-tight",
                          g.cls,
                          session.grade === g.r ? "border-current shadow-card" : "border-transparent",
                        )}
                      >
                        <b className="text-[12px]">{g.label}</b>
                        <small className="font-display text-[10.5px] text-muted">{formatInterval(preview[g.r])}</small>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <span className="mr-auto min-w-0">
                    {isCorrect ? "🎉 Xuất sắc! Bạn đúng rồi." : `💡 Đáp án: ${question.answer}`}
                    {!isCorrect && preview && <span className="font-normal opacity-80"> · ôn lại sau {formatInterval(preview[Rating.Again])}</span>}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => goNext()}>
                    Tiếp <ArrowRight size={15} />
                  </Button>
                </>
              )}
              <motion.div
                key={`bar-${session.qIndex}`}
                className={cx("h-0.5 w-full origin-left rounded-full", isCorrect ? "bg-good/40" : "bg-bad/40")}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: AUTO_NEXT_MS / 1000, ease: "linear" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="shrink-0 text-center text-xs font-semibold tracking-wide text-muted">
        ĐÚNG <span className="font-display text-good">{correctCount}</span> / {answeredCount} LẦN
        <span className="hidden md:inline"> · phím 1–4 chọn · H/G/E chấm</span>
      </p>
    </div>
  );
}
