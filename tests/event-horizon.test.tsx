import { describe, it, expect, vi } from 'vitest';
import { createEventHorizon } from '../src/event-horizon';

const flush = () => new Promise((r) => queueMicrotask(r));

describe('event-horizon (core bus)', () => {
  it('subscribes and unsubscribes without leaks', async () => {
    const eh = createEventHorizon();
    const fn = vi.fn();
    const off = eh.on('ping', fn);
    eh.emit('ping', { a: 1 });
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);

    off();
    eh.emit('ping', { a: 2 });
    await flush();
    expect(fn).toHaveBeenCalledTimes(1); // no further calls

    expect(eh._listeners.get('ping')?.size ?? 0).toBe(0);
  });

it('batches via microtask and awaits async handlers', async () => {
  const eh = createEventHorizon();
  const seen: number[] = [];
  eh.on('t', async (n: number) => {
    await new Promise((r) => setTimeout(r, 0)); // macrotask
    seen.push(n);
  });

  eh.emit('t', 1);
  eh.emit('t', 2);

  await vi.waitUntil(() => seen.length === 2, { timeout: 250 });
  expect(seen).toEqual([1, 2]);
});


  it('continues delivery when one handler throws', async () => {
    const eh = createEventHorizon();
    const good = vi.fn();
    eh.on('x', () => { throw new Error('boom'); });
    eh.on('x', good);
    eh.emit('x', 42);
    await flush();
    expect(good).toHaveBeenCalledTimes(1);
  });

  it('supports re-entrant emit from within a handler', async () => {
    const eh = createEventHorizon();
    const seen: string[] = [];
    eh.on('a', () => {
      seen.push('a1');
      eh.emit('b', 'b!');
      seen.push('a2');
    });
    eh.on('b', (p) => { seen.push(String(p)); });
    eh.emit('a', null);
    await flush();
    expect(seen).toEqual(['a1', 'a2', 'b!']);
  });

  it('pause()/resume() gates processing', async () => {
    const eh = createEventHorizon();
    const fn = vi.fn();
    eh.on('p', fn);
    eh.pause();
    eh.emit('p', 1); // queued but not processed
    await flush();
    expect(fn).not.toHaveBeenCalled();

    eh.resume(); // should drain queue
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
