# PetCat — Virtual Pet Companion

A fixed, always-on-top desktop-pet companion for the vocabulary app, built with React Hooks + Framer Motion.

## Files

- `PetStateMachine.js` — pure constants + transition logic (no React, fully testable)
- `PetEngine.js` — `usePetEngine()` hook: owns all timers/state, exposes handlers + a learning-flow API
- `SpeechBubble.jsx` — controlled speech bubble
- `HeartParticle.jsx` — floating ❤️ particles
- `PetCat.jsx` — the component you actually render
- `PetCat.module.css` — fixed bottom-right positioning, sprite + bubble styling

## Basic usage

```jsx
import PetCat from './PetCat';

function App() {
  return (
    <>
      {/* ...your vocabulary app content... */}
      <PetCat />
    </>
  );
}
```

## Hooking into learning events

`PetCat` exposes an imperative ref API so quiz/lesson logic can trigger reactions
without prop-drilling pet state through your component tree:

```jsx
import { useRef } from 'react';
import PetCat from './PetCat';

function LessonScreen() {
  const petRef = useRef(null);

  const handleAnswer = (isCorrect) => {
    if (isCorrect) {
      petRef.current?.onCorrectAnswer(); // jump + ❤️❤️❤️, then back to idle
    }
  };

  const handleLessonFinish = () => {
    petRef.current?.onLessonComplete(); // double jump + "Great Job! 🎉"
  };

  return (
    <>
      {/* quiz UI calling handleAnswer / handleLessonFinish */}
      <PetCat ref={petRef} />
    </>
  );
}
```

## Required assets

Place these GIFs (already styled as cute/pastel/Japanese-mascot per the design brief) at:

```
/assets/cat/idle.gif
/assets/cat/walk.gif
/assets/cat/sit.gif
/assets/cat/sleep.gif
/assets/cat/jump.gif
```

## Behavior summary

| Trigger | Result |
|---|---|
| Idle for 5–10s | Randomly transitions to walk / sit / jump / sleep (weighted), then back to idle |
| Single click | Scale/heart-particle pulse + "Meow ❤️" bubble for 2s |
| Double click | Immediate jump |
| Long press (>600ms) | Immediate sleep |
| `onCorrectAnswer()` | Jump once + 3 hearts, then idle |
| `onLessonComplete()` | Jump twice + "Great Job! 🎉" bubble + 5 hearts, then idle |

The pet is `position: fixed`, `z-index: 999999`, so it survives scrolling and always
renders above app content, while the surrounding `.stage` wrapper has
`pointer-events: none` so only the cat itself — not the empty space around it —
intercepts clicks.
