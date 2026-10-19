/**
 * PetEngine.js
 * ------------------------------------------------------------------
 * "Bộ não" của mèo: IDLE ⇄ WALKING.
 * - moveTo(x, y): đi tới điểm (đã kẹp trong viewport).
 * - Tự kẹp lại vị trí khi cửa sổ đổi kích thước / xoay màn hình.
 * (Phần AUTO_EAT_TEXT cũ đã bỏ vì không có phần tử `.vocab-word` nào
 *  trong app nên code đó không bao giờ chạy.)
 * ------------------------------------------------------------------
 */
import { useState, useRef, useCallback, useEffect } from "react";
import {
  STATES,
  WALK_SPEED,
  computeBounds,
  defaultStartPos,
  clampPoint,
  getDistance,
  getDirection,
  travelDurationSec,
} from "./PetStateMachine";

export function usePetEngine() {
  const boundsRef = useRef(null);
  const [walk, setWalk] = useState(() => {
    const bounds = computeBounds();
    return {
      state: STATES.IDLE,
      facing: "right",
      pos: defaultStartPos(bounds),
      duration: 0.6,
    };
  });
  // Bản sao đồng bộ của vị trí để click giữa chừng tính đúng khoảng cách.
  const posRef = useRef(walk.pos);

  useEffect(() => {
    boundsRef.current = computeBounds();
    const onResize = () => {
      const bounds = computeBounds();
      boundsRef.current = bounds;
      const p = clampPoint(posRef.current.x, posRef.current.y, bounds);
      if (p.x !== posRef.current.x || p.y !== posRef.current.y) {
        posRef.current = p;
        setWalk((w) => ({ ...w, pos: p, duration: 0.3 }));
      }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const moveTo = useCallback((rawX, rawY) => {
    const bounds = boundsRef.current ?? computeBounds();
    const target = clampPoint(rawX, rawY, bounds);
    const from = posRef.current;
    posRef.current = target;
    setWalk({
      state: STATES.WALKING,
      facing: getDirection(from, target),
      pos: target,
      duration: travelDurationSec(getDistance(from, target), WALK_SPEED),
    });
  }, []);

  const handlePositionAnimComplete = useCallback(() => {
    setWalk((w) => (w.state === STATES.IDLE ? w : { ...w, state: STATES.IDLE }));
  }, []);

  return {
    petState: walk.state,
    facing: walk.facing,
    pos: walk.pos,
    duration: walk.duration,
    moveTo,
    handlePositionAnimComplete,
  };
}
