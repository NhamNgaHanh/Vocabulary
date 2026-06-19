/**
 * PetStateMachine.js
 * ------------------------------------------------------------------
 * Pure constants + pure helper functions used by PetEngine.js.
 * No timers, no randomness, no state-transition logic lives here —
 * just numbers (bounds, distance, direction, duration).
 * ------------------------------------------------------------------
 */

export const STATES = {
  IDLE: 'idle',
  WALKING: 'walking',
  EATING: 'eating',
};

export const WALK_SPEED = 0.35; // px / ms

// --- AUTO_EAT_TEXT timing -------------------------------------------------
export const AUTO_EAT_IDLE_DELAY = 5000; // ms of continuous IDLE before auto-eat kicks in
export const EAT_PAUSE_MS = 300; // pause after arriving, before the eat animation starts
export const EAT_DURATION_MS = 500; // how long the eat animation (or idle fallback) plays

/** Viewport bounds the pet is allowed to occupy (keeps the sprite on-screen). */
export function computeBounds(padding = 48) {
  const width = typeof window !== 'undefined' ? window.innerWidth : 800;
  const height = typeof window !== 'undefined' ? window.innerHeight : 600;
  return {
    minX: padding,
    minY: padding,
    maxX: Math.max(padding, width - padding),
    maxY: Math.max(padding, height - padding),
  };
}

export function defaultStartPos(bounds) {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };
}

/** Clamp an arbitrary point (e.g. a raw click) inside the pet's bounds. */
export function clampPoint(x, y, bounds) {
  return {
    x: Math.min(Math.max(x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(y, bounds.minY), bounds.maxY),
  };
}

export function getDistance(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 'right' if the target is to the right of (or at) current x, else 'left'. */
export function getDirection(from, to) {
  return to.x >= from.x ? 'right' : 'left';
}

/** Travel duration in seconds for Framer Motion, based on distance + speed (px/ms). */
export function travelDurationSec(distance, speedPxPerMs = WALK_SPEED) {
  return Math.max(0.6, distance / speedPxPerMs / 400);
}