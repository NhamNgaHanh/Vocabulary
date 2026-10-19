import { publicUrl } from "./config";
import { getPrefs } from "./prefs";

const cache = {};

function get(name) {
  if (typeof Audio === "undefined") return null;
  if (!cache[name]) {
    const a = new Audio(publicUrl(`sounds/${name}.wav`));
    a.preload = "auto";
    cache[name] = a;
  }
  return cache[name];
}

/** Phát hiệu ứng âm thanh; nuốt lỗi autoplay (iOS/Chrome) thay vì để unhandled rejection. */
export function playSound(name) {
  if (!getPrefs().sounds) return;
  const a = get(name);
  if (!a) return;
  try {
    a.currentTime = 0;
    a.play()?.catch(() => {});
  } catch {
    /* trình duyệt không hỗ trợ — bỏ qua */
  }
}

export function preloadSounds(...names) {
  names.forEach((n) => get(n)?.load());
}
