import * as React from "react";
import { describe, it, expect } from "vitest";
import TestRenderer from "react-test-renderer";
import { useNamedEffect } from "../../src/useNamedEffects";

const { act, create } = TestRenderer;

describe("useNamedEffect options.when", () => {
  it("skips handler when when=false but still advances snapshots", () => {
    const calls: Array<{ prev: any; current: any }> = [];

    function TestComponent({ value, enabled }: { value: number; enabled: boolean }) {
      useNamedEffect({
        name: "conditional",
        dependencySnapshot: { value },
        options: { when: enabled },
        handler: (prev, current) => {
          calls.push({ prev, current });
        },
      });
      return null;
    }

    let renderer;

    act(() => {
      renderer = create(<TestComponent value={1} enabled={true} />);
    });
    act(() => {
      renderer.update(<TestComponent value={2} enabled={false} />);
    });
    act(() => {
      renderer.update(<TestComponent value={3} enabled={true} />);
    });

    expect(calls.length).toBe(2);
    expect(calls[0].prev).toBeUndefined();
    expect(calls[0].current).toEqual({ value: 1 });
    expect(calls[1].prev).toEqual({ value: 2 });
    expect(calls[1].current).toEqual({ value: 3 });
  });
});