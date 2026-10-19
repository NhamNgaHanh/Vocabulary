import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/* ── Trạng thái mạng ── */
function subscribeOnline(cb) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

/* ── Service worker: báo có bản mới / sẵn sàng offline ── */
export function useServiceWorker() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Kiểm tra bản mới mỗi giờ khi app đang mở.
      if (registration) setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    },
  });
  return {
    needRefresh,
    offlineReady,
    update: () => updateServiceWorker(true),
    dismiss: () => {
      setNeedRefresh(false);
      setOfflineReady(false);
    },
  };
}

/* ── Cài app lên màn hình chính ── */
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault(); // tự hiện nút "Cài app" thay cho banner mặc định
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return false;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    return outcome === "accepted";
  }, [deferred]);

  return { canPrompt: Boolean(deferred), installed, promptInstall };
}
