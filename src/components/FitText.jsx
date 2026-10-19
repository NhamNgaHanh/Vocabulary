import { useLayoutEffect, useRef } from "react";

/**
 * Tự co cỡ chữ để vừa khung (thay cho useFitText cũ — bản cũ nhận "3rem" dạng chuỗi
 * nên vòng lặp không bao giờ chạy).
 * Chỉnh font-size trực tiếp trên DOM, không dùng state → không gây render lại.
 */
export default function FitText({ text, max = 48, min = 16, className, style }) {
  const boxRef = useRef(null);
  const textRef = useRef(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const el = textRef.current;
    if (!box || !el) return undefined;

    const fit = () => {
      if (!box.clientWidth || !box.clientHeight) return;
      let size = max;
      el.style.overflowWrap = "normal";
      el.style.fontSize = `${size}px`;
      while (
        size > min &&
        (el.scrollWidth > box.clientWidth || el.scrollHeight > box.clientHeight)
      ) {
        size -= 2;
        el.style.fontSize = `${size}px`;
      }
      // Ở cỡ nhỏ nhất mà vẫn tràn (từ quá dài) thì cho phép xuống dòng giữa từ.
      if (el.scrollWidth > box.clientWidth) el.style.overflowWrap = "anywhere";
    };

    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [text, max, min]);

  return (
    <div
      ref={boxRef}
      style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
    >
      <div ref={textRef} className={className} style={{ maxWidth: "100%", lineHeight: 1.2, ...style }}>
        {text}
      </div>
    </div>
  );
}
