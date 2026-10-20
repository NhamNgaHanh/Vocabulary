// Câu hỏi "điền từ vào câu" (cloze) — lấy câu từ cột Ví dụ, nếu không có thì từ cột Định nghĩa.
import { shuffle } from "./random";

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Các dạng biến đổi thường gặp của 1 từ tiếng Anh (agree → agreed, study → studies, stop → stopped…). */
function variants(word) {
  const w = word.toLowerCase();
  const out = new Set([w, `${w}s`, `${w}es`, `${w}ed`, `${w}d`, `${w}ing`, `${w}er`, `${w}est`, `${w}ly`]);
  if (w.endsWith("y")) ["ies", "ied", "ier", "iest", "ily"].forEach((s) => out.add(w.slice(0, -1) + s));
  if (w.endsWith("e")) ["ing", "ed", "er", "est", "ion"].forEach((s) => out.add(w.slice(0, -1) + s));
  if (w.endsWith("ie")) out.add(`${w.slice(0, -2)}ying`);
  if (/[^aeiou][aeiou][bdgklmnprt]$/.test(w)) ["ed", "ing", "er", "est"].forEach((s) => out.add(w + w.at(-1) + s));
  return [...out].sort((a, b) => b.length - a.length);
}

/**
 * Tìm từ trong câu và che lại. Trả về { before, answer, after } (answer = đúng dạng trong câu) hoặc null.
 * Cụm nhiều chữ: chỉ chữ đầu được biến đổi ("take off" khớp "taking off").
 */
export function makeCloze(sentence, word) {
  if (!sentence || !word) return null;
  const text = sentence.trim();
  const parts = word.trim().split(/\s+/);
  if (!parts.length || parts.join(" ").length < 2) return null;
  const head = variants(parts[0]).map(escapeRe).join("|");
  const tail = parts.slice(1).map(escapeRe).join("\\s+");
  const pattern = tail ? `(?:${head})\\s+${tail}` : `(?:${head})`;
  const re = new RegExp(`(^|[^\\p{L}\\p{N}'])(${pattern})(?![\\p{L}\\p{N}])`, "iu");
  const m = re.exec(text);
  if (!m) return null;
  const start = m.index + m[1].length;
  const answer = m[2];
  return { before: text.slice(0, start), answer, after: text.slice(start + answer.length) };
}

/* ───────────── Chia từ nhiễu theo cùng dạng với đáp án ───────────── */

const isShortCVC = (w) => w.length <= 4 && /[^aeiou][aeiou][^aeiouwxy]$/.test(w);

const toIng = (w) =>
  w.endsWith("ie") ? `${w.slice(0, -2)}ying` : w.endsWith("e") && !w.endsWith("ee") ? `${w.slice(0, -1)}ing` : isShortCVC(w) ? `${w}${w.at(-1)}ing` : `${w}ing`;
const toEd = (w) =>
  w.endsWith("e") ? `${w}d` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ied` : isShortCVC(w) ? `${w}${w.at(-1)}ed` : `${w}ed`;
const toS = (w) => (/(s|x|z|ch|sh)$/.test(w) ? `${w}es` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`);
const toLy = (w) => (w.endsWith("le") ? `${w.slice(0, -1)}y` : w.endsWith("y") ? `${w.slice(0, -1)}ily` : `${w}ly`);

/** Đáp án trong câu là dạng nào của từ gốc? ("studying" so với "study" → "ing") */
function formOf(answerHead, baseHead) {
  const a = answerHead.toLowerCase();
  const b = baseHead.toLowerCase();
  if (a === b) return null;
  if (a === toIng(b) || (a.endsWith("ing") && !b.endsWith("ing"))) return "ing";
  if (a === toEd(b) || (a.endsWith("ed") && !b.endsWith("ed"))) return "ed";
  if (a === toLy(b) || (a.endsWith("ly") && !b.endsWith("ly"))) return "ly";
  if (a === toS(b) || (a.endsWith("s") && !b.endsWith("s"))) return "s";
  return null;
}

const FORM = { ing: toIng, ed: toEd, s: toS, ly: toLy };

/** Biến từ nhiễu sang cùng dạng với đáp án, giữ chữ hoa đầu câu. */
function inflectLike(answer, baseWord, other) {
  const [aHead] = answer.split(/\s+/);
  const [bHead] = baseWord.split(/\s+/);
  const form = formOf(aHead, bHead);
  const parts = other.trim().toLowerCase().split(/\s+/);
  if (form) parts[0] = FORM[form](parts[0]);
  let out = parts.join(" ");
  if (/^\p{Lu}/u.test(answer)) out = out.charAt(0).toUpperCase() + out.slice(1);
  return out;
}

/** Đoán loại từ thô theo hậu tố (bộ từ không có cột loại từ). */
function guessPos(word) {
  const w = word.trim().toLowerCase().split(/\s+/).at(-1);
  if (word.trim().includes(" ")) return "verb"; // cụm động từ: take off, set up…
  if (/(ment|tion|sion|ness|ity|ance|ence|ship|hood|ism|ist|ee|age|ure|dom)$/.test(w)) return "noun";
  if (/(able|ible|ful|ous|ive|less|ical|ic|ish|ent|ant|ary|al)$/.test(w)) return "adj";
  if (/(ize|ise|ify|ate|en)$/.test(w)) return "verb";
  return null; // không đoán được
}

/** Từ nhiễu này có chia được theo dạng `form` một cách tự nhiên không? */
function compatible(form, pos, answerPos) {
  if (form === "ing" || form === "ed") return pos !== "noun" && pos !== "adj";
  if (form === "s") return pos !== "adj";
  if (form === "ly") return pos === "adj";
  return !answerPos || !pos || pos === answerPos;
}

/**
 * 4 lựa chọn cho câu điền từ: đáp án + 3 từ khác trong bộ từ, chia cùng dạng (studying / improving / carrying…).
 * Ưu tiên từ cùng loại (đoán theo hậu tố) và cùng số chữ, để không đoán được đáp án bằng hình dạng.
 */
export function clozeOptions(answer, baseWord, pool, count = 4) {
  const [aHead] = answer.split(/\s+/);
  const [bHead] = baseWord.split(/\s+/);
  const form = formOf(aHead, bHead);
  const answerPos = guessPos(baseWord);
  const nWords = baseWord.trim().split(/\s+/).length;
  const seen = new Set([answer.toLowerCase(), baseWord.toLowerCase()]);

  const scored = shuffle(pool.filter((w) => w.Word && w.Word.toLowerCase() !== baseWord.toLowerCase())).map((w) => {
    const pos = guessPos(w.Word);
    let score = 0;
    if (compatible(form, pos, answerPos)) score += 2;
    if (w.Word.trim().split(/\s+/).length === nWords) score += 1;
    return { w, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const wrong = [];
  for (const { w } of scored) {
    const text = inflectLike(answer, baseWord, w.Word);
    if (seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    wrong.push({ text, correct: false, base: w.Word });
    if (wrong.length === count - 1) break;
  }
  return shuffle([{ text: answer, correct: true, base: baseWord }, ...wrong]);
}

/**
 * Chọn ngữ cảnh để hỏi cho 1 từ:
 * 1. Câu ở cột Ví dụ có chứa từ → che từ lại.
 * 2. Một câu (ngẫu nhiên) trong cột Định nghĩa có chứa từ → che từ lại.
 * 3. Không câu nào chứa từ nhưng có định nghĩa → hiện định nghĩa, hỏi "từ nào phù hợp".
 * 4. Không có gì → null (dùng câu hỏi nghĩa thông thường).
 */
export function pickContext(word) {
  const fromExample = makeCloze(word.Example, word.Word);
  if (fromExample) return { kind: "cloze", source: "example", ...fromExample };
  const notes = shuffle(word.Notes ?? []);
  for (const n of notes) {
    const c = makeCloze(n, word.Word);
    if (c) return { kind: "cloze", source: "definition", ...c };
  }
  if (notes.length) return { kind: "definition", text: notes[0] };
  return null;
}
