import * as React from "react";
import { describe, it, expect } from "vitest";
import TestRenderer from "react-test-renderer";
import { useNamedRafEffect, useNamedIdleEffect } from "../../src/useNamedEffects";

const { act, create } = TestRenderer;

describe("RAF and idle scheduling", () => {
  it("schedules and cleans up RAF effects", () => {
    const rafCalls: number[] = [];
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;

    let nextId = 1;
    const scheduled = new Map<number, FrameRequestCallback>();

    globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
      const id = nextId++;
      scheduled.set(id, cb);
      return id;
    };
    globalThis.cancelAnimationFrame = (id: number) => {
      scheduled.delete(id);
    };

    function TestComponent({ active }: { active: boolean }) {
      useNamedRafEffect({
        name: "raf-test",
        dependencySnapshot: { active },
        handler: (prev, current) => {
          if (!current.active) return;
          return () => {
            rafCalls.push(1);
          };
        },
      });
      return null;
    }

    let renderer;

    act(() => {
      renderer = create(<TestComponent active={true} />);
    });

    act(() => {
      for (const cb of scheduled.values()) {
        cb(performance.now());
      }
    });

    act(() => {
      renderer.unmount();
    });

    expect(rafCalls.length).toBe(1);

    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancel;
  });

  it("schedules idle work and runs cleanup", () => {
    const idleCalls: number[] = [];
    const originalRic = (globalThis as any).requestIdleCallback;
    const originalCic = (globalThis as any).cancelIdleCallback;

    let nextId = 1;
    const scheduled = new Map<number, IdleRequestCallback>();

    (globalThis as any).requestIdleCallback = (cb: IdleRequestCallback): number => {
      const id = nextId++;
      scheduled.set(id, cb);
      return id;
    };
    (globalThis as any).cancelIdleCallback = (id: number) => {
      scheduled.delete(id);
    };

    function TestComponent({ flag }: { flag: boolean }) {
      useNamedIdleEffect({
        name: "idle-test",
        dependencySnapshot: { flag },
        handler: (prev, current) => {
          if (!current.flag) return;
          return () => {
            idleCalls.push(1);
          };
        },
      });
      return null;
    }

    let renderer;

    act(() => {
      renderer = create(<TestComponent flag={true} />);
    });

    act(() => {
      for (const cb of scheduled.values()) {
        cb({ didTimeout: false, timeRemaining: () => 1 } as any);
      }
    });

    act(() => {
      renderer.unmount();
    });

    expect(idleCalls.length).toBe(1);

    (globalThis as any).requestIdleCallback = originalRic;
    (globalThis as any).cancelIdleCallback = originalCic;
  });
});
