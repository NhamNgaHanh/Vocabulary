import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { House, Layers, ChartColumn, Settings as SettingsIcon, RefreshCw, Flame, WifiOff, BookOpen, CloudOff, Sparkles, X } from "lucide-react";
import Learn from "./Learn";
import Review from "./Review";
import Stats from "./Stats";
import Settings from "./Settings";
import PetCat from "./PetCat";
import { Button } from "./components/ui";
import { cx } from "./lib/cx";
import { useVocabData } from "./hooks/useVocabData";
import { useNow, useSrsVersion } from "./hooks/useSrs";
import { useOnline, useServiceWorker, useInstallPrompt } from "./hooks/usePwa";
import { prefsStore, setPref } from "./lib/prefs";
import { seededRandom, shuffle, newSeed } from "./lib/random";
import { flushQueue, postToScript, clearQueue, subscribeQueue, pendingCount } from "./lib/syncQueue";
import {
  buildToday,
  computeStats,
  getStreak,
  mergeFromSheet,
  getSettings,
  updateSettings,
  addBonusNew,
  resetProgress,
  exportProgress,
  importProgress,
  getCard,
  retrievability,
  State,
  MATURE_DAYS,
  dayKey,
} from "./lib/srs";

const TABS = [
  { id: "learn", icon: House, label: "Học từ" },
  { id: "review", icon: Layers, label: "Ôn tập" },
  { id: "stats", icon: ChartColumn, label: "Thống kê" },
  { id: "settings", icon: SettingsIcon, label: "Cài đặt" },
];
const TAB_IDS = TABS.map((t) => t.id);

const PET_IGNORE = "button, input, a, label, [role=button], [role=slider], [role=dialog], [data-pet-ignore], nav, header";
const BONUS_STEP = 5;

const initialTab = () => {
  const t = new URLSearchParams(window.location.search).get("tab");
  return TAB_IDS.includes(t) ? t : "learn";
};

function badgeFor(word, now) {
  const c = getCard(word);
  if (!c) return { text: "Mới", tone: "new" };
  if (c.state === State.Learning || c.state === State.Relearning) return { text: "Đang học", tone: "learning" };
  const r = retrievability(word, now);
  const pct = r == null ? "" : ` · ${Math.round(r * 100)}%`;
  return c.stability >= MATURE_DAYS ? { text: `Thuộc vững${pct}`, tone: "mature" } : { text: `Đang ôn${pct}`, tone: "review" };
}

export default function App() {
  const data = useVocabData();
  const { words: allWords, settings: sheetSettings, version, refresh } = data;
  const srsVersion = useSrsVersion();
  const now = useNow();
  const online = useOnline();
  const sw = useServiceWorker();
  const install = useInstallPrompt();
  const prefs = useSyncExternalStore(prefsStore.subscribe, prefsStore.getSnapshot, prefsStore.getSnapshot);
  const pending = useSyncExternalStore(subscribeQueue, pendingCount, () => 0);

  const [tab, setTab] = useState(initialTab);
  const [seed, setSeed] = useState(newSeed);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const petRef = useRef(null);

  const showToast = (type, message) => {
    clearTimeout(toastTimer.current);
    setToast((t) => ({ type, message, id: (t?.id ?? 0) + 1 }));
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    flushQueue();
    return () => clearTimeout(toastTimer.current);
  }, []);

  // Hợp nhất dữ liệu Sheet vào kho FSRS (ghi localStorage = hệ thống bên ngoài).
  useEffect(() => {
    if (allWords.length) mergeFromSheet(allWords);
  }, [allWords]);

  // Có mạng trở lại → gửi nốt hàng đợi.
  useEffect(() => {
    if (online) flushQueue();
  }, [online]);

  /* ── Việc hôm nay ── */
  const today = dayKey(now);
  const srsSettings = getSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- srsVersion/today báo kho FSRS đã đổi
  const plan = useMemo(() => buildToday(allWords, sheetSettings.wordsPerDay, now), [allWords, sheetSettings, srsVersion, today]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => (tab === "stats" ? computeStats(allWords, now) : null), [tab, allWords, srsVersion, today]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const streak = useMemo(() => getStreak(now), [srsVersion, today]);
  const learnNew = useMemo(() => shuffle(plan.learnWords, seededRandom(seed)), [plan.learnWords, seed]);

  const total = allWords.length;
  const sessionKey = `${version}-${today}`;
  const perDay = srsSettings.newPerDay ?? sheetSettings.wordsPerDay;
  const reviewBadge = plan.due.length + plan.newToday.length;

  /* ── Hành động ── */
  const handleSync = async () => {
    if (busy) return;
    setBusy(true);
    await flushQueue();
    const ok = await refresh();
    setBusy(false);
    showToast(ok ? "success" : "error", ok ? "Đã đồng bộ với Google Sheets" : "Không tải được dữ liệu — đang dùng bản đã lưu");
  };

  const handleAddNew = () => {
    addBonusNew(BONUS_STEP);
    showToast("success", `Đã thêm ${BONUS_STEP} từ mới cho hôm nay`);
  };

  const handleReset = async () => {
    if (!window.confirm("Xoá toàn bộ tiến độ ôn tập (FSRS) và reset cột Status trên Google Sheet?")) return;
    setBusy(true);
    try {
      await postToScript({ action: "resetstatus" });
      showToast("success", "Đã reset tiến độ học tập");
    } catch (err) {
      console.error("Lỗi reset:", err);
      showToast("error", "Đã reset trên máy, nhưng chưa reset được Google Sheet");
    } finally {
      clearQueue();
      resetProgress();
      await refresh();
      setBusy(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(exportProgress(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vocalearn-tien-do-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImport = async (file) => {
    try {
      const n = importProgress(JSON.parse(await file.text()));
      showToast("success", `Đã nhập tiến độ của ${n} từ`);
    } catch (err) {
      showToast("error", err.message || "File không hợp lệ");
    }
  };

  const onAppClick = (e) => {
    if (!prefs.showPet || e.target.closest(PET_IGNORE)) return;
    petRef.current?.moveTo(e.clientX, e.clientY);
  };

  /* ── Tải / lỗi ── */
  if (data.loading) {
    return (
      <Splash>
        <div className="size-10 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" />
        <p className="text-sm font-medium text-muted">Đang tải bộ từ vựng…</p>
      </Splash>
    );
  }
  if (!total) {
    return (
      <Splash>
        <div className="grid size-16 place-items-center rounded-3xl bg-warn-soft text-warn">
          <CloudOff size={30} />
        </div>
        <p className="max-w-xs text-center text-sm font-medium text-ink-2">{data.error || "Bảng tính chưa có từ vựng nào"}</p>
        <Button variant="primary" onClick={handleSync} disabled={busy}>
          <RefreshCw size={16} className={busy ? "animate-spin" : ""} /> Thử lại
        </Button>
      </Splash>
    );
  }

  const screens = {
    learn: (
      <Learn
        key={`learn-${sessionKey}-${seed}`}
        collections={[
          { id: "new", label: "Mới hôm nay", words: learnNew },
          { id: "due", label: "Đến hạn", words: plan.due },
        ]}
        getBadge={(w) => badgeFor(w, now)}
        onAddNew={plan.remainingFresh > 0 ? handleAddNew : undefined}
        onStartReview={() => setTab("review")}
      />
    ),
    review: (
      <Review
        key={`review-${sessionKey}`}
        due={plan.due}
        fresh={plan.newToday}
        practicePool={[...plan.introducedToday, ...plan.due]}
        allWords={allWords}
        dueTomorrow={plan.dueTotal - plan.due.length}
        onAddNew={plan.remainingFresh > 0 ? handleAddNew : undefined}
      />
    ),
    stats: stats && <Stats stats={stats} plan={plan} total={total} pending={pending} perDay={perDay} />,
    settings: (
      <Settings
        total={total}
        plan={plan}
        perDay={perDay}
        srsSettings={srsSettings}
        onSettings={updateSettings}
        prefs={prefs}
        onPref={setPref}
        busy={busy}
        online={online}
        install={install}
        sw={sw}
        pending={pending}
        onAddNew={handleAddNew}
        onShuffle={() => {
          setSeed(newSeed());
          showToast("success", "Đã xáo lại thứ tự từ mới");
        }}
        onSync={handleSync}
        onExport={handleExport}
        onImport={handleImport}
        onReset={handleReset}
      />
    ),
  };

  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden bg-canvas pt-[env(safe-area-inset-top)]" onClick={onAppClick}>
      {/* Nền gradient mềm */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-24 size-80 rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-28 size-96 rounded-full bg-brand-2/20 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 pt-3 pb-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-linear-to-br from-brand to-brand-2 text-white shadow-glow">
          <BookOpen size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight font-bold">VocaLearn</p>
          <p className="truncate text-xs text-muted capitalize">{now.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" })}</p>
        </div>
        {!online && (
          <span className="flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-[11px] font-bold text-warn">
            <WifiOff size={12} /> Offline
          </span>
        )}
        <span
          className={cx(
            "flex items-center gap-1 rounded-full px-2.5 py-1.5 font-display text-sm font-bold",
            streak ? "bg-linear-to-br from-amber-400 to-orange-500 text-white shadow-[0_8px_18px_-6px_rgb(249_115_22/.6)]" : "bg-surface-2 text-muted",
          )}
          title="Chuỗi ngày học liên tiếp"
        >
          <Flame size={15} fill={streak ? "currentColor" : "none"} /> {streak}
        </span>
        <button
          type="button"
          onClick={handleSync}
          disabled={busy}
          aria-label="Đồng bộ dữ liệu"
          title={pending ? `Đồng bộ (${pending} đang chờ)` : "Đồng bộ dữ liệu"}
          className="tap relative grid size-10 place-items-center rounded-2xl border border-line bg-surface text-ink-2 shadow-card hover:text-brand"
        >
          <RefreshCw size={18} className={busy ? "animate-spin" : ""} />
          {pending > 0 && (
            <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-surface bg-warn px-1 font-display text-[10px] font-bold text-white">
              {pending}
            </span>
          )}
        </button>
      </header>

      {/* Thông báo cập nhật / lỗi */}
      <div className="mx-auto w-full max-w-xl px-4">
        <AnimatePresence>
          {sw.needRefresh && (
            <Banner key="update" icon={<Sparkles size={16} />} onClose={sw.dismiss}>
              Có phiên bản mới của VocaLearn.
              <Button size="sm" variant="primary" className="ml-auto" onClick={sw.update}>
                Cập nhật
              </Button>
            </Banner>
          )}
          {data.error && (
            <Banner key="err" tone="warn" icon={<CloudOff size={16} />}>
              Đang dùng dữ liệu đã lưu — {data.error}
            </Banner>
          )}
        </AnimatePresence>
      </div>

      {/* NỘI DUNG */}
      <main className="relative mx-auto min-h-0 w-full max-w-xl flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            className="absolute inset-0"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {screens[tab]}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* TAB BAR */}
      <nav aria-label="Điều hướng chính" className="mx-auto w-full max-w-xl px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="flex rounded-[1.6rem] border border-line bg-surface/85 p-1.5 shadow-pop backdrop-blur-xl">
          {TABS.map(({ id, icon: Icon, label }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                className={cx("tap relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-semibold", active ? "text-brand-ink" : "text-muted hover:text-ink-2")}
              >
                {active && (
                  <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-2xl bg-brand-soft" transition={{ type: "spring", stiffness: 480, damping: 36 }} />
                )}
                <span className="relative">
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                  {id === "review" && reviewBadge > 0 && (
                    <span className="absolute -top-1.5 left-3.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-surface bg-bad px-1 font-display text-[10px] font-bold text-white">
                      {reviewBadge > 99 ? "99+" : reviewBadge}
                    </span>
                  )}
                </span>
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {prefs.showPet && <PetCat ref={petRef} />}

      {/* TOAST */}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-[60] flex justify-center px-4">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              role="status"
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className={cx(
                "max-w-sm rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-pop",
                toast.type === "success" ? "bg-linear-to-br from-emerald-400 to-emerald-600" : "bg-linear-to-br from-rose-400 to-rose-600",
              )}
            >
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Splash({ children }) {
  return <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-canvas p-6">{children}</div>;
}

function Banner({ tone = "brand", icon, onClose, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className={cx("mb-3 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold", tone === "warn" ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand-ink")}>
        {icon}
        {children}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Đóng" className="tap ml-1 grid size-7 place-items-center rounded-full hover:bg-black/5">
            <X size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
