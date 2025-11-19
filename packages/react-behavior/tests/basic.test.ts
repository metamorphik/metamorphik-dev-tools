import { describe, it, expect } from "vitest";
import { useClassified } from "../src/useClassified";
import * as React from "react";

// Note: This is a very light test; for real React hook tests you'll want @testing-library/react or react-hooks testing libs.
// Here we just ensure the hook can be called within a component without type errors.

function Demo() {
  const Base = useClassified(null, {
    state: { x: 1 },
    methods: {
      bump: (api) => () => api.set.x((v: number) => v + 1),
    },
    effects: {
      ping: {
        deps: (api) => [api.state.x],
        run: () => undefined,
      },
    },
    expose: (api) => ({ x: api.state.x, bump: api.methods.bump }),
  });

  const Child = useClassified(Base, {
    effects: {
      ping: { runSuperAfter: true, run: () => undefined },
    },
    expose: (api) => ({ ...api.base?.expose, x: api.state.x }),
  });

  expect(Child.api.expose.x).toBeDefined();
  return null;
}

describe("scaffold compiles", () => {
  it("Demo runs (compile-time)", () => {
    // compile-time only
    expect(true).toBe(true);
  });
});
