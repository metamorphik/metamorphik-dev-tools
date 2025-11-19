# @metamorphik/react-behavior

**Behavior layer for React — class-like inheritance for function components.**  
Define *base behaviors*, extend them, and override only what you need — all without classes.

---

## ✨ Features

- 🧩 **Class-like inheritance** — derive new behaviors from existing ones.
- ⚙️ **Named effects** — run, override, or skip specific effects by name.
- 🪞 **Composable logic** — combine multiple behaviors seamlessly.
- 🧠 **Declarative override rules** — `runsuperbefore`, `runsuperafter`, or replace entirely.
- 🪶 **Lightweight & dependency-free** — only React as a peer dependency.
- 🔍 **Transparent debugging** — optional logging of which effect fired and why.

---

## 🎮 Live Demo (coming soon)

Play with behaviors live on CodeSandbox:  
*(Example demos will be published once the library stabilizes.)*

---

## 🚀 Quickstart

Install:

```bash
npm install @metamorphik/react-behavior
# or
pnpm add @metamorphik/react-behavior
```

Define a **base behavior** using hooks and named effects:

```tsx
import { useNamedEffect, createClassifiedComponent } from "@metamorphik/react-behavior";

const useBaseBehavior = () => {
  useNamedEffect("loadData", () => {
    console.log("Base: loading data");
  });
};

export const BaseComponent = createClassifiedComponent({
  name: "BaseComponent",
  behavior: useBaseBehavior,
  view: () => <div>Base</div>
});
```

Now **extend** it with overrides:

```tsx
import { useClassified } from "@metamorphik/react-behavior";
import { BaseComponent } from "./BaseComponent";

const useDerivedBehavior = () => {
  const base = useClassified(BaseComponent);
  base.useNamedEffect("loadData", () => {
    console.log("Derived: overriding load");
  });
};

export const DerivedComponent = createClassifiedComponent({
  name: "DerivedComponent",
  base: BaseComponent,
  behavior: useDerivedBehavior,
  view: () => <div>Derived</div>
});
```

When `DerivedComponent` runs, only its override for `loadData` executes — preserving true behavioral inheritance.

---

## 🧭 API Overview

### 🔹 Hooks

| Hook | Description |
|------|--------------|
| `useNamedEffect(name, fn, deps?, opts?)` | A version of `useEffect` that can be selectively overridden by name. |
| `useNamedLayoutEffect`, `useNamedInsertionEffect`, `useNamedRafEffect`, `useNamedIdleEffect` | Variants matching React’s lifecycle phases. |
| `useClassified(baseBehavior, options)` | Use or extend a base behavior, optionally overriding or combining effects. |

---

### 🔹 Factory

| Function | Description |
|-----------|--------------|
| `createClassifiedComponent(config)` | Creates a React component from a behavior definition (supports inheritance). |

---

### 🔹 Types

| Type | Purpose |
|------|----------|
| `BehaviorAPI`, `BehaviorContext` | Core runtime structures. |
| `UseClassifiedSpec`, `BehaviorInstance` | Contracts for defining and extending behaviors. |
| `NamedEvents`, `EventSpec` | Structures used by named effects. |
| `PlatformStrapperSpecs`, `ReactStrapperConfig` | For internal platform bridges. |

---

## 🧩 Design Philosophy

React lacks a natural inheritance model — and that’s *mostly good*.  
But sometimes, **composition alone** leads to repetitive, fragmented logic.

`@metamorphik/react-behavior` introduces a **predictable, layered inheritance** for hooks, letting you:

- Override effects by name.
- Decide how and when base behaviors execute.
- Build reusable, extensible behavioral hierarchies.

Think of it like `class Foo extends Bar` — but **pure React** and **hook-safe**.

---

## 🧱 Example Use Cases

- Component families with shared lifecycle logic.
- Reusable interaction patterns (hover, focus, resize).
- Behavioral mixins (analytics, tracking, instrumentation).
- Declarative override patterns in design systems.

---

## 📦 Why Not Mixins or HOCs?

Because this is **runtime-aware inheritance**, not prop-merging:
- No prop collisions.
- No ref confusion.
- No implicit render chains.

Behaviors don’t wrap; they **extend**.

---

## 🧰 Debugging

Pass `{ debug: true }` to `useNamedEffect` or `useClassified` to log:

```
[react-behavior] Running effect: loadData (DerivedComponent)
```

You’ll see when and why an effect fired, plus its inheritance origin.

---

## 📝 License

MIT © 2025 Metamorphik Technologies  
Part of the **Metamorphik Dev Tools** collection.
