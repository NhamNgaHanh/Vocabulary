import { useState, useEffect, useRef } from "react";

// --- CÁC HÀM BỔ TRỢ (GIỮ NGUYÊN LOGIC CHUẨN) ---
function makeShuffledOrder(len) {
  const arr = Array.from({ length: len }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeDirectionList(len) {
  return Array.from({ length: len }, () =>
    Math.random() < 0.5 ? "en2vi" : "vi2en"
  );
}

function shuffleArray(arr) {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export default function Review({ words = [] }) {
  const [order, setOrder] = useState([]);
  const [directionList, setDirectionList] = useState([]);
  const [qIndex, setQIndex] = useState(0);

  const [questionPrompt, setQuestionPrompt] = useState("");
  const [options, setOptions] = useState([]);
  const [picked, setPicked] = useState(null);
  const [locked, setLocked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [correctAnswerText, setCorrectAnswerText] = useState("");
  const [sendWord, setSendWord] = useState("");

  const autoNextTimeoutRef = useRef(null);
  const total = words.length;

  // --- TRẠNG THÁI TRỐNG (EMPTY STATE CỦA THEME TỐI) ---
  if (!words || words.length === 0) {
    return (
      <div style={S.root}>
        <div style={S.shell}>
          <div style={{ textAlign: "center", color: "#8f8fad", padding: "32px 0" }}>
            <span style={{ fontSize: "2.5rem" }}>✨</span>
            <p style={{ marginTop: "16px", fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>Sẵn sàng học tập!</p>
            <p style={{ fontSize: "0.85rem", color: "#5a5a8a", marginTop: "4px" }}>Vui lòng thêm danh sách từ vựng để bắt đầu thử thách.</p>
          </div>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setOrder(makeShuffledOrder(words.length));
    setDirectionList(makeDirectionList(words.length));
    setQIndex(0);
    setScore(0);
  }, [words]);

  const currentWordIndex = order[qIndex] !== undefined ? order[qIndex] : 0;
  const dir = directionList[qIndex] || "en2vi";
  const hintText = dir === "en2vi" ? "Từ này có nghĩa tiếng Việt là gì?" : "Từ tiếng Anh tương ứng là gì?";

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (order[qIndex] === undefined || !directionList[qIndex]) return;

    const correctWord = words[currentWordIndex];
    let promptText = "";
    let correctAnswer = "";
    let wrongPoolRaw = [];

    if (dir === "en2vi") {
      promptText = correctWord.Word;
      correctAnswer = correctWord.Meaning;
      wrongPoolRaw = words
        .map((w, i) => ({ txt: w.Meaning, i }))
        .filter((w) => w.i !== currentWordIndex);
      setSendWord(promptText);
    } else {
      promptText = correctWord.Meaning;
      correctAnswer = correctWord.Word;
      wrongPoolRaw = words
        .map((w, i) => ({ txt: w.Word, i }))
        .filter((w) => w.i !== currentWordIndex);
      setSendWord(promptText);
    }

    const wrongPool = shuffleArray(wrongPoolRaw)
      .slice(0, 3)
      .map((item) => ({
        text: item.txt,
        correct: false,
      }));

    const optsShuffled = shuffleArray([
      { text: correctAnswer, correct: true },
      ...wrongPool,
    ]);

    setQuestionPrompt(promptText);
    setCorrectAnswerText(correctAnswer);
    setOptions(optsShuffled);
    setPicked(null);
    setLocked(false);
    setIsCorrect(null);

    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = null;
    }
  }, [qIndex, words, order, directionList, currentWordIndex, dir]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    return () => {
      if (autoNextTimeoutRef.current) {
        clearTimeout(autoNextTimeoutRef.current);
      }
    };
  }, []);

  const goNextQuestion = () => {
    if (qIndex < total - 1) {
      setQIndex((prev) => prev + 1);
    } else {
      const newOrder = makeShuffledOrder(total);
      const newDirs = makeDirectionList(total);
      setOrder(newOrder);
      setDirectionList(newDirs);
      setQIndex(0);
      setScore(0);
    }
  };

  const chooseAnswer = (choiceIdx) => {
    if (locked) return;
    const choice = options[choiceIdx];
    console.log(sendWord);
    const correctNow = !!choice.correct;
    if (correctNow === true) {
      submitData(sendWord, 1);
    } else {
      submitData(sendWord, 0);
    }
    setPicked(choiceIdx);
    setLocked(true);
    setIsCorrect(correctNow);

    if (correctNow) {
      setScore((s) => s + 1);
    }

    autoNextTimeoutRef.current = setTimeout(() => {
      goNextQuestion();
    }, 1500); 
  };
  const submitData = async (Words, status) => {
    try {
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycby53wtAvYWY7GXSGvG_rL_5fz7y9GuNYlMQx0yNxFu-i_0Ny2e4RUDrPpF3j0OntV2D/exec",
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain", 
          },
          body: JSON.stringify({
            Words: Words,   // Ví dụ: "Book"
            Status: status  // Ví dụ: 1 hoặc 0
          }),
        }
      );
      const data = await response.json();
      console.log("Thành công:", data);
    } catch (error) {
      console.error("Lỗi khi gửi dữ liệu:", error);
    }
  };

// Ví dụ cách bạn gọi hàm:
// submitData("Book", 1); // Sẽ tìm chữ Book ở dòng 2 và điền số 1 vào cột D

  const progressPercent = total > 0 ? ((qIndex + 1) / total) * 100 : 0;

  return (
    <div style={S.root}>
      <div style={S.shell}>
        
        {/* ── TOP BAR ── */}
        <div style={S.topBar}>
          <div style={S.logoMark}>
            <EditIcon />
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.appTitle}>Kiểm tra từ vựng</div>
          </div>
          <div style={S.badge}>
            {qIndex + 1} / {total}
          </div>
        </div>

        {/* ── PROGRESS TRACK ── */}
        <div style={S.progressWrap}>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* ── KHUNG TỪ VỰNG CÂU HỎI (CO GIÃN THEO KHÔNG GIAN DỌC) ── */}
        <div style={S.wordBox}>
          <div style={S.faceLang}>{dir === "en2vi" ? "EN" : "VI"}</div>
          <div style={S.enWord}>{questionPrompt}</div>
          <div style={S.hint}>{hintText}</div>
        </div>

        {/* ── DANH SÁCH ĐÁP ÁN ── */}
        <div style={S.optionsWrap}>
          {options.map((opt, i) => {
            const chosen = picked === i;
            const isThisCorrectAnswer = opt.correct === true;

            return (
              <button
                key={i}
                style={S.optionBtn({
                  chosen,
                  locked,
                  correct: opt.correct,
                  isThisCorrectAnswer,
                })}
                onClick={() => chooseAnswer(i)}
                disabled={locked}
              >
                {opt.text}
              </button>
            );
          })}
        </div>

        {/* ── KHUNG PHẢN HỒI ĐÚNG/SAI ĐỘNG ── */}
        <div style={S.feedbackBox(locked, isCorrect)}>
          {locked && (
            <div style={S.feedbackText(isCorrect)}>
              {isCorrect 
                ? "🎉 Xuất sắc! Bạn đúng rồi."
                : `💡 Đáp án đúng là: ${correctAnswerText}`}
            </div>
          )}
        </div>

        {/* ── ĐIỂM SỐ TÍCH LŨY DƯỚI ĐÁY ── */}
        <div style={S.progressText}>
          ĐÃ ĐÚNG: <span style={{ color: "#34d399", fontWeight: 800 }}>{score}</span> / {qIndex + 1} CÂU
        </div>

      </div>
    </div>
  );
}

/* ──────────────── TRỤC SVG ICONS ĐỒNG BỘ ──────────────── */
const EditIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke="#748ffc" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);

/* ──────────────── DESIGN SYSTEM PHÂN PHỐI TỶ LỆ DỌC ──────────────── */
const S = {
  root: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "0 16px 12px",
    boxSizing: "border-box",
    overflow: "hidden",
    background: "transparent",
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
  },
  shell: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexShrink: 0,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "rgba(76,110,245,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  appTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
  },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    backgroundColor: "rgba(76,110,245,0.15)",
    color: "#748ffc",
    padding: "3px 8px",
    borderRadius: 99,
  },
  progressWrap: {
    marginBottom: 10,
    flexShrink: 0,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    background: "#141428",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#34d399", // Giữ màu xanh lá Duolingo tạo động lực tích cực
    borderRadius: 99,
    transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  
  /* CÂU HỎI CO GIÃN LINH HOẠT THEO CHIỀU CAO THỰC TẾ */
  wordBox: {
    position: "relative",
    borderRadius: 16,
    background: "linear-gradient(135deg, #ffffff, #fff)",
    border: "1px solid #2a2a5a",
    padding: "16px",
    flex: 1, 
    minHeight: 80, 
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    boxSizing: "border-box",
    marginBottom: 10,
  },
  faceLang: {
    position: "absolute",
    top: 12,
    right: 12,
    fontSize: 10,
    fontWeight: 700,
    color: "#748ffc",
    background: "rgba(76,110,245,0.15)",
    padding: "2px 6px",
    borderRadius: 6,
  },
  enWord: {
    fontSize: "2.5rem", 
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: "#000000",
    marginBottom: 4,
    wordBreak: "break-word",
    lineHeight: 1.2,
  },
  hint: {
    fontSize: "0.8rem",
    fontWeight: 500,
    color: "#5a5a8a",
  },
  
  /* KHU VỰC ĐÁP ÁN (FIX SỐ LƯỢNG 4 NÚT - CHẶN CO COp ĐÈ LÊN NHAU) */
  optionsWrap: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "6px",
    marginBottom: 8,
    flexShrink: 0,
  },
  optionBtn: ({ chosen, locked, correct, isThisCorrectAnswer }) => {
    let bg = "#141428";
    let border = "#1e1e38";
    let textColor = "#b0b0d0";
    let boxShadow = "none";

    if (!locked) {
      return {
        textAlign: "left",
        borderRadius: "12px",
        border: `1px solid ${border}`,
        backgroundColor: bg,
        padding: "11px 16px", 
        fontSize: "0.9rem",
        fontWeight: 600,
        color: textColor,
        cursor: "pointer",
        wordBreak: "break-word",
        transition: "all 0.12s ease",
        WebkitTapHighlightColor: "transparent",
      };
    }

    if (chosen && correct) {
      bg = "rgba(16, 185, 129, 0.15)";
      border = "#10b981";
      textColor = "#34d399";
      boxShadow = "0 0 12px rgba(16,185,129,0.2)";
    } else if (chosen && !correct) {
      bg = "rgba(239, 68, 68, 0.15)";
      border = "#ef4444";
      textColor = "#f87171";
      boxShadow = "0 0 12px rgba(239,68,68,0.2)";
    } else if (isThisCorrectAnswer) {
      bg = "rgba(16, 185, 129, 0.1)";
      border = "#10b981";
      textColor = "#34d399";
    } else {
      bg = "#0d0d1a";
      border = "#141428";
      textColor = "#444466";
    }

    return {
      textAlign: "left",
      borderRadius: "12px",
      border: `1px solid ${border}`,
      backgroundColor: bg,
      padding: "11px 16px",
      fontSize: "0.9rem",
      fontWeight: 600,
      color: textColor,
      cursor: "default",
      wordBreak: "break-word",
      boxShadow,
      transition: "all 0.15s ease",
      WebkitTapHighlightColor: "transparent",
    };
  },

  /* THANH THÔNG BÁO */
  feedbackBox: (locked, isCorrect) => {
    if (!locked) return { height: "38px", marginBottom: "8px", flexShrink: 0 };
    return {
      height: "38px",
      borderRadius: "10px",
      backgroundColor: isCorrect ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px 12px",
      marginBottom: "8px",
      border: isCorrect ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(239,68,68,0.2)",
      transition: "all 0.2s ease",
      flexShrink: 0,
    };
  },
  feedbackText: (isCorrect) => ({
    textAlign: "center",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: isCorrect ? "#34d399" : "#f87171",
  }),
  progressText: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#5a5a8a",
    textAlign: "center",
    letterSpacing: "0.04em",
    flexShrink: 0,
  },
};