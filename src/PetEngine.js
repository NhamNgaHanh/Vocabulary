/**
 * PetEngine.js
 * ------------------------------------------------------------------
 * The "brain" of the pet: a single custom hook that owns all timers,
 * state transitions, and exposes a small imperative API for outside
 * events (correct answer, lesson complete, click/long-press/etc).
 *
 * PetCat.jsx is intentionally "dumb" — it just reads what this hook
 * returns and renders the right sprite + motion props. All random()
 * calls happen inside callbacks/effects here, never during render.
 * ------------------------------------------------------------------
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  STATES,
  WALK_SPEED,
  IDLE_DURATION,
  SIT_DURATION,
  SLEEP_DURATION,
  JUMP_DURATION,
  BLINK_INTERVAL,
  LONG_PRESS_MS,
  BUBBLE_DURATION,
  HEART_LIFETIME,
  rand,
  randId,
  computeBounds,
  defaultStartPos,
  pickWalkTarget,
  pickNextActivity,
} from './PetStateMachine';

export function usePetEngine() {
  const [petState, setPetState] = useState(STATES.IDLE);
  const [facing, setFacing] = useState('right');
  const boundsRef = useRef(computeBounds());
  const [pos, setPos] = useState(() => defaultStartPos(boundsRef.current)); // {x, y} in viewport px
  const [walkPhase, setWalkPhase] = useState(null); // 'walking' | null (no "return home" anymore — it's a real destination)
  const [blinking, setBlinking] = useState(false);
  const [bubbleText, setBubbleText] = useState(null);
  const [hearts, setHearts] = useState([]);

  // Refs for things that must not trigger re-renders, and for guarding
  // against stale timers/animation callbacks after an interruption.
  const mountedRef = useRef(true);
  const timersRef = useRef([]);
  const tokenRef = useRef(0);
  const posRef = useRef(pos); // mirrors `pos` synchronously, for distance calcs mid-walk
  const walkDistanceRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const bubbleTimerRef = useRef(null);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const addTimer = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  /* ---------------- finite state machine ---------------- */

  // `runNext` (declared below) needs to be called once the idle timer
  // elapses, but `enterIdle` must exist first so the other transitions can
  // depend on it. Routing through a ref breaks that circular dependency
  // without ever giving `enterIdle` an unstable identity.
  const runNextRef = useRef(() => {});

  const enterIdle = useCallback(() => {
    clearTimers();
    setWalkPhase(null);
    setPetState(STATES.IDLE);
    const myToken = ++tokenRef.current;
    const duration = rand(IDLE_DURATION[0], IDLE_DURATION[1]);
    addTimer(() => {
      if (!mountedRef.current || tokenRef.current !== myToken) return;
      runNextRef.current();
    }, duration);
  }, [addTimer, clearTimers]);

  const startTimedState = useCallback(
    (state, duration, onDone) => {
      clearTimers();
      setPetState(state);
      const myToken = ++tokenRef.current;
      addTimer(() => {
        if (!mountedRef.current || tokenRef.current !== myToken) return;
        (onDone || enterIdle)();
      }, duration);
    },
    [addTimer, clearTimers, enterIdle]
  );

  const startWalk = useCallback(() => {
    const target = pickWalkTarget(posRef.current, boundsRef.current);
    if (!target) {
      enterIdle();
      return;
    }
    clearTimers();
    ++tokenRef.current;
    walkDistanceRef.current = target.distance;
    setFacing(target.direction);
    setPetState(STATES.WALKING);
    setWalkPhase('walking');
    setPos({ x: target.x, y: target.y });
  }, [clearTimers, enterIdle]);

  const runNext = useCallback(() => {
    const next = pickNextActivity();
    if (next === STATES.WALKING) startWalk();
    else if (next === STATES.SITTING) startTimedState(STATES.SITTING, rand(SIT_DURATION[0], SIT_DURATION[1]));
    else if (next === STATES.JUMPING) startTimedState(STATES.JUMPING, JUMP_DURATION);
    else if (next === STATES.SLEEPING) startTimedState(STATES.SLEEPING, SLEEP_DURATION);
    else enterIdle();
  }, [startWalk, startTimedState, enterIdle]);

  // Keep the ref pointed at the latest runNext closure (which captures
  // the latest startWalk/startTimedState) without changing enterIdle's identity.
  useEffect(() => {
    runNextRef.current = runNext;
  }, [runNext]);

  /* ---------------- walk animation completion ---------------- */

  const handlePositionAnimComplete = useCallback(() => {
    if (petState !== STATES.WALKING) return;
    enterIdle();
  }, [petState, enterIdle]);

  /* ---------------- lifecycle ---------------- */

  useEffect(() => {
    mountedRef.current = true;
    const onResize = () => {
      boundsRef.current = computeBounds();
      const b = boundsRef.current;
      setPos((p) => ({
        x: Math.min(Math.max(p.x, b.minX), b.maxX),
        y: Math.min(Math.max(p.y, b.minY), b.maxY),
      }));
    };
    window.addEventListener('resize', onResize);

    // Let the pet "wake up" briefly before its first move.
    const startTimer = setTimeout(() => enterIdle(), 1200);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('resize', onResize);
      clearTimeout(startTimer);
      clearTimers();
      clearTimeout(longPressTimerRef.current);
      clearTimeout(bubbleTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Blink only while idle, on a randomized cadence.
  useEffect(() => {
    if (petState !== STATES.IDLE) return;
    let blinkTimeout;
    const scheduleBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 160);
        scheduleBlink();
      }, rand(BLINK_INTERVAL[0], BLINK_INTERVAL[1]));
    };
    scheduleBlink();
    return () => clearTimeout(blinkTimeout);
  }, [petState]);

  /* ---------------- shared interaction primitives ---------------- */

  const showBubble = useCallback((text, duration = BUBBLE_DURATION) => {
    setBubbleText(text);
    clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setBubbleText(null), duration);
  }, []);

  const spawnHearts = useCallback((count = 3) => {
    const batch = Array.from({ length: count }, () => ({ id: randId(), x: rand(-12, 12) }));
    setHearts((curr) => [...curr, ...batch]);
    batch.forEach((h) => {
      setTimeout(() => {
        setHearts((curr) => curr.filter((x) => x.id !== h.id));
      }, HEART_LIFETIME);
    });
  }, []);

  /* ---------------- user interactions ---------------- */

  const handleClick = useCallback(() => {
    if (longPressFiredRef.current) {
      // This click is the tail end of a long-press; don't also pop a bubble.
      longPressFiredRef.current = false;
      return;
    }
    showBubble('Meow ❤️');
    spawnHearts(3);
  }, [showBubble, spawnHearts]);

  const triggerJump = useCallback(
    (onDone) => {
      setWalkPhase(null);
      startTimedState(STATES.JUMPING, JUMP_DURATION, onDone);
    },
    [startTimedState]
  );

  const triggerSleep = useCallback(() => {
    setWalkPhase(null);
    startTimedState(STATES.SLEEPING, SLEEP_DURATION);
  }, [startTimedState]);

  const handlePointerDown = useCallback(() => {
    longPressFiredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      triggerSleep();
    }, LONG_PRESS_MS);
  }, [triggerSleep]);

  const handlePointerUp = useCallback(() => {
    clearTimeout(longPressTimerRef.current);
  }, []);

  /* ---------------- learning-flow API (imperative, called from outside) ---------------- */

  /** Call when the user answers a vocabulary question correctly. */
  const celebrateCorrectAnswer = useCallback(() => {
    spawnHearts(3);
    triggerJump(() => enterIdle());
  }, [spawnHearts, triggerJump, enterIdle]);

  /** Call when the user finishes a whole lesson. */
  const celebrateLessonComplete = useCallback(() => {
    showBubble('Great Job! 🎉', 2400);
    spawnHearts(5);
    // Jump twice, back to back, then settle into idle.
    triggerJump(() => {
      triggerJump(() => enterIdle());
    });
  }, [showBubble, spawnHearts, triggerJump, enterIdle]);

  return {
    // render state
    petState,
    facing,
    pos, // {x, y} absolute viewport position
    walkPhase,
    blinking,
    bubbleText,
    hearts,
    // derived helper
    walkDurationSec: () => Math.max(0.35, walkDistanceRef.current / WALK_SPEED),
    // event handlers for the DOM node
    handlePositionAnimComplete,
    handleClick,
    handlePointerDown,
    handlePointerUp,
    triggerJumpImmediate: () => triggerJump(),
    // imperative learning-flow API
    celebrateCorrectAnswer,
    celebrateLessonComplete,
  };
}
