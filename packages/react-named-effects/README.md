# @metamorphik/react-named-effects

**Named, snapshot-based effects for React — give every side-effect a clear, stable identity.**  
A small layer on top of React’s effect hooks that adds *names*, *prev/current snapshots*, and *optional scheduling modes* — without changing how you write components.

> This README is the **presentation / overview**.  
> For the full formal API spec, see:  
> 👉 [`APIs/docs/named-effects.md`](APIs/docs/named-effects.md)

---

## ✨ Features

- 🏷️ **Named effects** — every effect has a readable `name` for logs and tooling.
- 🧩 **Spec-based API** — configure each effect with a single `NamedEffectSpec` object.
- 🔄 **Prev & current snapshots** — your handler receives both the previous and current values you care about.
- 🎚️ **Flexible scheduling** — choose between `effect`, `layout`, `insertion`, `raf`, or `idle` scheduling.
- 🎛️ **`when` guard** — keep snapshot history even when you skip running the handler.
- 🧯 **Per-effect error handling** — optional `onError` for handler + cleanup.
- 🔍 **Debug logging in dev** — see what changed and which effect ran.
- ⚡ **Tiny and focused** — no runtime deps beyond React.

The goal is to make your side-effects **explicit, named, and easier to reason about**, while staying as close as possible to React’s built-in hooks.

---

## 🚀 Installation

```bash
npm install @metamorphik/react-named-effects
# or
pnpm add @metamorphik/react-named-effects
# or
yarn add @metamorphik/react-named-effects
```

---

## 🏁 Quickstart

Classic `useEffect` with manual prev-tracking:

```tsx
import * as React from "react";

function Profile({ userId }: { userId: string }) {
  const prevUserIdRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      console.log("Loading profile for:", userId);
    }
    prevUserIdRef.current = userId;
  }, [userId]);

  return <div>Profile: {userId}</div>;
}
```

With **`useNamedEffect`**, you remove the ref and gain a name + snapshot:

```tsx
import { useNamedEffect } from "@metamorphik/react-named-effects";

export function Profile({ userId }: { userId: string }) {
  useNamedEffect({
    name: "load-profile",
    dependencySnapshot: { userId },
    handler: (prev, current) => {
      if (!prev || prev.userId !== current.userId) {
        console.log("Loading profile for:", current.userId);
      }
    },
  });

  return <div>Profile: {userId}</div>;
}
```

Key points:

- You pass a **spec object** with `name`, `dependencySnapshot`, and `handler`.
- `dependencySnapshot` is any object; its fields become the `prev` / `current` values you use.
- On the **first run**, `prev` is `undefined`, `current` is your snapshot.
- On later runs, `prev` is the previous snapshot and `current` is the latest one.

---

## 🧭 High-level API Overview

The main hook accepts a `NamedEffectSpec`:

```ts
import type {
  NamedEffectSpec,
  NamedEffectDependencySnapshot,
} from "@metamorphik/react-named-effects";

function useNamedEffect<TSnapshot extends NamedEffectDependencySnapshot>(
  spec: NamedEffectSpec<TSnapshot>
): void;
```

There are also convenience wrappers:

```ts
useNamedLayoutEffect(spec);    // kind: "layout"
useNamedInsertionEffect(spec); // kind: "insertion" (if available)
useNamedRafEffect(spec);       // kind: "raf"
useNamedIdleEffect(spec);      // kind: "idle"
```

For full type definitions and semantics, see  
👉 [`APIs/docs/named-effects.md`](APIs/docs/named-effects.md)

---

## 🔄 Snapshot-based dependencies

Instead of a plain dependency array, you pass a **snapshot object**:

```tsx
useNamedEffect({
  name: "sync-selection",
  dependencySnapshot: {
    selectedIds,
    filterText,
  },
  handler: (prev, current) => {
    if (!prev || prev.selectedIds !== current.selectedIds) {
      console.log("Selection changed:", current.selectedIds);
    }
    if (!prev || prev.filterText !== current.filterText) {
      console.log("Filter changed:", current.filterText);
    }
  },
});
```

Snapshot semantics:

- On every run, the latest `dependencySnapshot` is stored internally.
- On the next run, that stored snapshot is passed as `prev`.
- The new snapshot is passed as `current`.
- If there was no previous run, `prev` is `undefined`.

You never need to manually juggle `useRef` just to remember previous values.

---

## 🎚️ Scheduling with `kind`

The `options.kind` flag controls **how** and **when** the effect runs.

```tsx
useNamedEffect({
  name: "measure-layout",
  dependencySnapshot: { width, height },
  handler: (prev, current) => {
    // do layout-sensitive work here
  },
  options: { kind: "layout" },
});
```

Supported kinds:

- `"effect"`   — default, uses `React.useEffect`.
- `"layout"`   — uses `React.useLayoutEffect`.
- `"insertion"`— uses `React.useInsertionEffect` when available.
- `"raf"`      — schedules via `requestAnimationFrame`.
- `"idle"`     — schedules via `requestIdleCallback` (or `setTimeout` as a fallback).

> ⚠️ **Important:** For a given hook call, `kind` should be stable across renders to respect React’s Rules of Hooks.

You can also use the dedicated wrappers instead of setting `kind` manually:

```tsx
import {
  useNamedLayoutEffect,
  useNamedRafEffect,
} from "@metamorphik/react-named-effects";

useNamedLayoutEffect({
  name: "layout-effect",
  dependencySnapshot: { foo },
  handler: (prev, current) => { /* ... */ },
});

useNamedRafEffect({
  name: "raf-effect",
  dependencySnapshot: { bar },
  handler: (prev, current) => { /* ... */ },
});
```

---

## ✅ Conditional execution with `when`

Use `options.when` to **skip running the handler** while still updating snapshots.

```tsx
useNamedEffect({
  name: "maybe-track",
  dependencySnapshot: { userId, isEnabled },
  options: { when: isEnabled },
  handler: (prev, current) => {
    // Only runs when isEnabled is true
    console.log("Tracking user", current.userId);
  },
});
```

Behavior:

- `prev` and `current` still advance every render.
- If `when` is `false`, the handler (and cleanup) are skipped for that run.

This is useful for feature flags, opt-in telemetry, or expensive operations.

---

## 🧯 Per-effect error handling (`onError`)

You can provide an `onError` callback per effect:

```tsx
useNamedEffect({
  name: "load-dashboard",
  dependencySnapshot: { dashboardId },
  options: {
    onError: (err) => {
      console.error("[dashboard effect] failed", err);
    },
  },
  handler: async (prev, current) => {
    await fetchDashboard(current.dashboardId);
    return () => {
      console.log("Dashboard cleanup");
    };
  },
});
```

Semantics:

- If `onError` is provided:
  - Errors from the handler **or** cleanup are caught and passed to `onError`.
  - They are **not** re-thrown.
- If `onError` is **not** provided:
  - Errors bubble as usual and may surface in React’s error boundaries / console.

---

## 🔍 Debug logging

Enable logging via `options.debug: true` in development builds:

```tsx
useNamedEffect({
  name: "refresh-orders",
  dependencySnapshot: { customerId, statusFilter },
  options: { debug: true },
  handler: (prev, current) => {
    // ...
  },
});
```

Example logs (in dev):

```text
[useNamedEffect] run → refresh-orders (kind=effect, when=true) | initial run
[useNamedEffect] run → refresh-orders (kind=effect, when=true) | changes: [customerId] 1 → 2, [statusFilter] "open" → "all"
[useNamedEffect] cleanup → refresh-orders (kind=effect, when=true)
```

This helps you see:

- Which effect ran.
- Whether it was an initial run or a change.
- Which fields changed in the snapshot.

---

## 🧩 Example: animation with `raf`

```tsx
import * as React from "react";
import { useNamedRafEffect } from "@metamorphik/react-named-effects";

function Spinner({ isActive }: { isActive: boolean }) {
  const [angle, setAngle] = React.useState(0);

  useNamedRafEffect({
    name: "spin",
    dependencySnapshot: { isActive },
    handler: (prev, current) => {
      if (!current.isActive) return;

      let frameId: number;

      const loop = () => {
        setAngle((a) => (a + 5) % 360);
        frameId = requestAnimationFrame(loop);
      };

      loop();

      return () => cancelAnimationFrame(frameId);
    },
  });

  return <div style={{ transform: `rotate(${angle}deg)` }}>⏳</div>;
}
```

---

## 🧠 Design Philosophy

React’s `useEffect` family is intentionally low-level and anonymous:

- multiple effects in a component can be hard to distinguish
- tracking previous values typically requires `useRef`
- describing *“which effect is this?”* to teammates or tools is awkward

`@metamorphik/react-named-effects` keeps the React model but adds:

- 📛 **Identity** — give each effect a name.
- 🧠 **Memory**   — snapshot previous values for you.
- 🧪 **Intention**— encode scheduling, guards, and error handling in a single spec.

This makes your code easier to read, debug, and eventually analyze, while still feeling like “just React hooks”.

Higher-level concepts like **behavioral inheritance** live in sister libraries such as `@metamorphik/react-behavior`. This package focuses purely on **named effects and snapshot-based handlers**.

---

## 🧱 Example Use Cases

- Distinguishing multiple effects in large components.
- Implementing logging/instrumentation with clear effect names.
- Managing animations (`raf`) and idle work in a structured way.
- Replacing ad-hoc `useRef` patterns for previous-value comparisons.
- Building internal tooling on top of effect names and debug logs.

---

## 📚 Full API Reference

This README is intentionally narrative.

For the **authoritative, versioned API specification** — including all TypeScript types and detailed semantics — see:

> 👉 [`APIs/docs/named-effects.md`](APIs/docs/named-effects.md)

---

## 📝 License

MIT © 2025 Metamorphik Technologies  
Part of the **Metamorphik Dev Tools** collection.


<!-- PERF-SECTION:START -->
## ⚡ Performance (generated by CI)

These numbers come from a synthetic microbenchmark using React Test Renderer + happy-dom.
They measure wrapper overhead for 10,000 empty effects (no real work in the body):

- 10k plain **useEffect**: `2.768ms`
- 10k **useNamedEffect**: `7.748ms`
- Overhead: `4.980ms` per 10k effects (~`0.498µs` per effect, ~`179.90%` in this synthetic test)

The raw numbers exaggerate the difference because `useEffect` does almost no work in this environment.
In real components, effect bodies perform useful work (subscriptions, DOM I/O, analytics), and the fixed ~0.5µs per-effect overhead of `useNamedEffect` is diluted into that cost.
<!-- PERF-SECTION:END -->
