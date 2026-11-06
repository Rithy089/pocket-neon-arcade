import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useArcadeInput, ArcadeInput, ArcadeAction } from '../src/hooks/useArcadeInput';

/** Run on the dev server with a menu open so the live game's input is suspended. */
export function runInputSmoke() {
  if (!document.querySelector('[role="dialog"]')) throw Error('Open an arcade menu before testing');
  const host = document.createElement('div');
  host.hidden = true;
  document.body.append(host);
  const root = createRoot(host);
  let input: ArcadeInput;
  const actions: ArcadeAction[] = [];
  const passed: string[] = [];
  function Harness({ enabled, doubleTap = true }: { enabled: boolean; doubleTap?: boolean }) {
    input = useArcadeInput({ enabled, allowDoubleTap: () => doubleTap, onAction: action => actions.push(action), onInterrupt: () => actions.push('pause') });
    return null;
  }
  const check = (condition: boolean, label: string) => { if (!condition) throw Error(label); passed.push(label); };
  const key = (type: string, code: string, repeat = false) => flushSync(() => document.body.dispatchEvent(new KeyboardEvent(type, { code, repeat, cancelable: true, bubbles: true })));
  const target = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    setPointerCapture: () => {}, releasePointerCapture: () => {}, hasPointerCapture: () => true,
  };
  const pointer = (id: number, x: number, y: number, type = 'touch') => ({
    pointerId: id, clientX: x, clientY: y, pointerType: type, button: 0,
    preventDefault: () => {}, currentTarget: target,
  });
  try {
    flushSync(() => root.render(createElement(Harness, { enabled: true })));
    key('keydown', 'KeyA'); key('keydown', 'ArrowRight'); key('keyup', 'KeyA');
    check(input!.state.current.x === 1, 'overlapping WASD and arrow releases preserve the remaining direction');
    key('keydown', 'KeyW');
    check(input!.state.current.y === -1, 'WASD exposes the vertical axis for game adapters');
    key('keydown', 'Space'); key('keydown', 'Space', true);
    check(actions.filter(x => x === 'fire').length === 1 && input!.state.current.firing, 'held fire does not repeat discrete launch actions');
    key('keyup', 'Space');
    check(!input!.state.current.firing, 'key release stops firing');
    flushSync(() => window.dispatchEvent(new Event('blur')));
    check(input!.state.current.x === 0 && input!.state.current.y === 0, 'focus loss clears all held axes');
    const start = actions.length;
    flushSync(() => root.render(createElement(Harness, { enabled: false })));
    key('keydown', 'Space');
    check(actions.length === start && !input!.state.current.firing, 'modal-disabled input cannot launch or shoot');
    flushSync(() => root.render(createElement(Harness, { enabled: true })));
    // Mock capture only in this isolated fixture; production handlers use native pointer capture.
    const event = pointer(1, 25, 75) as unknown as Parameters<ArcadeInput['canvasProps']['onPointerDown']>[0];
    flushSync(() => input!.canvasProps.onPointerDown(event));
    check(input!.state.current.pointerX === .25, 'canvas pointer coordinates normalize to the viewport');
    flushSync(() => input!.canvasProps.onPointerUp({ ...event, clientY: 10 }));
    check(actions.at(-1) === 'overdrive', 'an upward swipe triggers Overdrive');
    check(input!.state.current.pointerX === null, 'lifting a touch releases direct positioning');
    flushSync(() => input!.reset());
    const tap = pointer(2, 50, 50) as typeof event;
    flushSync(() => { input!.canvasProps.onPointerDown(tap); input!.canvasProps.onPointerUp(tap); });
    flushSync(() => { input!.canvasProps.onPointerDown(tap); input!.canvasProps.onPointerUp(tap); });
    check(actions.at(-1) === 'overdrive', 'double tap triggers Overdrive');
    flushSync(() => input!.stickProps.onPointerDown(pointer(3, 100, 50) as unknown as Parameters<ArcadeInput['stickProps']['onPointerDown']>[0]));
    flushSync(() => input!.fireProps.onPointerDown(pointer(4, 0, 0) as unknown as Parameters<ArcadeInput['fireProps']['onPointerDown']>[0]));
    check(input!.state.current.x > .9 && input!.state.current.firing, 'two simultaneous touch pointers can move and shoot');
    flushSync(() => input!.stickProps.onPointerCancel(pointer(3, 100, 50) as unknown as Parameters<ArcadeInput['stickProps']['onPointerCancel']>[0]));
    flushSync(() => input!.fireProps.onPointerCancel(pointer(4, 0, 0) as unknown as Parameters<ArcadeInput['fireProps']['onPointerCancel']>[0]));
    check(input!.state.current.x === 0 && !input!.state.current.firing, 'pointer cancellation releases thumbstick and fire');
    flushSync(() => input!.reset());
    flushSync(() => input!.stickProps.onPointerDown(pointer(5, 100, 50) as unknown as Parameters<ArcadeInput['stickProps']['onPointerDown']>[0]));
    const canvasTap = pointer(6, 20, 20) as typeof event;
    flushSync(() => { input!.canvasProps.onPointerDown(canvasTap); input!.canvasProps.onPointerUp(canvasTap); });
    check(input!.state.current.x > .9 && input!.state.current.pointerX === null, 'canvas taps cannot cancel a stationary held thumbstick');
    key('keydown', 'KeyA'); key('keyup', 'KeyA');
    check(input!.state.current.x > .9, 'keyboard key-up cannot cancel a stationary held thumbstick');
    flushSync(() => input!.reset());
    flushSync(() => root.render(createElement(Harness, { enabled: true, doubleTap: false })));
    const beforeRapidFire = actions.filter(action => action === 'overdrive').length;
    flushSync(() => { input!.canvasProps.onPointerDown(tap); input!.canvasProps.onPointerUp(tap); });
    flushSync(() => { input!.canvasProps.onPointerDown(tap); input!.canvasProps.onPointerUp(tap); });
    check(actions.filter(action => action === 'overdrive').length === beforeRapidFire, 'rapid-fire mode cannot accidentally trigger double-tap Overdrive');
    const beforeButton = actions.length;
    flushSync(() => input!.actionProps('overdrive').onPointerDown(pointer(7, 0, 0) as unknown as Parameters<ArcadeInput['fireProps']['onPointerDown']>[0]));
    flushSync(() => input!.actionProps('overdrive').onClick({ detail: 1 } as Parameters<ArcadeInput['fireProps']['onClick']>[0]));
    check(actions.length === beforeButton + 1 && actions.at(-1) === 'overdrive', 'action B responds on pointer-down without a duplicate click');
    return { passed };
  } finally {
    flushSync(() => root.unmount());
    host.remove();
  }
}
