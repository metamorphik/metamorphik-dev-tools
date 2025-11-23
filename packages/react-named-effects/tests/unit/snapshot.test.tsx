import * as React from "react";
import { describe, it, expect } from "vitest";
import TestRenderer from "react-test-renderer";
import { useNamedEffect } from "../../src/useNamedEffects";
import type { NamedEffectDependencySnapshot } from "../../src/behaviorSpecs";

const { act, create } = TestRenderer;

describe("useNamedEffect snapshot behavior", () => {
  it("passes undefined prev on first run and current snapshot thereafter", () => {
    const events: Array<{ prev: any; current: any }> = [];

    function TestComponent({ value }: { value: number }) {
      useNamedEffect<NamedEffectDependencySnapshot>({
        name: "test-snapshot",
        dependencySnapshot: { value },
        handler: (prev, current) => {
          events.push({ prev, current });
        },
      });
      return null;
    }

    let renderer;

    act(() => {
      renderer = create(<TestComponent value={1} />);
    });
    act(() => {
      renderer.update(<TestComponent value={2} />);
    });
    act(() => {
      renderer.update(<TestComponent value={3} />);
    });

    expect(events.length).toBe(3);
    expect(events[0].prev).toBeUndefined();
    expect(events[0].current).toEqual({ value: 1 });
    expect(events[1].prev).toEqual({ value: 1 });
    expect(events[1].current).toEqual({ value: 2 });
    expect(events[2].prev).toEqual({ value: 2 });
    expect(events[2].current).toEqual({ value: 3 });
  });
});