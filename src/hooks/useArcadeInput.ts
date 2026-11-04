import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { arcadeHaptic } from '../utils/haptics';

export type ArcadeAction = 'fire' | 'overdrive' | 'pause' | 'restart';
export interface ArcadeInputState {
  x: number;
  y: number;
  pointerX: number | null;
  firing: boolean;
}

const directions: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
};
const actions: Record<string, ArcadeAction> = {
  Space: 'fire', ShiftLeft: 'overdrive', ShiftRight: 'overdrive', KeyE: 'overdrive',
  KeyP: 'pause', Escape: 'pause', KeyR: 'restart',
};

/** Shared input boundary. Game physics only reads the mutable frame state. */
export function useArcadeInput(options: {
  enabled: boolean;
  onAction: (action: ArcadeAction) => void;
  onInterrupt: () => void;
}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const state = useRef<ArcadeInputState>({ x: 0, y: 0, pointerX: null, firing: false });
  const [mode, setMode] = useState<'touch' | 'keyboard' | 'pointer'>(() =>
    matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard');
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const stickPointer = useRef<number | null>(null);
  const actionPointers = useRef(new Set<number>());
  const gesture = useRef<{ id: number; x: number; y: number; time: number } | null>(null);
  const lastTap = useRef({ time: -1000, x: 0, y: 0 });

  const reset = useCallback(() => {
    keys.current.clear();
    stickPointer.current = null;
    actionPointers.current.clear();
    gesture.current = null;
    state.current = { x: 0, y: 0, pointerX: null, firing: false };
    setStick({ x: 0, y: 0 });
  }, []);

  const dispatch = useCallback((action: ArcadeAction) => {
    if (!optionsRef.current.enabled) return;
    arcadeHaptic();
    optionsRef.current.onAction(action);
  }, []);

  useEffect(() => {
    if (!options.enabled) reset();
  }, [options.enabled, reset]);

  useEffect(() => {
    const updateKeys = () => {
      let x = 0, y = 0;
      keys.current.forEach(code => {
        if (directions[code]) { x += directions[code][0]; y += directions[code][1]; }
      });
      state.current.x = Math.max(-1, Math.min(1, x));
      state.current.y = Math.max(-1, Math.min(1, y));
      state.current.firing = keys.current.has('Space') || actionPointers.current.size > 0;
    };
    const down = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!optionsRef.current.enabled || target?.closest('input, textarea, select, [contenteditable=true]')) return;
      if (!directions[event.code] && !actions[event.code]) return;
      // A focused UI button keeps its native Space activation.
      if (event.code === 'Space' && target?.closest('button')) return;
      event.preventDefault();
      setMode('keyboard');
      state.current.pointerX = null;
      keys.current.add(event.code);
      updateKeys();
      if (actions[event.code] && !event.repeat) dispatch(actions[event.code]);
    };
    const up = (event: KeyboardEvent) => { keys.current.delete(event.code); updateKeys(); };
    const interrupt = () => { reset(); optionsRef.current.onInterrupt(); };
    const visibility = () => { if (document.hidden) interrupt(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', interrupt);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', interrupt);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [dispatch, reset]);

  const trackPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    state.current.pointerX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  };
  const canvasProps = {
    onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
      if (!optionsRef.current.enabled || (event.pointerType === 'mouse' && event.button !== 0) || gesture.current) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setMode(event.pointerType === 'touch' ? 'touch' : 'pointer');
      keys.current.clear();
      state.current.x = state.current.y = 0;
      trackPointer(event);
      gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
      dispatch('fire');
    },
    onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
      if (!optionsRef.current.enabled) return;
      if (gesture.current?.id === event.pointerId || (event.pointerType === 'mouse' && !gesture.current)) {
        setMode(event.pointerType === 'touch' ? 'touch' : 'pointer');
        trackPointer(event);
      }
    },
    onPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
      const start = gesture.current;
      if (!start || start.id !== event.pointerId) return;
      const now = performance.now();
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      // Upward swipe or a quick double tap activates the tactical action.
      if (event.pointerType !== 'mouse' && now - start.time < 450) {
        if (dy < -45 && Math.abs(dy) > Math.abs(dx) * 1.3) dispatch('overdrive');
        else if (Math.hypot(dx, dy) < 16) {
          const previous = lastTap.current;
          if (now - previous.time < 300 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 35) {
            dispatch('overdrive');
            lastTap.current.time = -1000;
          } else lastTap.current = { time: now, x: event.clientX, y: event.clientY };
        }
      }
      gesture.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel() { gesture.current = null; state.current.pointerX = null; },
    onLostPointerCapture() { gesture.current = null; },
    onPointerLeave(event: ReactPointerEvent<HTMLCanvasElement>) {
      if (!gesture.current && event.pointerType === 'mouse') state.current.pointerX = null;
    },
  };

  const moveStick = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = rect.width / 2;
    let x = (event.clientX - rect.left - radius) / (radius * .7);
    let y = (event.clientY - rect.top - rect.height / 2) / (radius * .7);
    const length = Math.max(1, Math.hypot(x, y));
    x /= length; y /= length;
    state.current.x = Math.abs(x) > .12 ? x : 0;
    state.current.y = Math.abs(y) > .12 ? y : 0;
    state.current.pointerX = null;
    setStick({ x, y });
  };
  const releaseStick = (event: ReactPointerEvent<HTMLElement>) => {
    if (stickPointer.current !== event.pointerId) return;
    stickPointer.current = null;
    state.current.x = state.current.y = 0;
    setStick({ x: 0, y: 0 });
  };
  const stickProps = {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (!optionsRef.current.enabled || stickPointer.current !== null) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      stickPointer.current = event.pointerId;
      setMode(event.pointerType === 'touch' ? 'touch' : 'pointer');
      arcadeHaptic();
      moveStick(event);
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      if (stickPointer.current === event.pointerId) moveStick(event);
    },
    onPointerUp: releaseStick,
    onPointerCancel: releaseStick,
    onLostPointerCapture: releaseStick,
  };
  const releaseFire = (event: ReactPointerEvent<HTMLElement>) => {
    actionPointers.current.delete(event.pointerId);
    state.current.firing = actionPointers.current.size > 0 || keys.current.has('Space');
  };
  const fireProps = {
    onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
      if (!optionsRef.current.enabled) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      actionPointers.current.add(event.pointerId);
      state.current.firing = true;
      dispatch('fire');
    },
    onPointerUp: releaseFire, onPointerCancel: releaseFire, onLostPointerCapture: releaseFire,
    onClick(event: ReactMouseEvent<HTMLButtonElement>) { if (event.detail === 0) dispatch('fire'); },
  };
  return { state, mode, stick, canvasProps, stickProps, fireProps, dispatch, reset };
}

export type ArcadeInput = ReturnType<typeof useArcadeInput>;
