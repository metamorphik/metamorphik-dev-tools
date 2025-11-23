import * as React from "react";
import { describe, it } from "vitest";
import TestRenderer from "react-test-renderer";
import { useNamedEffect } from "../../src/useNamedEffects";
import type { NamedEffectDependencySnapshot } from "../../src/behaviorSpecs";

const { act, create } = TestRenderer;

const ITERATIONS = 100;

function ManyPlainEffects() {
  for (let i = 0; i < 10_000; i++) {
    React.useEffect(() => {}, [i]);
  }
  return null;
}

function ManyNamedEffects() {
  for (let i = 0; i < 10_000; i++) {
    useNamedEffect<NamedEffectDependencySnapshot>({
      name: "e" + i,
      dependencySnapshot: { v: i },
      handler: () => {},
    });
  }
  return null;
}

describe("perf: 10k plain vs 10k named effects (100 runs)", () => {
  it("logs average overhead for 10k effects", () => {
    let plainTotal = 0;
    let namedTotal = 0;
    let plainMin = Number.POSITIVE_INFINITY;
    let plainMax = 0;
    let namedMin = Number.POSITIVE_INFINITY;
    let namedMax = 0;

    for (let i = 0; i < ITERATIONS; i++) {
      // 10k plain useEffect
      let plainRenderer: TestRenderer.ReactTestRenderer;
      const t1Start = performance.now();
      act(() => {
        plainRenderer = create(<ManyPlainEffects />);
      });
      const t1End = performance.now();
      act(() => {
        plainRenderer.unmount();
      });
      const plainMs = t1End - t1Start;
      plainTotal += plainMs;
      plainMin = Math.min(plainMin, plainMs);
      plainMax = Math.max(plainMax, plainMs);

      // 10k named useNamedEffect
      let namedRenderer: TestRenderer.ReactTestRenderer;
      const t2Start = performance.now();
      act(() => {
        namedRenderer = create(<ManyNamedEffects />);
      });
      const t2End = performance.now();
      act(() => {
        namedRenderer.unmount();
      });
      const namedMs = t2End - t2Start;
      namedTotal += namedMs;
      namedMin = Math.min(namedMin, namedMs);
      namedMax = Math.max(namedMax, namedMs);
    }

    const plainAvg = plainTotal / ITERATIONS;
    const namedAvg = namedTotal / ITERATIONS;
    const diffAvg = namedAvg - plainAvg;
    const overheadPct = plainAvg > 0 ? ((namedAvg / plainAvg) - 1) * 100 : 0;

    console.log("==== 10k effects comparison over", ITERATIONS, "runs ====");
    console.log(
      `plain useEffect:      avg=${plainAvg.toFixed(3)}ms  ` +
        `min=${plainMin.toFixed(3)}ms  max=${plainMax.toFixed(3)}ms`,
    );
    console.log(
      `named useNamedEffect: avg=${namedAvg.toFixed(3)}ms  ` +
        `min=${namedMin.toFixed(3)}ms  max=${namedMax.toFixed(3)}ms`,
    );
    console.log(
      `overhead:            avg=${diffAvg.toFixed(3)}ms  (${overheadPct.toFixed(
        2,
      )}% on average)`,
    );
    console.log("=====================================================");
  });
});
