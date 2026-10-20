import { useEffect, useEffectEvent, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, RotateCw, Plus, Target, ArrowRight, Trophy, Dumbbell, BookOpen, PartyPopper, Eye } from "lucide-react";
import { Button, Chip, ProgressBar, Segmented } from "./components/ui";
import { cx } from "./lib/cx";
import { shuffle } from "./lib/random";
import { speak, cancelSpeech } from "./lib/tts";
import { playSound, preloadSounds } from "./lib/sound";
import { Rating, previewIntervals, formatInterval, getCard } from "./lib/srs";
import { recordReview } from "./hooks/useSrs";
import { pickContext, clozeOptions } from "./lib/cloze";
import { getPrefs, setPref } from "./lib/prefs";

const AUTO_NEXT_MS = 2600;
// "Điền vào câu" chờ lâu hơn một chút vì app đọc lại cả câu sau khi trả lời.
const AUTO_NEXT_CONTEXT_MS = 3500;
const OPTION_COUNT = 4;
const SLOW_MS = 10_000; // đúng nhưng nghĩ quá 10 giây → "Khó"
const MAX_REPEATS = 3;

/** Hai loại kiểm tra (chọn ở đầu tab Ôn tập). */
const MODES = [
  { value: "meaning", label: "🔤 Nghĩa của từ" },
  { value: "context", label: "✍️ Điền vào câu" },
];

const GRADES = [
  { r: Rating.Hard, label: "Khó", key: "H", cls: "text-warn" },
  { r: Rating.Good, label: "Tốt", key: "G", cls: "text-good" },
  { r: Rating.Easy, label: "Dễ", key: "E", cls: "text-info" },
];

const randDir = () => (Math.random() < 0.5 ? "en2vi" : "vi2en");

/** Trắc nghiệm theo nghĩa; đáp án nhiễu lấy từ TOÀN BỘ bộ từ. */
function meaningQuestion(word, dir, pool) {
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

/**
 * Câu hỏi ngữ cảnh:
 * - "cloze": câu (từ Ví dụ, hoặc từ Định nghĩa nếu không có Ví dụ) bị che từ cần học → chọn từ điền vào;
 * - "definition": không câu nào chứa từ → hiện 1 định nghĩa ngẫu nhiên, chọn từ phù hợp;
 * - từ không có cả Ví dụ lẫn Định nghĩa → quay về hỏi nghĩa (VI → EN).
 */
function contextQuestion(word, pool) {
  const ctx = pickContext(word);
  if (ctx?.kind === "cloze") {
    return {
      word,
      dir: "cloze",
      isNew: !getCard(word),
      ctx,
      answer: ctx.answer,
      options: clozeOptions(ctx.answer, word.Word, pool, OPTION_COUNT),
    };
  }
  if (ctx?.kind === "definition") {
    const q = meaningQuestion(word, "vi2en", pool);
    return { ...q, dir: "definition", prompt: ctx.text };
  }
  return { ...meaningQuestion(word, "vi2en", pool), fallback: true };
}

const buildQuestion = (item, pool, mode) => (mode === "context" ? contextQuestion(item.word, pool) : meaningQuestion(item.word, item.dir, pool));

function startSession(items, pool, mode, practice) {
  const queue = items.map((word) => ({ word, dir: randDir(), repeat: 0 }));
  return {
    mode,
    practice,
    queue,
    qIndex: 0,
    question: queue.length ? buildQuestion(queue[0], pool, mode) : null,
    picked: null,
    grade: null,
    preview: null,
    showMeaning: false, // đã bấm "Xem nghĩa" (câu điền từ) → tối đa chấm "Khó"
    counts: { [Rating.Again]: 0, [Rating.Hard]: 0, [Rating.Good]: 0, [Rating.Easy]: 0 },
    relearn: 0,
    finished: queue.length === 0,
  };
}

const sentenceOf = (q) => (q.dir === "cloze" ? `${q.ctx.before}${q.ctx.answer}${q.ctx.after}` : null);

/**
 * Ôn tập theo FSRS, 2 loại kiểm tra:
 * - Nghĩa của từ: EN → VI / VI → EN (tự sang câu sau 2,6 giây).
 * - Điền vào câu: chọn từ đúng cho chỗ trống trong câu ví dụ/định nghĩa (tự sang câu sau 3,5 giây).
 * Bấm Tiếp / Enter hoặc chọn Khó/Tốt/Dễ để sang câu ngay.
 * Phím tắt: 1–4 chọn đáp án · Enter/→ câu tiếp · H/G/E = Khó/Tốt/Dễ sau khi trả lời đúng.
 */
export default function Review({ due = [], fresh = [], practicePool = [], allWords = [], dueTomorrow = 0, onAddNew }) {
  const pool = allWords.length >= OPTION_COUNT ? allWords : [...due, ...fresh];
  const [session, setSession] = useState(() =>
    startSession([...due, ...shuffle(fresh)], pool, getPrefs().reviewMode === "context" ? "context" : "meaning", false),
  );
  const timerRef = useRef(null);
  const shownAtRef = useRef(0);
  const pendingRef = useRef(null);

  const { question, picked, finished, mode } = session;
  const locked = picked !== null;
  const isCorrect = locked && question.options[picked].correct;
  const total = session.queue.length;
  const isContext = mode === "context";

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

  // Sang câu mới: bấm giờ suy nghĩ + đọc câu hỏi (câu điền từ thì không đọc để khỏi lộ đáp án).
  useEffect(() => {
    if (!question) return;
    shownAtRef.current = performance.now();
    if (question.dir === "en2vi") speak(question.word.Word, "en-US");
    else if (question.dir === "vi2en") speak(question.word.Meaning, "vi-VN");
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
      const base = { ...cur, queue, counts, relearn, picked: null, grade: null, preview: null, showMeaning: false };
      if (nextIdx >= queue.length) return { ...base, finished: true };
      return { ...base, qIndex: nextIdx, question: buildQuestion(queue[nextIdx], pool, cur.mode) };
    });
  };

  const choose = (i) => {
    if (locked || !question) return;
    const correct = question.options[i].correct;
    const thinkMs = performance.now() - shownAtRef.current;
    let grade = !correct ? Rating.Again : thinkMs > SLOW_MS ? Rating.Hard : Rating.Good;
    if (correct && session.showMeaning) grade = Rating.Hard;
    playSound(correct ? "ding" : "buzz");
    if (navigator.vibrate && !correct) navigator.vibrate(60);
    // Câu điền từ: đọc lại cả câu hoàn chỉnh; các loại khác: đọc từ đúng khi chọn sai.
    const full = sentenceOf(question);
    if (full) speak(full, "en-US");
    else if (!correct) speak(question.word.Word, "en-US");
    pendingRef.current = { word: question.word, grade, practice: session.practice };
    const preview = session.practice ? null : previewIntervals(question.word);
    setSession((cur) => ({ ...cur, picked: i, grade, preview }));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => goNext(), isContext ? AUTO_NEXT_CONTEXT_MS : AUTO_NEXT_MS);
  };

  const restart = (items, practice, nextMode = mode) => {
    clearTimeout(timerRef.current);
    commitPending();
    setSession(startSession(practice ? shuffle(items) : items, pool, nextMode, practice));
  };

  const switchMode = (m) => {
    if (m === mode) return;
    setPref("reviewMode", m);
    // Câu đã trả lời đã được ghi vào FSRS → bắt đầu lại với những từ còn lại hôm nay.
    const remaining = session.practice ? practicePool : [...due, ...shuffle(fresh)];
    restart(remaining, session.practice, m);
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

  const modeSwitch = (
    <Segmented id="review-mode" value={mode} onChange={switchMode} items={MODES} className="w-full" />
  );

  /* ── Kết thúc / không có việc ── */
  if (finished) {
    const c = session.counts;
    const answered = c[Rating.Again] + c[Rating.Hard] + c[Rating.Good] + c[Rating.Easy];
    const pct = answered ? Math.round(((answered - c[Rating.Again]) / answered) * 100) : 0;
    const nothing = answered === 0;
    const Icon = nothing ? PartyPopper : pct >= 85 ? Trophy : pct >= 60 ? Dumbbell : BookOpen;
    return (
      <div className="scroll-soft flex h-full flex-col gap-3 px-4 pt-1 pb-4">
        {modeSwitch}
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
                <Target size={18} /> Luyện tự do · {MODES.find((m) => m.value === mode).label.slice(3)} ({practicePool.length} từ)
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const preview = session.preview;
  const answeredCount = Object.values(session.counts).reduce((a, b) => a + b, 0);
  const correctCount = answeredCount - session.counts[Rating.Again];
  const tag = { en2vi: "EN → VI", vi2en: "VI → EN", cloze: "Điền vào câu", definition: "Định nghĩa" }[question.dir];
  const hint = {
    en2vi: "Nghĩa tiếng Việt là gì?",
    vi2en: question.fallback ? "Từ này chưa có câu ví dụ — chọn từ tiếng Anh tương ứng" : "Từ tiếng Anh tương ứng là gì?",
    cloze: "Chọn từ phù hợp để điền vào chỗ trống",
    definition: "Từ nào khớp với định nghĩa trên?",
  }[question.dir];

  return (
    <div className="scroll-soft flex h-full flex-col gap-3 px-4 pt-1 pb-4">
      {modeSwitch}
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
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${mode}-${session.qIndex}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.14 } }}
          className="card relative flex min-h-[180px] flex-1 flex-col items-center justify-center overflow-hidden px-5 pt-12 pb-6 text-center"
          data-pet-ignore
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-brand-soft/70 to-transparent" />
          {question.isNew && !session.practice && (
            <Chip tone="warn" className="absolute top-3.5 left-3.5">
              Từ mới
            </Chip>
          )}
          <Chip tone={isContext ? "info" : "brand"} className="absolute top-3.5 right-3.5">
            {tag}
          </Chip>

          {question.dir === "cloze" ? (
            <ClozeSentence question={question} locked={locked} correct={isCorrect} showMeaning={session.showMeaning || locked} />
          ) : question.dir === "definition" ? (
            <blockquote className="relative max-w-md rounded-2xl border-l-4 border-info bg-info-soft/60 px-4 py-3 text-left text-[clamp(1rem,4.2vw,1.2rem)] leading-relaxed font-medium text-ink">
              {question.prompt}
            </blockquote>
          ) : (
            <button
              type="button"
              title="Nghe lại"
              onClick={() => (question.dir === "en2vi" ? speak(question.word.Word, "en-US") : speak(question.word.Meaning, "vi-VN"))}
              className="group relative max-w-full font-display text-[clamp(1.7rem,7vw,2.6rem)] leading-tight font-bold tracking-tight break-words text-ink"
            >
              {question.prompt}
              <Volume2 size={18} className="ml-2 inline-block align-middle text-muted opacity-60 transition group-hover:text-brand group-hover:opacity-100" />
            </button>
          )}
          <p className="relative mt-3 text-sm text-muted">{hint}</p>

          {question.dir === "cloze" && !locked && !session.showMeaning && (
            <button
              type="button"
              onClick={() => setSession((cur) => ({ ...cur, showMeaning: true }))}
              className="tap relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-2"
              title="Xem nghĩa sẽ chấm tối đa mức Khó"
            >
              <Eye size={14} /> Xem nghĩa
            </button>
          )}
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
                isContext && "font-display",
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
                    {!isCorrect && isContext && question.dir !== "cloze" && <span className="font-normal opacity-80"> ({question.word.Meaning})</span>}
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
                transition={{ duration: (isContext ? AUTO_NEXT_CONTEXT_MS : AUTO_NEXT_MS) / 1000, ease: "linear" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="shrink-0 text-center text-xs font-semibold tracking-wide text-muted">
        ĐÚNG <span className="font-display text-good">{correctCount}</span> / {answeredCount} LẦN
        <span className="hidden md:inline"> · phím 1–4 chọn · H/G/E chấm · Enter câu tiếp</span>
      </p>
    </div>
  );
}

/** Câu có chỗ trống; sau khi trả lời thì điền đáp án vào chỗ trống và cho nghe lại cả câu. */
function ClozeSentence({ question, locked, correct, showMeaning }) {
  const { before, answer, after, source } = question.ctx;
  return (
    <div className="relative w-full max-w-md">
      <p className="text-left text-[clamp(1.05rem,4.6vw,1.3rem)] leading-relaxed font-medium text-ink">
        {before}
        {locked ? (
          <mark className={cx("rounded-md px-1.5 py-0.5 font-display font-bold", correct ? "bg-good-soft text-good" : "bg-warn-soft text-warn")}>
            {answer}
          </mark>
        ) : (
          <span className="mx-0.5 inline-block min-w-[5rem] rounded-md border-b-2 border-brand bg-brand-soft/60 px-2 text-center font-display font-bold tracking-widest text-brand-ink">
            ____
          </span>
        )}
        {after}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-left text-xs text-muted">
        <span>{source === "example" ? "Câu ví dụ" : "Trích từ định nghĩa"}</span>
        {showMeaning && (
          <span>
            · Nghĩa: <b className="text-ink-2">{question.word.Meaning}</b>
          </span>
        )}
      </div>
      {locked && (
        <button
          type="button"
          onClick={() => speak(`${before}${answer}${after}`, "en-US")}
          className="tap mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-ink"
        >
          <Volume2 size={14} /> Nghe cả câu
        </button>
      )}
    </div>
  );
}
