/**
 * PetCat.jsx
 * ------------------------------------------------------------------
 * A cute, pastel, Japanese-mascot-style desktop companion for an
 * English vocabulary app. Fixed to the bottom-right corner, always
 * above the learning content, never blocking it.
 *
 * - Visuals: swaps between five GIF sprites based on the current
 *   state (idle / walk / sit / sleep / jump).
 * - Behavior: delegated entirely to `usePetEngine` (PetEngine.js) +
 *   the pure logic in PetStateMachine.js — this file just renders.
 * - Learning hooks: parent components call methods on a ref to make
 *   the cat react to lesson events:
 *
 *     const petRef = useRef(null);
 *     <PetCat ref={petRef} />
 *     ...
 *     petRef.current.onCorrectAnswer();   // cat jumps + hearts
 *     petRef.current.onLessonComplete();  // cat double-jumps + "Great Job! 🎉"
 * ------------------------------------------------------------------
 */
import { memo, forwardRef, useImperativeHandle, useState } from 'react';
import { motion } from 'framer-motion';
import { usePetEngine } from './PetEngine';
import { STATES, JUMP_DURATION } from './PetStateMachine';
import SpeechBubble from './SpeechBubble';
import HeartParticle from './HeartParticle';
import styles from './PetCat.module.css';
import idleGif from './assets/cat/idle.gif';
import walkGif from './assets/cat/walk.gif';
import sitGif from './assets/cat/sit.gif';
import sleepGif from './assets/cat/sleep.gif';
import jumpGif from './assets/cat/jump.gif';


const SPRITES = {
  [STATES.IDLE]: idleGif,
  [STATES.WALKING]: walkGif,
  [STATES.SITTING]: sitGif,
  [STATES.SLEEPING]: sleepGif,
  [STATES.JUMPING]: jumpGif,
};

// Shown instead of the GIF if the asset fails to load (e.g. the file
// doesn't exist yet at /assets/cat/*.gif) — so the pet is never invisible.
const FALLBACK_EMOJI = {
  [STATES.IDLE]: '🐱',
  [STATES.WALKING]: '🐈',
  [STATES.SITTING]: '🐈‍⬛',
  [STATES.SLEEPING]: '😴',
  [STATES.JUMPING]: '🙀',
};

const PetCat = forwardRef(function PetCat(_props, ref) {
  const engine = usePetEngine();
  const {
    petState,
    facing,
    pos,
    bubbleText,
    hearts,
    handlePositionAnimComplete,
    handleClick,
    handlePointerDown,
    handlePointerUp,
    triggerJumpImmediate,
    celebrateCorrectAnswer,
    celebrateLessonComplete,
    walkDurationSec,
  } = engine;

  // Track sprite load failures per-state so we only fall back the ones
  // that actually 404, and recover automatically once a real file exists.
  const [spriteFailed, setSpriteFailed] = useState({});

  useImperativeHandle(
    ref,
    () => ({
      onCorrectAnswer: celebrateCorrectAnswer,
      onLessonComplete: celebrateLessonComplete,
    }),
    [celebrateCorrectAnswer, celebrateLessonComplete]
  );

  const isJumping = petState === STATES.JUMPING;
  const transition = isJumping
    ? {
        left: { duration: JUMP_DURATION / 1000, ease: 'easeOut' },
        top: { duration: JUMP_DURATION / 1000, ease: 'easeOut' },
        y: { duration: JUMP_DURATION / 1000, times: [0, 0.5, 1], ease: ['easeOut', 'easeIn'] },
      }
    : { left: { duration: walkDurationSec(), ease: 'easeInOut' }, top: { duration: walkDurationSec(), ease: 'easeInOut' } };

  const showFallback = spriteFailed[petState];

  return (
    <div className={styles.stage} aria-hidden="false">
      <motion.div
        className={styles.petContainer}
        animate={{ left: pos.x, top: pos.y, y: isJumping ? [0, -42, 0] : 0 }}
        transition={transition}
        onAnimationComplete={handlePositionAnimComplete}
        onClick={handleClick}
        onDoubleClick={triggerJumpImmediate}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="button"
        aria-label="Pet cat companion. Click to pet, double-click to make it jump, press and hold to put it to sleep."
        tabIndex={0}
      >
        <SpeechBubble text={bubbleText} />
        <HeartParticle hearts={hearts} />

        <div className={styles.shadow} />

        {showFallback ? (
          <div
            className={`${styles.spriteFallback} ${facing === 'left' ? styles.faceLeft : ''}`}
            aria-hidden="true"
          >
            {FALLBACK_EMOJI[petState]}
          </div>
        ) : (
          <motion.img
            key={petState}
            src={SPRITES[petState]}
            alt=""
            className={`${styles.sprite} ${facing === 'left' ? styles.faceLeft : ''}`}
            animate={petState === STATES.IDLE ? { y: [0, -3, 0] } : { y: 0 }}
            transition={
              petState === STATES.IDLE
                ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
            draggable={false}
            onError={() => setSpriteFailed((s) => ({ ...s, [petState]: true }))}
          />
        )}

        {petState === STATES.SLEEPING && (
          <motion.div
            className={styles.zzz}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], y: -18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            Zzz
          </motion.div>
        )}
      </motion.div>
    </div>
  );
});

export default memo(PetCat);
