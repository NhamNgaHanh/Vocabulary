/**
 * PetStateMachine.js
 * ------------------------------------------------------------------
 * Pure constants + pure helper functions used by PetEngine.js.
 * Không có timer, không random — chỉ là các phép tính thuần.
 * ------------------------------------------------------------------
 */

export const STATES = {
  IDLE: "idle",
  WALKING: "walking",
};

export const WALK_SPEED = 0.35; // px / ms

/** Viewport bounds the pet is allowed to occupy (keeps the sprite on-screen). */
export function computeBounds(padding = 48) {
  const width = typeof window !== "undefined" ? window.innerWidth : 800;
  const height = typeof window !== "undefined" ? window.innerHeight : 600;
  return {
    minX: padding,
    minY: padding + 40,
    maxX: Math.max(padding, width - padding),
    maxY: Math.max(padding, height - 8),
  };
}

export function defaultStartPos(bounds) {
  // Đứng ngay trên thanh điều hướng dưới để không che tab.
  return { x: bounds.maxX - 20, y: Math.max(bounds.minY, bounds.maxY - 110) };
}

/** Clamp an arbitrary point (e.g. a raw click) inside the pet's bounds. */
export function clampPoint(x, y, bounds) {
  return {
    x: Math.min(Math.max(x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(y, bounds.minY), bounds.maxY),
  };
}

export function getDistance(from, to) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/** 'right' if the target is to the right of (or at) current x, else 'left'. */
export function getDirection(from, to) {
  return to.x >= from.x ? "right" : "left";
}

/** Travel duration in seconds for Framer Motion, based on distance + speed (px/ms). */
export function travelDurationSec(distance, speedPxPerMs = WALK_SPEED) {
  return Math.max(0.6, distance / speedPxPerMs / 400);
}
