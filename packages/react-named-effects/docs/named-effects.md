# @metamorphik/react-named-effects – API Reference

This document is the **authoritative specification** for `@metamorphik/react-named-effects`.

It describes:

- All public types and options.
- Effect scheduling semantics.
- Snapshot behavior (`prev` / `current`).
- Error-handling and debug behavior.
- Guarantees and limitations.

The top-level `README.md` is a narrative overview; this file is the **source of truth** for the API.

---

## 1. Core Types

### 1.1 `Cleanup`

```ts
export type Cleanup = void | (() => void);
```

The value returned by an effect handler. If it is a function, it will be called during cleanup.

---

### 1.2 `EffectKind`

```ts
export type EffectKind = "effect" | "layout" | "insertion" | "raf" | "idle";
```

Determines how the effect is scheduled:

- `"effect"`    – use `React.useEffect`.
- `"layout"`    – use `React.useLayoutEffect`.
- `"insertion"` – use `React.useInsertionEffect` if available; otherwise fall back to a normal effect.
- `"raf"`       – schedule work in `requestAnimationFrame`.
- `"idle"`      – schedule work in `requestIdleCallback` (or `setTimeout` as a fallback).

> **Hook stability rule:** For a given `useNamedEffect` call in a component, the `kind` value **must be stable** across renders to respect the Rules of Hooks.

---

### 1.3 `NamedEffectOptions`

```ts
export interface NamedEffectOptions {
  /**
   * Whether this effect should actually run.
   * If false, we still update prev-snapshot but skip calling the handler.
   */
  when?: boolean;

  /**
   * Which underlying hook/scheduler to use.
   * Should be stable for a given hook call across renders.
   */
  kind?: EffectKind;

  /**
   * Enable console logging of runs / diffs in development.
   */
  debug?: boolean;

  /**
   * Optional error handler. If provided, catches errors
   * from the effect and cleanup.
   */
  onError?: (error: unknown) => void;
}
```

Semantics:

- `when` (default: `true`)
  - If `true`, runs the handler and uses its return value as cleanup.
  - If `false`, **does not call** the handler for that render; snapshots still advance.
- `kind` (default: `"effect"`)
  - Controls which scheduling mode is used (see `EffectKind` above).
- `debug` (default: `false`)
  - When `true`, the library logs effect runs and diffs to the console in non-production builds.
- `onError`
  - If provided, errors from handler or cleanup are passed to this function and are **not re-thrown**.
  - If omitted, errors bubble naturally.

---

### 1.4 `NamedEffectDependencySnapshot`

```ts
export type NamedEffectDependencySnapshot = Record<string, any>;
```

An arbitrary object representing the values you care about. Its keys become fields on the `prev`/`current` snapshots passed to the handler.

Notes:

- Objects are compared by reference (strict equality).
- Snapshot structure is not inspected; only the `prev` vs `current` value references are compared internally for logging/diffing.
- The caller is responsible for deciding what to include in the snapshot.

---

### 1.5 `NamedEffectCallback`

```ts
export type NamedEffectCallback<
  TSnapshot extends NamedEffectDependencySnapshot,
> = (prev: TSnapshot | undefined, current: TSnapshot) => Cleanup;
```

Parameters:

- `prev`
  - The snapshot from the previous run, or `undefined` if this is the initial run.
- `current`
  - The current snapshot for this run.

Return:

- `void` or a `Cleanup` function to be run when the effect is cleaned up (React semantics apply, depending on the scheduling kind).

---

### 1.6 `NamedEffectSpec`

```ts
export interface NamedEffectSpec<
  TSnapshot extends NamedEffectDependencySnapshot = NamedEffectDependencySnapshot,
> {
  /**
   * Stable identifier for this effect within a component.
   * Used for logging and tooling; does not affect semantics.
   */
  name: string;

  /**
   * Your effect function. Receives previous and current snapshots.
   */
  handler: NamedEffectCallback<TSnapshot>;

  /**
   * Snapshot of the values you care about.
   * - Triggers reruns when any field changes.
   * - Is passed as `current` to the handler.
   * - Previous snapshot is passed as `prev`.
   */
  dependencySnapshot: TSnapshot;

  /**
   * Optional behavior and debug config (not flattened).
   */
  options?: NamedEffectOptions;
}
```

---

## 2. Hooks

### 2.1 `useNamedEffect`

```ts
export function useNamedEffect<
  TSnapshot extends NamedEffectDependencySnapshot,
>(spec: NamedEffectSpec<TSnapshot>): void;
```

#### Behavior

- Captures the provided `dependencySnapshot` each render.
- Computes `prev` as the snapshot from the previous render (or `undefined` if none).
- Passes `(prev, current)` to `handler`.
- Uses the handler’s return value as a cleanup function when appropriate.
- Applies the options from `spec.options`:
  - `when`
  - `kind`
  - `debug`
  - `onError`

#### Dependency tracking

Internal dependencies for React’s hook system are built from:

- The `name` (string)
- The values of all fields in `dependencySnapshot` (in insertion order)

This ensures React re-runs the effect whenever any snapshot field changes (by strict equality).

> **Note:** The library does **not** interpret or deep-compare snapshot contents beyond this.

#### Cleanup

- For `kind: "effect"` and `"layout"` / `"insertion"`:
  - Cleanup is invoked according to the underlying React hook semantics.
- For `kind: "raf"`:
  - Any scheduled animation frames are cancelled on cleanup.
  - If the handler returned a cleanup function, it is called after cancellation.
- For `kind: "idle"`:
  - The scheduled idle callback or timeout is cancelled.
  - If the handler returned a cleanup function, it is called after cancellation.

If `options.debug` is `true` and the build is not production, cleanup events are logged.

---

### 2.2 `useNamedLayoutEffect`

```ts
export function useNamedLayoutEffect<
  TSnapshot extends NamedEffectDependencySnapshot,
>(spec: NamedEffectSpec<TSnapshot>): void;
```

A convenience wrapper that calls `useNamedEffect` with `options.kind: "layout"` merged into the spec’s options.

Semantics are identical to `useNamedEffect` with the appropriate `kind` set.

---

### 2.3 `useNamedInsertionEffect`

```ts
export function useNamedInsertionEffect<
  TSnapshot extends NamedEffectDependencySnapshot,
>(spec: NamedEffectSpec<TSnapshot>): void;
```

Uses `React.useInsertionEffect` when available in the running React version. If not available, falls back to the default `useEffect`-style behavior.

Internally it merges `options.kind: "insertion"` into the spec.

---

### 2.4 `useNamedRafEffect`

```ts
export function useNamedRafEffect<
  TSnapshot extends NamedEffectDependencySnapshot,
>(spec: NamedEffectSpec<TSnapshot>): void;
```

Schedules the handler invocation inside a `requestAnimationFrame` callback.

- The effect itself runs in `useEffect`, but it only schedules the real work.
- Cleanup:
  - Cancels any scheduled animation frame.
  - Invokes the handler’s cleanup function (if any) after cancellation.

Useful for animations and paint-adjacent work that should avoid layout thrash.

---

### 2.5 `useNamedIdleEffect`

```ts
export function useNamedIdleEffect<
  TSnapshot extends NamedEffectDependencySnapshot,
>(spec: NamedEffectSpec<TSnapshot>): void;
```

Schedules handler execution using `requestIdleCallback` when available, otherwise falls back to `setTimeout` with a small delay.

- `cancelIdleCallback` or `clearTimeout` is used during cleanup.
- Handler cleanup is invoked after cancellation if provided.

Useful for non-urgent background work (e.g. analytics, low-priority calculations).

---

## 3. Debugging Semantics

Debug logging is controlled by:

- `options.debug` (per effect)
- An internal `NODE_ENV` check (no logs in production)

When enabled and in a non-production build, the library logs:

- **Runs** — including whether it’s the initial run, and a summary of changed snapshot fields.
- **Cleanups** — including the name, `kind`, and `when` state.

Sample log lines:

```text
[useNamedEffect] run → refresh-orders (kind=effect, when=true) | initial run
[useNamedEffect] run → refresh-orders (kind=effect, when=true) | changes: [customerId] 1 → 2
[useNamedEffect] cleanup → refresh-orders (kind=effect, when=true)
```

The logging format intentionally includes:

- the hook family (`useNamedEffect`),
- effect `name`,
- `kind`,
- `when` flag,
- and a short description of changes.

---

## 4. Error Semantics

If `options.onError` is provided:

- Errors thrown from:
  - the `handler(prev, current)` invocation,
  - the cleanup function returned by the handler,
- are caught and passed into `onError(error)`.

No error is re-thrown in this case.

If `options.onError` is **not** provided:

- Errors bubble normally, matching how React handles errors in effects in that environment.

This design allows consumers to opt into local, per-effect error handling where needed.

---

## 5. Guarantees & Limitations

### Guarantees

- `handler` always receives the most recent `dependencySnapshot` as `current`.
- `prev` is the previous snapshot for that hook call, or `undefined` on first run.
- `kind` determines scheduling mode according to the rules above.
- Cleanup is always run before re-running the effect (subject to the underlying React semantics per kind).
- Debug logging respects `NODE_ENV` and does not log in production.

### Limitations

- The library does not track or interpret React state or props directly; it only sees the `dependencySnapshot` you pass.
- Deep comparisons of snapshot contents are not performed for behavior; they are used solely for best-effort change summaries in logs.
- `kind` must be stable per hook call across renders; changing it dynamically would violate the Rules of Hooks and is not supported.
- This library is not a state-management or behavior-inheritance system; it only enhances effect ergonomics.

---

## 6. Versioning Policy

- Semver is used.
- Additive changes (new options, new kinds) are **minor** versions.
- Breaking changes to existing types or semantics are **major** versions.
- Internal implementation details (logging format, internal utility functions) may change between versions without notice, as long as the documented API remains stable.

For high-level usage examples and narrative documentation, refer back to:

> `README.md` at the root of the package.
