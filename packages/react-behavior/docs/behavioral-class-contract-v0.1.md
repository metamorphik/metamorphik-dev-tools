
# 🪶 The Behavioral Class Contract  
**Version 0.1 — Draft Specification**

---

## 1. Purpose

The Behavioral Class model defines **portable, engine-agnostic units of logic** that encapsulate *state*, *methods*, and *events* in a declarative, hierarchical form.  
A behavior expresses **how something acts**, not **how it renders**.

This contract aims to outlive any single UI framework — React, Svelte, Angular, or whatever succeeds them — by defining what all of them fundamentally share:  
> reactive state, explicit dependencies, deterministic reactions, and overridable modular logic.

---

## 2. Core Principles

1. **Engine Independence**  
   A behavior describes data and logic; a *strapper* binds those behaviors to a runtime (React, Svelte, Vue, etc.).

2. **Declarative Reactivity**  
   Events are triggered automatically when declared dependencies (`deps`) change.

3. **Determinism**  
   Every reaction has a predictable cause, order, and cleanup.  
   No spontaneous side-effects are allowed.

4. **Single Source of Truth**  
   Each behavior owns one unified `state` map, accessible and mutable only through its defined methods.

5. **Hierarchical Composition**  
   Behaviors may derive from one another (single inheritance).  
   Children may override or extend `state`, `methods`, or `events` with well-defined policies.

6. **Encapsulation by Contract**  
   Each behavior defines what it *exposes* to the outside world — a minimal, immutable public interface.

---

## 3. Structural Overview

A behavior definition consists of five parts:

| Field | Description |
|--------|--------------|
| `state` | Named, reactive data slots local to this behavior. |
| `methods` | Functions operating on state or props. |
| `events` | Declarative reactions that run when their `deps` change. |
| `expose` | Defines the external API for this behavior. |
| `options` | Optional metadata and override policies. |

Example (language-agnostic pseudocode):

```ts
Behavior "Counter" {
  state: { count: 0 }

  methods: {
    inc(api) => api.set.count(v => v + 1)
    dec(api) => api.set.count(v => v - 1)
  }

  events: {
    log {
      deps(api) => [api.state.count]
      run(api) => print("count:", api.state.count)
    }
  }

  expose(api) => { count: api.state.count, inc: api.methods.inc, dec: api.methods.dec }
}
```

---

## 4. State Semantics

1. **Declaration**  
   Each key in `state` defines a reactive slot with an initial value.

2. **Mutation**  
   Mutations occur exclusively through `api.set[key](newValueOrFn)`.

3. **Overriding Policies**

| Policy | Behavior |
|---------|-----------|
| `replace` | Child replaces base’s initial value (default). |
| `mergeShallow` | Shallow merge if both are objects. |
| `mergeDeep` | Deep merge recursively. |
| `append` | Concatenate arrays. |
| `sealed` | Cannot be overridden in derived behavior. |
| `readonly` | Visible but cannot be mutated in children. |

4. **Derivation**  
   A state slot may derive its initial value from its base behavior:
   ```
   count => derive(base.count, api) = base.count * 2
   ```

5. **Equality Hints**  
   Each slot may specify an equality comparator (`eq: ref | shallow | custom`) to optimize event reactivity.

---

## 5. Method Semantics

1. **Definition**  
   Methods are declared as `(api, ...args) => result`.  
   The runtime auto-binds `api`, ensuring access to `state`, `set`, `methods`, and `props`.

2. **Overriding Policies**

| Policy | Behavior |
|---------|-----------|
| `override` | Child replaces base implementation (default). |
| `chainBefore` | When invoked, child runs first, then base. |
| `chainAfter` | Base runs first, then child. |
| `final` | Method cannot be overridden. |

3. **Super Access**  
   During override, child may explicitly invoke `super.methods.name()`.

4. **Return Semantics**
   - Default: child’s return value is final (`childWins`).
   - Alternative: baseWins or custom combiner `(baseResult, childResult)`.

---

## 6. Event Semantics

1. **Definition**
   ```
   event <name> {
     deps(api) => [list of dependencies]
     run(api) => side-effect
     runSuperBefore?: bool
     runSuperAfter?: bool
   }
   ```
   - `deps`: Selects which state/prop changes trigger this event.
   - `run`: Executes when dependencies change.

2. **Trigger Model**
   - The runtime detects dependency changes after each *commit* (group of state updates).  
   - Each event runs **once per commit** regardless of how many deps changed.

3. **Cleanup Model**
   - If `run()` returns a cleanup function, it is executed before the next run or when the behavior is destroyed.

4. **Order of Execution**
   - Deterministic: stable by declaration order or explicit `priority` value.
   - Super-chain semantics identical to methods (`runSuperBefore`, `runSuperAfter`).

5. **Error Handling**
   - Event failures isolate to the event; they never block others.  
   - Errors propagate to the host’s boundary or strapper’s logger.

---

## 7. Exposure Semantics

1. **Purpose**  
   Defines the *public API* of a behavior.

2. **Implementation**
   ```
   expose(api, ctx) => { ...public members... }
   ```
   - `api` is the full local behavior API.  
   - `ctx.baseExpose` contains the base behavior’s public interface.

3. **Isolation**
   Consumers interact only with the exposed interface — never with internal `state` or `methods` directly.

---

## 8. Inheritance Model

- Behaviors compose via **single inheritance**:
  ```
  Derived = useClassified(Base, spec)
  ```
- State, methods, and events follow their respective override policies.
- The derived behavior forms a complete, new unit that can itself be extended.

---

## 9. Runtime / Strapper Responsibilities

A **strapper** binds behaviors to a host framework.

#### Strapper MUST:
- Implement:
  - `createState(initial)`
  - `observe(deps, callback, cleanup)`
  - `schedule(run, priority?)`
- Guarantee deterministic scheduling order for all observed events.
- Provide lifecycle hooks (`mount`, `cleanup`, etc.) appropriate to the engine.

#### Strapper MAY:
- Introduce performance hints (e.g., “layout”, “idle”) but must not alter semantics.

Examples:
- `react-strapper` → uses `useEffect` / `useLayoutEffect`
- `svelte-strapper` → uses `onMount` / `afterUpdate`
- `angular-strapper` → uses Signals `effect()`
- `vue-strapper` → uses `watch` and `onMounted`

---

## 10. Commit Model

- All state updates (`set.*`) coalesce into a *commit*.
- After each commit:
  1. The runtime diffs relevant `deps`.
  2. Schedules affected events.
  3. Runs cleanups, then new event runs.
- Guarantees post-commit consistency across all `events`.

---

## 11. Guiding Philosophy

> Behavior = predictable change.

This model reintroduces modularity and determinism into reactive systems that have become too framework-tied.  
By describing *what changes*, *when it changes*, and *how it reacts*, we create a contract any host runtime can implement faithfully.

---

## 12. Future Considerations

- Async commit batching across distributed components.  
- Declarative dependency graphs for behavior coordination.  
- Serializable behaviors for server-driven UI or state replay.  
- Formal Behavior Manifest for tooling / schema validation.  
- Type-safe behavior inheritance (TS/DSL spec).

---

## 13. License & Attribution

This specification is community-owned.  
It is intended as an open, royalty-free standard for modular, framework-independent reactive systems.

