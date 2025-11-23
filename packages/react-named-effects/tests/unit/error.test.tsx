import * as React from "react";
import { describe, it, expect } from "vitest";
import TestRenderer from "react-test-renderer";
import { useNamedEffect } from "../../src/useNamedEffects";

const { act, create } = TestRenderer;

describe("useNamedEffect onError", () => {
  it("routes handler errors to onError when provided", () => {
    const errors: unknown[] = [];

    function TestComponent() {
      useNamedEffect({
        name: "error-test",
        dependencySnapshot: { n: 1 },
        options: { onError: (err) => errors.push(err) },
        handler: () => {
          throw new Error("boom");
        },
      });
      return null;
    }

    let renderer;

    act(() => {
      renderer = create(<TestComponent />);
    });

    expect(errors.length).toBe(1);
    expect((errors[0] as Error).message).toBe("boom");
  });
});