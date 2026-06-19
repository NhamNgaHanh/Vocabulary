/**
 * SpeechBubble.jsx
 * ------------------------------------------------------------------
 * Tiny presentational component: shows/hides a speech bubble above
 * the cat. Pure, memoized, no internal state — text + visibility are
 * fully controlled by the parent so it never needs its own timers.
 * ------------------------------------------------------------------
 */
import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './PetCat.module.css';

const SpeechBubble = ({ text }) => (
  <AnimatePresence>
    {text && (
      <motion.div
        className={styles.bubble}
        initial={{ opacity: 0, y: 8, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18 }}
      >
        {text}
      </motion.div>
    )}
  </AnimatePresence>
);

export default memo(SpeechBubble);
