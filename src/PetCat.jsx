/**
 * PetCat.jsx — mèo cảnh: đứng yên cho tới khi người dùng chạm vào vùng trống,
 * rồi đi tới đúng điểm đó (chân mèo đặt tại điểm chạm).
 *   petRef.current?.moveTo(e.clientX, e.clientY);
 * Mèo nằm dưới modal (z-40) và không bao giờ chặn thao tác bấm.
 */
import { memo, forwardRef, useImperativeHandle, useState } from "react";
import { motion } from "framer-motion";
import { usePetEngine } from "./PetEngine";
import { STATES } from "./PetStateMachine";
import idleSprite from "./assets/cat/idle.webp";
import walkSprite from "./assets/cat/walk.webp";

const SPRITES = { [STATES.IDLE]: idleSprite, [STATES.WALKING]: walkSprite };
const FALLBACK = { [STATES.IDLE]: "🐱", [STATES.WALKING]: "🐈" };
const OFFSET_X = 40;
const OFFSET_Y = 80;

const PetCat = forwardRef(function PetCat(_props, ref) {
  const { petState, facing, pos, duration, moveTo, handlePositionAnimComplete } = usePetEngine();
  const [failed, setFailed] = useState(false);
  useImperativeHandle(ref, () => ({ moveTo }), [moveTo]);
  const flip = facing === "left" ? "-scale-x-100" : "";

  return (
    <div className="pointer-events-none fixed inset-0 z-40" aria-hidden="true">
      <motion.div
        className="absolute top-0 left-0 size-20 select-none"
        initial={false}
        animate={{ x: pos.x - OFFSET_X, y: pos.y - OFFSET_Y }}
        transition={{ duration, ease: "easeInOut" }}
        onAnimationComplete={handlePositionAnimComplete}
      >
        <div className="absolute bottom-0 left-1/2 h-2.5 w-12 -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgb(0_0_0/.18),transparent_75%)]" />
        <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 ${flip}`}>
          {failed ? (
            <span className="text-5xl leading-none">{FALLBACK[petState]}</span>
          ) : (
            <img src={SPRITES[petState]} alt="" draggable={false} decoding="async" onError={() => setFailed(true)} className="w-[130px] max-w-none drop-shadow" />
          )}
        </div>
      </motion.div>
    </div>
  );
});

export default memo(PetCat);
