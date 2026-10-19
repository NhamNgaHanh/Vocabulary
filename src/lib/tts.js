// Text-to-speech dùng chung cho Learn và Review.
const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;

let voices = [];
function loadVoices() {
  if (!synth) return;
  voices = synth.getVoices();
}
if (synth) {
  loadVoices();
  synth.addEventListener?.("voiceschanged", loadVoices);
}

/** Chọn giọng khớp ngôn ngữ nhất: khớp đủ "vi-VN" > khớp tiền tố "vi". */
function pickVoice(lang) {
  if (!voices.length) return null;
  const lower = lang.toLowerCase();
  const prefix = lower.split("-")[0];
  return (
    voices.find((v) => v.lang.toLowerCase().replace("_", "-") === lower) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
    null
  );
}

export const ttsSupported = Boolean(synth);

export function cancelSpeech() {
  synth?.cancel();
}

/**
 * Đọc `text`, trả về Promise resolve khi đọc xong (hoặc lỗi).
 * Mặc định huỷ hàng đợi trước khi đọc để không bị chồng tiếng.
 */
export function speak(text, lang = "en-US", { clearQueue = true, rate = 0.9 } = {}) {
  return new Promise((resolve) => {
    const clean = text?.toString().trim();
    if (!synth || !clean) return resolve();
    if (clearQueue) synth.cancel();
    // Chrome đôi khi kẹt engine sau cancel() — đợi một nhịp ngắn rồi resume.
    setTimeout(() => {
      try {
        synth.resume();
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = lang;
        u.rate = rate;
        const voice = pickVoice(lang);
        if (voice) u.voice = voice;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        synth.speak(u);
      } catch {
        resolve();
      }
    }, 60);
  });
}
