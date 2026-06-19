/**
 * PetCat.jsx
 * ------------------------------------------------------------------
 * A simple desktop pet: idle until clicked, then walks smoothly to
 * wherever the user clicked and waits there.
 *
 * - Visuals: idle.gif while STATES.IDLE, walk.gif while STATES.WALKING.
 *   Facing direction is a CSS transform (mirror), not a sprite swap.
 * - Behavior: delegated entirely to `usePetEngine` (PetEngine.js) +
 *   the pure helpers in PetStateMachine.js — this file just renders.
 * - Movement: the parent app forwards clicks anywhere on the page into
 *   `moveTo(x, y)`, exposed here via the ref:
 *
 *     const petRef = useRef(null);
 *     <div onClick={(e) => petRef.current?.moveTo(e.clientX, e.clientY)}>
 *       <PetCat ref={petRef} />
 *       ...rest of the app...
 *     </div>
 * ------------------------------------------------------------------
 */
import { memo, forwardRef, useImperativeHandle, useState } from 'react';
import { motion } from 'framer-motion';
import { usePetEngine } from './PetEngine';
import { STATES } from './PetStateMachine';
import styles from './PetCat.module.css';
import idleGif from './assets/cat/idle.gif';
import walkGif from './assets/cat/walk.gif';

const SPRITES = {
  [STATES.IDLE]: idleGif,
  [STATES.WALKING]: walkGif,
  // No eat.gif asset shipped yet, so EATING just reuses the idle sprite —
  // satisfies "stay idle-looking if no eat animation exists" with zero
  // risk of a missing-file build error. Once a real asset exists, add
  // `import eatGif from './assets/cat/eat.gif';` above and swap it in here.
  [STATES.EATING]: idleGif,
};

// Shown instead of the GIF if the asset fails to load — so the pet is
// never invisible.
const FALLBACK_EMOJI = {
  [STATES.IDLE]: '🐱',
  [STATES.WALKING]: '🐈',
  [STATES.EATING]: '🐱',
};

const PetCat = forwardRef(function PetCat(_props, ref) {
  const { petState, facing, pos, moveTo, walkDurationSec, handlePositionAnimComplete } = usePetEngine();

  // Track sprite load failures so we fall back to an emoji if the gif 404s.
  const [spriteFailed, setSpriteFailed] = useState(false);

  useImperativeHandle(ref, () => ({ moveTo }), [moveTo]);

  const transition = {
    left: { duration: walkDurationSec(), ease: 'easeInOut' },
    top: { duration: walkDurationSec(), ease: 'easeInOut' },
  };

  return (
    <div className={styles.stage} aria-hidden="false">
      <motion.div
        className={styles.petContainer}
        animate={{ left: pos.x, top: pos.y }}
        transition={transition}
        onAnimationComplete={handlePositionAnimComplete}
        role="img"
        aria-label="Pet cat companion"
      >
        <div className={styles.shadow} />

        {spriteFailed ? (
          <div
            className={`${styles.spriteFallback} ${facing === 'left' ? styles.faceLeft : ''}`}
            aria-hidden="true"
          >
            {FALLBACK_EMOJI[petState]}
          </div>
        ) : (
          <img
            src={SPRITES[petState]}
            alt=""
            className={`${styles.sprite} ${facing === 'left' ? styles.faceLeft : ''}`}
            draggable={false}
            onError={() => setSpriteFailed(true)}
          />
        )}
      </motion.div>
    </div>
  );
});

export default memo(PetCat);