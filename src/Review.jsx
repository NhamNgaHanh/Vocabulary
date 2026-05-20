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
  // --- THIẾT KẾ HỆ THỐNG DESIGN SYSTEM CHO MOBILE ---
  const styles = {
    page: {
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      backgroundColor: "#f8fafc", // Màu nền Slate 50 siêu dịu mắt
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start", // Đẩy nhẹ app lên trên phù hợp hướng nhìn điện thoại
      padding: "16px",
      boxSizing: "border-box",
    },
    card: {
      width: "100%",
      maxWidth: "460px", // Giới hạn phom chuẩn mobile app
      backgroundColor: "#ffffff",
      borderRadius: "24px", // Bo góc mạnh mẽ, hiện đại
      boxShadow: "0 12px 40px -12px rgba(15, 23, 42, 0.08)", // Đổ bóng nhẹ nhàng, sang trọng
      border: "1px solid #f1f5f9",
      padding: "20px 20px 28px",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    },
    headerRow: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      marginBottom: "24px",
    },
    topMeta: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: {
      fontSize: "1.15rem",
      fontWeight: 700,
      color: "#0f172a",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    badge: {
      fontSize: "0.8rem",
      fontWeight: 700,
      backgroundColor: "#e0f2fe",
      color: "#0369a1",
      padding: "4px 10px",
      borderRadius: "99px", // Badge hình viên thuốc cá tính
    },
    /* --- THANH TIẾN TRÌNH DUOLINGO STYLE --- */
    progressContainer: {
      width: "100%",
      height: "8px",
      backgroundColor: "#f1f5f9",
      borderRadius: "99px",
      overflow: "hidden",
    },
    progressBar: (percent) => ({
      width: `${percent}%`,
      height: "100%",
      backgroundColor: "#22c55e", // Màu xanh lá tạo cảm giác học tập tích cực
      borderRadius: "99px",
      transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)", // Chạy mượt mà
    }),
    wordBox: {
      borderRadius: "20px",
      background: "linear-gradient(135deg, #f4f7ff 0%, #eef2ff 100%)", // Gradient xanh nhẹ công nghệ
      padding: "28px 20px",
      marginBottom: "24px",
      textAlign: "center",
      border: "1px solid #e2e8f0",
    },
    enWord: {
      fontSize: "2.2rem", // Tăng kích thước từ khóa cho nổi bật
      fontWeight: 800,
      letterSpacing: "-0.02em",
      color: "#4f46e5",
      marginBottom: "10px",
      wordBreak: "break-word",
    },
    hint: {
      fontSize: "0.85rem",
      fontWeight: 500,
      color: "#64748b",
    },
    optionsWrap: {
      display: "grid",
      gap: "12px", // Giãn cách rộng rãi để không bấm nhầm nút
      marginBottom: "20px",
    },
    optionBtn: ({ chosen, locked, correct, isThisCorrectAnswer }) => {
      let bg = "#ffffff";
      let border = "#e2e8f0";
      let textColor = "#334155";
      let transform = "none";
      let boxShadow = "0 2px 4px rgba(0,0,0,0.02)";

      if (!locked) {
        // Trạng thái nút bình thường, có thêm hiệu ứng bấm (active)
        return {
          textAlign: "left",
          borderRadius: "16px",
          border: `2px solid ${border}`,
          backgroundColor: bg,
          padding: "16px 20px", // Tăng padding giúp ngón tay dễ chạm
          fontSize: "1rem",
          fontWeight: 600,
          color: textColor,
          cursor: "pointer",
          wordBreak: "break-word",
          boxShadow,
          transition: "all 0.15s ease",
          WebkitTapHighlightColor: "transparent", // Xóa bóng mờ mặc định trên Safari/Chrome mobile
        };
      }

      // Trạng thái sau khi đã chọn xong đáp án (Locked)
      if (chosen && correct) {
        bg = "#f0fdf4";
        border = "#22c55e";
        textColor = "#15803d";
        boxShadow = "0 4px 12px rgba(34,197,94,0.15)";
      } else if (chosen && !correct) {
        bg = "#fef2f2";
        border = "#ef4444";
        textColor = "#b91c1c";
        boxShadow = "0 4px 12px rgba(239,68,68,0.15)";
      } else if (isThisCorrectAnswer) {
        bg = "#f0fdf4";
        border = "#22c55e";
        textColor = "#15803d";
      } else {
        bg = "#f8fafc";
        border = "#f1f5f9";
        textColor = "#94a3b8";
      }

      return {
        textAlign: "left",
        borderRadius: "16px",
        border: `2px solid ${border}`,
        backgroundColor: bg,
        padding: "16px 20px",
        fontSize: "1rem",
        fontWeight: 600,
        color: textColor,
        cursor: "default",
        wordBreak: "break-word",
        boxShadow,
        transform,
        transition: "all 0.2s ease",
        WebkitTapHighlightColor: "transparent",
      };
    },
    feedbackBox: (locked, isCorrect) => {
      if (!locked) return { minHeight: "56px", marginBottom: "16px" };
      return {
        minHeight: "56px",
        borderRadius: "14px",
        backgroundColor: isCorrect ? "#ecfdf5" : "#fff1f2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px 16px",
        marginBottom: "16px",
        border: isCorrect ? "1px solid #a7f3d0" : "1px solid #fecdd3",
        transition: "all 0.3s ease",
      };
    },
    feedbackText: (isCorrect) => ({
      textAlign: "center",
      fontSize: "0.95rem",
      fontWeight: 700,
      color: isCorrect ? "#065f46" : "#991b1b",
    }),
    progressText: {
      fontSize: "0.85rem",
      fontWeight: 600,
      color: "#64748b",
      textAlign: "center",
      letterSpacing: "0.02em",
    },
  };

  const total = words.length;

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

  const autoNextTimeoutRef = useRef(null);

  // --- TRẠNG THÁI TRỐNG (EMPTY STATE) ---
  if (!words || words.length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ textAlign: "center", color: "#64748b", padding: "48px 16px" }}>
            <span style={{ fontSize: "3.5rem" }}>✨</span>
            <p style={{ marginTop: "20px", fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>Sẵn sàng học tập!</p>
            <p style={{ fontSize: "0.9rem", color: "#94a3b8", marginTop: "4px" }}>Vui lòng thêm danh sách từ vựng để bắt đầu thử thách.</p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    setOrder(makeShuffledOrder(words.length));
    setDirectionList(makeDirectionList(words.length));
    setQIndex(0);
    setScore(0);
  }, [words]);

  const currentWordIndex = order[qIndex] !== undefined ? order[qIndex] : 0;
  const dir = directionList[qIndex] || "en2vi";
  const hintText = dir === "en2vi" ? "Từ này có nghĩa tiếng Việt là gì?" : "Từ tiếng Anh tương ứng là gì?";

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
    } else {
      promptText = correctWord.Meaning;
      correctAnswer = correctWord.Word;
      wrongPoolRaw = words
        .map((w, i) => ({ txt: w.Word, i }))
        .filter((w) => w.i !== currentWordIndex);
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
    const correctNow = !!choice.correct;

    setPicked(choiceIdx);
    setLocked(true);
    setIsCorrect(correctNow);

    if (correctNow) {
      setScore((s) => s + 1);
    }

    autoNextTimeoutRef.current = setTimeout(() => {
      goNextQuestion();
    }, 1300); // Đủ thời gian cho hiệu ứng màu sắc lưu lại trên mắt người học
  };

  // Tính phần trăm thanh tiến trình (Progress Bar) dựa trên câu hiện tại
  const progressPercent = total > 0 ? ((qIndex + 1) / total) * 100 : 0;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header tích hợp thanh tiến trình thông minh */}
        <div style={styles.headerRow}>
          <div style={styles.topMeta}>
            <div style={styles.title}>
              <span>📝</span>
              <span>Kiểm tra từ vựng</span>
            </div>
            <div style={styles.badge}>
              {qIndex + 1} / {total}
            </div>
          </div>
          <div style={styles.progressContainer}>
            <div style={styles.progressBar(progressPercent)} />
          </div>
        </div>

        {/* Khung Từ vựng câu hỏi */}
        <div style={styles.wordBox}>
          <div style={styles.enWord}>{questionPrompt}</div>
          <div style={styles.hint}>{hintText}</div>
        </div>

        {/* Danh sách các nút đáp án lớn */}
        <div style={styles.optionsWrap}>
          {options.map((opt, i) => {
            const chosen = picked === i;
            const isThisCorrectAnswer = opt.correct === true;

            return (
              <button
                key={i}
                style={styles.optionBtn({
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

        {/* Khung thông báo ĐÚNG/SAI bo tròn boong tinh tế */}
        <div style={styles.feedbackBox(locked, isCorrect)}>
          {locked && (
            <div style={styles.feedbackText(isCorrect)}>
              {isCorrect 
                ? "🎉 Xuất sắc! Bạn đúng rồi." 
                : `💡 Sai mất rồi! Đáp án là: ${correctAnswerText}`}
            </div>
          )}
        </div>

        {/* Điểm số tích lũy */}
        <div style={styles.progressText}>
          ĐÃ ĐÚNG: <span style={{ color: "#22c55e", fontWeight: 800 }}>{score}</span> / {qIndex + 1} CÂU
        </div>
      </div>
    </div>
  );
}