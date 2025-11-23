import * as React from "react";
import { bench, describe } from "vitest";
import TestRenderer from "react-test-renderer";
import { useNamedEffect } from "../../src/useNamedEffects";
import type { NamedEffectDependencySnapshot } from "../../src/behaviorSpecs";

const { act, create } = TestRenderer;

describe("perf: many effects", () => {
  bench("mount 10k named effects", () => {
    function ManyEffects() {
      for (let i = 0; i < 10000; i++) {
        useNamedEffect<NamedEffectDependencySnapshot>({
          name: "e" + i,
          dependencySnapshot: { v: i },
          handler: () => {},
        });
      }
      return null;
    }

    act(() => {
      create(<ManyEffects />);
    });
  });
});
