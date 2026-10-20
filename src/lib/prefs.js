// Tuỳ chọn giao diện nhỏ của từng thiết bị (không đồng bộ lên Sheet).
const KEY = "vl-prefs-v1";
const DEFAULTS = { showPet: true, sounds: true, reviewMode: "meaning" };

let prefs = (() => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) };
  } catch {
    return { ...DEFAULTS };
  }
})();
const listeners = new Set();

export const prefsStore = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot: () => prefs,
};

export const getPrefs = () => prefs;

export function setPref(key, value) {
  prefs = { ...prefs, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* bỏ qua */
  }
  listeners.forEach((fn) => fn());
}
