// Do NOT import from "vitest" here.
// Use globals provided by `test.globals: true`.

import '@testing-library/jest-dom/vitest';

let restoreError: (() => void) | null = null;

beforeAll(() => {
  const orig = console.error;
  // silence expected error-path noise during tests (e.g., HorizonError thrown paths)
  console.error = (...args: any[]) => {
    // comment this line if you want to see all console errors during tests
    // orig(...args);
  };
  restoreError = () => { console.error = orig; };
});

afterAll(() => {
  restoreError?.();
});
