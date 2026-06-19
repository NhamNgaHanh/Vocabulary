/**
 * PetEngine.js
 * ------------------------------------------------------------------
 * The "brain" of the pet. Two visible states (IDLE / WALKING), plus a
 * brief EATING beat used only by the AUTO_EAT_TEXT behavior below.
 *
 * AUTO_EAT_TEXT:
 * If the pet sits IDLE for AUTO_EAT_IDLE_DELAY (5s), it looks for the
 * nearest `.vocab-word` element on screen and walks to it using the
 * exact same `moveTo()` path a user click would take. On arrival it
 * pauses, "eats" (EATING state — PetCat.jsx renders eat.gif or just
 * stays idle-looking if that asset doesn't exist), then reports the
 * word as eaten via `onEatWord(id)` and/or a `pet-eat-word` event, and
 * returns to IDLE. The 5s timer restarts any time the pet becomes IDLE
 * again (after walking or eating). A real user click at any point —
 * including mid-auto-walk — cancels the auto-eat sequence and takes
 * priority, since it goes through the same `moveTo()` call.
 *
 * PetCat.jsx stays "dumb" — it just reads what this hook returns and
 * renders idle.gif / walk.gif / eat.gif accordingly.
 * ------------------------------------------------------------------
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  STATES,
  WALK_SPEED,
  AUTO_EAT_IDLE_DELAY,
  EAT_PAUSE_MS,
  EAT_DURATION_MS,
  computeBounds,
  defaultStartPos,
  clampPoint,
  getDistance,
  getDirection,
  travelDurationSec,
} from './PetStateMachine';

/** Finds the `.vocab-word` element whose center is closest to `from`. */
function findNearestVocabWord(from) {
  if (typeof document === 'undefined') return null;
  const candidates = document.querySelectorAll('.vocab-word');
  let nearest = null;
  let nearestDist = Infinity;
  candidates.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const dist = getDistance(from, center);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = { id: el.dataset.id ?? el.id ?? null, center };
    }
  });
  return nearest;
}

export function usePetEngine(onEatWord) {
  const [petState, setPetState] = useState(STATES.IDLE);
  const [facing, setFacing] = useState('right');
  const boundsRef = useRef(computeBounds());
  const [pos, setPos] = useState(() => defaultStartPos(boundsRef.current));

  // Mirrors `pos` synchronously so a mid-walk click can compute distance
  // from wherever the pet visually is right now, without waiting on React
  // state to flush.
  const posRef = useRef(pos);
  const walkDistanceRef = useRef(0);

  // Latest `onEatWord` without forcing moveTo/handlePositionAnimComplete
  // to change identity every render.
  const onEatWordRef = useRef(onEatWord);
  useEffect(() => {
    onEatWordRef.current = onEatWord;
  }, [onEatWord]);

  // AUTO_EAT_TEXT bookkeeping: which word (if any) the pet is currently
  // walking toward to eat, and the timers driving the post-arrival pause
  // + eat beat. Kept separate from the 5s idle-trigger timer.
  const pendingEatRef = useRef(null); // { id } | null
  const idleTimerRef = useRef(null);
  const eatTimersRef = useRef([]);

  const addEatTimer = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    eatTimersRef.current.push(id);
    return id;
  }, []);

  const clearEatTimers = useCallback(() => {
    eatTimersRef.current.forEach(clearTimeout);
    eatTimersRef.current = [];
  }, []);

  const clearIdleTimer = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  }, []);

  /**
   * moveTo(x, y, eatTarget) — call with raw event coordinates (e.g.
   * event.clientX/Y). Clamps into bounds, faces the destination, and
   * starts walking there — identical for a user click and an auto-eat
   * walk. `eatTarget` (internal use) is `{ id }` for an auto-eat walk,
   * or omitted/null for a normal click — and a normal click always
   * overwrites/cancels any auto-eat walk in progress.
   */
  const moveTo = useCallback(
    (rawX, rawY, eatTarget = null) => {
      clearIdleTimer();
      clearEatTimers();
      pendingEatRef.current = eatTarget;

      const bounds = boundsRef.current;
      const target = clampPoint(rawX, rawY, bounds);
      const from = posRef.current;

      walkDistanceRef.current = getDistance(from, target);
      setFacing(getDirection(from, target));
      setPetState(STATES.WALKING);
      setPos(target);
      posRef.current = target;
    },
    [clearIdleTimer, clearEatTimers]
  );

  /** Called by PetCat.jsx when the Framer Motion position animation finishes. */
  const handlePositionAnimComplete = useCallback(() => {
    const eatTarget = pendingEatRef.current;
    if (!eatTarget) {
      setPetState(STATES.IDLE);
      return;
    }
    pendingEatRef.current = null;

    // Arrived to eat: pause briefly, "eat", report it, then go IDLE.
    addEatTimer(() => {
      setPetState(STATES.EATING);
      addEatTimer(() => {
        if (eatTarget.id != null) {
          onEatWordRef.current?.(eatTarget.id);
          window.dispatchEvent(new CustomEvent('pet-eat-word', { detail: { id: eatTarget.id } }));
        }
        setPetState(STATES.IDLE);
      }, EAT_DURATION_MS);
    }, EAT_PAUSE_MS);
  }, [addEatTimer]);

  /* ---------------- AUTO_EAT_TEXT: 5s idle trigger ---------------- */

  useEffect(() => {
    if (petState !== STATES.IDLE) return undefined;

    idleTimerRef.current = setTimeout(() => {
      const nearest = findNearestVocabWord(posRef.current);
      if (nearest && nearest.id != null) {
        moveTo(nearest.center.x, nearest.center.y, { id: nearest.id });
      }
    }, AUTO_EAT_IDLE_DELAY);

    return clearIdleTimer;
  }, [petState, moveTo, clearIdleTimer]);

  // Belt-and-suspenders cleanup on unmount.
  useEffect(() => {
    return () => {
      clearIdleTimer();
      clearEatTimers();
    };
  }, [clearIdleTimer, clearEatTimers]);

  return {
    petState,
    facing,
    pos,
    moveTo,
    walkDurationSec: () => travelDurationSec(walkDistanceRef.current, WALK_SPEED),
    handlePositionAnimComplete,
  };
}