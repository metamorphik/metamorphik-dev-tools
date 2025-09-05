# Tests for react-scoped-events

This folder contains the test suite for the **react-scoped-events**
library.

## 📂 Structure

-   `event-horizon.test.tsx` → unit tests for the core event bus
    (`src/lib/event-horizon.ts`)
-   `react-horizon.test.tsx` → React hook & provider tests
    (`src/lib/react-horizon.tsx`)
-   `vitest.config.ts` → Vitest configuration for this package
-   `vitest.setup.ts` → global setup (loads jest-dom matchers, silences
    expected errors)

## 🧪 Running tests

Install dev dependencies (from this folder or repo root):

``` bash
npm install
```

Run tests:

``` bash
npm test
```

Run with coverage:

``` bash
npm run test:cov
```

Run with UI (interactive mode):

``` bash
npm run test:ui
```

## 🛠️ Notes

-   **JSX tests** must use `.tsx` extension (Vitest + Vite require
    this).
-   **Coverage** is configured but may need version alignment between
    `vitest` and `@vitest/coverage-v8`. At the moment, coverage
    reporting is optional.
-   **React Testing Library** is used for hooks and component tests.
-   **Vitest globals** are enabled (`expect`, `describe`, etc.) so no
    imports are required.

## ✅ Conventions

-   Prefer **unit tests** for core bus behavior (emit, pause/resume,
    async, errors).
-   Prefer **RTL** for React hooks (`useOnEvent`,
    `useEmitToNamedEventHorizon`, etc.).
-   Use `vi.waitUntil` or `screen.findByText` instead of arbitrary
    `setTimeout` for async asserts.
-   Keep error-path tests but silence `console.error` in
    `vitest.setup.ts` for clarity.

------------------------------------------------------------------------

Happy testing!
