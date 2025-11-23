// behaviorSpecs.ts

/**
 * Function returned by React effects as cleanup.
 */
export type Cleanup = void | (() => void)

/**
 * Which scheduling mechanism to use.
 *
 * - "effect": useEffect
 * - "layout": useLayoutEffect
 * - "insertion": useInsertionEffect (if available)
 * - "raf": schedule via requestAnimationFrame
 * - "idle": schedule via requestIdleCallback / setTimeout
 */
export type EffectKind = "effect" | "layout" | "insertion" | "raf" | "idle"

/**
 * Options for a named effect.
 * NOTE: This is *nested* under `spec.options`, not flattened.
 */
export interface NamedEffectOptions {
  /**
   * Whether this effect should actually run.
   * If false, we still update prev-snapshot but skip calling the handler.
   */
  when?: boolean

  /**
   * Which underlying hook/scheduler to use.
   * IMPORTANT: Should be stable for a given hook call across renders.
   */
  kind?: EffectKind

  /**
   * Enable console logging of runs / diffs in development.
   */
  debug?: boolean

  /**
   * Optional error handler. If provided, catches errors from the effect and cleanup.
   */
  onError?: (error: unknown) => void
}

/**
 * The shaped object you pass as dependencies.
 * Keys become readable fields on prev/current (prev.foo, current.bar).
 */
export type NamedEffectDependencySnapshot = Record<string, any>

/**
 * The effect callback signature for useNamedEffect.
 */
export type NamedEffectCallback<
  TSnapshot extends NamedEffectDependencySnapshot,
> = (prev: TSnapshot | undefined, current: TSnapshot) => Cleanup

/**
 * Spec object for useNamedEffect.
 *
 * This is the *only* public API for configuring named effects.
 */
export interface NamedEffectSpec<
  TSnapshot extends NamedEffectDependencySnapshot = NamedEffectDependencySnapshot,
> {
  /**
   * Stable identifier for this effect within a component.
   * Used only for logging / debugging; does not affect prev/current semantics.
   */
  name: string

  /**
   * Your effect function. Receives previous and current snapshots.
   */
  handler: NamedEffectCallback<TSnapshot>

  /**
   * Snapshot of the values you care about.
   * - Triggers reruns when any field changes.
   * - Is passed as `current` to the handler.
   * - Previous snapshot is passed as `prev`.
   */
  dependencySnapshot: TSnapshot

  /**
   * Optional behavior and debug config (not unfolded).
   */
  options?: NamedEffectOptions
}