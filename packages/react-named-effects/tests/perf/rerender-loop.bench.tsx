import * as React from "react";
import { bench, describe } from "vitest";
import TestRenderer from "react-test-renderer";
import { useNamedEffect } from "../../src/useNamedEffects";
import type { NamedEffectDependencySnapshot } from "../../src/behaviorSpecs";

const { act, create } = TestRenderer;

describe("perf: rerender loop", () => {
  bench("100 effects over 1000 rerenders", () => {
    function Component({ tick }: { tick: number }) {
      for (let i = 0; i < 100; i++) {
        useNamedEffect<NamedEffectDependencySnapshot>({
          name: "loop" + i,
          dependencySnapshot: { tick },
          handler: () => {},
        });
      }
      return null;
    }

    let tick = 0;
    let renderer;

    act(() => {
      renderer = create(<Component tick={tick} />);
    });

    for (let i = 0; i < 1000; i++) {
      tick++;
      act(() => {
        renderer.update(<Component tick={tick} />);
      });
    }
  });
});
