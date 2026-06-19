/**
 * PetStateMachine.js
 * ------------------------------------------------------------------
 * Pure, framework-agnostic logic for the pet's finite state machine.
 * No React, no timers, no DOM — just data + functions that decide
 * "what state comes next" and "how far can the cat walk".
 *
 * Keeping this pure makes it trivially testable and keeps random()
 * calls out of render code (PetEngine is the only place that calls
 * these, inside effects/callbacks, never during render).
 * ------------------------------------------------------------------
 */

export const STATES = {
  IDLE: 'idle',
  WALKING: 'walking',
  SITTING: 'sitting',
  SLEEPING: 'sleeping',
  JUMPING: 'jumping',
};

// Layout — pet now roams the *whole* viewport instead of a fixed corner.
export const PET_SIZE = 80; // px, width/height of the interactive hit-area
export const EDGE_MARGIN = 16; // px breathing room from any viewport edge
// Keep the cat clear of common chrome (top nav / bottom tab bar) so it never
// walks on top of real UI controls. Tune these two to match your app's header
// and bottom-nav heights, or set both to 0 if your layout has none.
export const TOP_SAFE_AREA = 70; // px reserved at the top (header / nav bar)
export const BOTTOM_SAFE_AREA = 80; // px reserved at the bottom (tab bar)
export const MIN_TRAVEL = 40; // px — below this, a destination isn't worth walking to

export const WALK_SPEED = 110; // px / second -> derives walk animation duration
export const IDLE_DURATION = [5000, 10000]; // "every 5~10 seconds" per spec
export const SIT_DURATION = [3000, 5000];
export const SLEEP_DURATION = 5000;
export const JUMP_DURATION = 900;
export const BLINK_INTERVAL = [3000, 6000];
export const LONG_PRESS_MS = 600;
export const BUBBLE_DURATION = 2000;
export const HEART_LIFETIME = 1000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const rand = (min, max) => Math.random() * (max - min) + min;
export const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
export const randId = () => Math.random().toString(36).slice(2, 9);

/** The rectangle the cat is allowed to roam within, in viewport px. */
export function computeBounds() {
  if (typeof window === 'undefined') {
    return { minX: 0, maxX: 300, minY: 0, maxY: 300 };
  }
  return {
    minX: EDGE_MARGIN,
    maxX: Math.max(EDGE_MARGIN, window.innerWidth - PET_SIZE - EDGE_MARGIN),
    minY: TOP_SAFE_AREA,
    maxY: Math.max(TOP_SAFE_AREA, window.innerHeight - PET_SIZE - BOTTOM_SAFE_AREA),
  };
}

/** A safe starting point: bottom-right-ish, like the old home corner. */
export function defaultStartPos(bounds) {
  return { x: bounds.maxX, y: bounds.maxY };
}

/**
 * Pick a random destination anywhere within the roaming bounds, far enough
 * from the current position to be worth an actual walk animation. Returns
 * null if the viewport is too small to move anywhere meaningfully.
 */
export function pickWalkTarget(current, bounds) {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  if (width < MIN_TRAVEL && height < MIN_TRAVEL) return null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const x = rand(bounds.minX, bounds.maxX);
    const y = rand(bounds.minY, bounds.maxY);
    const dist = Math.hypot(x - current.x, y - current.y);
    if (dist >= MIN_TRAVEL) {
      return { x, y, direction: x < current.x ? 'left' : 'right', distance: dist };
    }
  }
  // Fallback: just go to the far corner from wherever we are.
  const x = current.x < (bounds.minX + bounds.maxX) / 2 ? bounds.maxX : bounds.minX;
  const y = rand(bounds.minY, bounds.maxY);
  return { x, y, direction: x < current.x ? 'left' : 'right', distance: Math.hypot(x - current.x, y - current.y) };
}

/**
 * Weighted pick of the next "activity" state, always entered from idle.
 * Idle -> Walk -> Idle -> Sit -> Idle -> Jump -> Idle -> Sleep -> Idle
 * is the *typical* loop from the spec; in practice the next activity is
 * randomized (weighted) each time idle ends, which still produces that
 * same idle-sandwiched rhythm without ever feeling mechanically looped.
 */
export function pickNextActivity() {
  const table = [
    [STATES.WALKING, 0.35],
    [STATES.SITTING, 0.25],
    [STATES.JUMPING, 0.15],
    [STATES.SLEEPING, 0.1],
    [STATES.IDLE, 0.15], // sometimes the cat just... stays idle a little longer
  ];
  const roll = Math.random();
  let acc = 0;
  for (const [state, weight] of table) {
    acc += weight;
    if (roll <= acc) return state;
  }
  return STATES.IDLE;
}
