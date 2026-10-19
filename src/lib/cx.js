/** Ghép class, bỏ giá trị rỗng. */
export const cx = (...parts) => parts.filter(Boolean).join(" ");
