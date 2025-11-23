import * as React from "react"
import type { PropsWithChildren } from "react"
import {
  BehaviorAPI,
  BehaviorContext,
  BehaviorInstance,
  EventSpec,
  PlatformStrapperSpecs,
  UseClassifiedSpec,
} from "./types"

/** Shallow merge with child shadowing parent by key */
function mergeByKey<T extends object>(
  parent?: Record<string, T>,
  child?: Record<string, T>
) {
  return { ...(parent ?? {}), ...(child ?? {}) }
}

/** Compose base+child events honoring runSuperBefore/runSuperAfter. */
function composeEventChain<Expose, P>(
  parentEvt: EventSpec<Expose, P> | undefined,
  childEvt: EventSpec<Expose, P> | undefined
): EventSpec<Expose, P>[] {
  if (!parentEvt && !childEvt) return []
  if (parentEvt && !childEvt) return [parentEvt]
  if (!parentEvt && childEvt) return [childEvt]
  const c = childEvt!,
    p = parentEvt!
  if (c.runSuperBefore) return [p, c]
  if (c.runSuperAfter) return [c, p]
  return [c] // default: override
}

/**
 * Primary hook: creates a behavior instance, merges with base, and binds named events
 * via useNamedEffect (React strapper).
 */
export function useClassified<Expose = any, P = any>(
  base: BehaviorInstance<any, P> | null,
  spec: UseClassifiedSpec<Expose, P>,
  props?: PropsWithChildren<P>,
  platformStrapper?: PlatformStrapperSpecs
): BehaviorInstance<Expose, P> {
  // ---------- STATE ----------
  // Union of base state (shape) + child defaults; child wins on default values
  const parentStateShape = (base?.api?.state ?? {}) as Record<string, any>
  const childDefaults = (spec.state ?? {}) as Record<string, any>
  const initialUnion = { ...parentStateShape, ...childDefaults }

  // Freeze keys on first render to keep setter table stable
  const initialStateRef = React.useRef<Record<string, any>>(initialUnion)
  const stateKeysRef = React.useRef<string[]>(
    Object.keys(initialStateRef.current)
  )
  const [stateObj, setStateObj] = React.useState<Record<string, any>>(
    initialStateRef.current
  )

  // Stable per-key setters for the union
  const setters = React.useMemo(() => {
    const s: Record<string, (value: any | ((prev: any) => any)) => void> = {}
    stateKeysRef.current.forEach((k) => {
      s[k] = (value) => {
        setStateObj((prev) => {
          const prevVal = prev[k]
          const nextVal =
            typeof value === "function" ? (value as any)(prevVal) : value
          if (Object.is(prevVal, nextVal)) return prev
          return { ...prev, [k]: nextVal }
        })
      }
    })
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Warn if the union shape changes across renders (should not)
  if (process.env.NODE_ENV !== "production") {
    const nowKeys = Object.keys({ ...parentStateShape, ...childDefaults })
    const frozen = stateKeysRef.current
    if (
      nowKeys.length !== frozen.length ||
      nowKeys.some((k) => !frozen.includes(k))
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `[useClassified] Spec.state keys changed for "${
          spec.name ?? "Behavior"
        }". ` +
          `Keys must be stable across renders. Frozen=[${frozen.join(
            ", "
          )}], Now=[${nowKeys.join(", ")}]`
      )
    }
  }

  // ---------- CONTEXT ----------
  const baseExpose = base?.api?.expose
  const baseView = base?.api?.view
  const ctx: BehaviorContext = React.useMemo(
    () => ({ baseExpose, baseView }),
    [baseExpose, baseView]
  )

  // ---------- LOCALS ----------
  // Shared per-instance bag; if base has one, reuse it so base+derived see the same object.
  const localsRef = React.useRef<Record<string, any>>(
    (base?.api as any)?.locals ?? {}
  )

  // ---------- API (partial, expose computed below) ----------
  const apiRef = React.useRef<BehaviorAPI<Expose, P>>(null as any)

  // ---------- METHODS ----------
  const mergedMethods = React.useMemo(() => {
    const parent = base?.api?.methods ?? {}
    const childEntries = Object.entries(spec.methods ?? {}).map(
      ([name, fn]) => {
        // bind api lazily through ref to avoid stale closures
        const bound = (...args: any[]) => fn(apiRef.current, ...args)
        return [name, bound]
      }
    )
    return mergeByKey(parent, Object.fromEntries(childEntries))
  }, [base, spec.methods])

  // ---------- VIEW (single, child overrides parent; inherit if absent) ----------
  const effectiveView = React.useMemo(() => {
    if (spec.view) {
      const bound = (p?: PropsWithChildren<P>) =>
        spec.view!(apiRef.current, ctx, p)
      return bound as (props?: PropsWithChildren<P>) => React.ReactNode
    }
    if (base?.api?.view) {
      const bound = (p?: PropsWithChildren<P>) =>
        (base.api.view as any)(apiRef.current, ctx, p)
      return bound as (props?: PropsWithChildren<P>) => React.ReactNode
    }
    return undefined
  }, [base, spec.view, ctx])

  // ---------- BUILD API ----------
  const apiSkeleton: BehaviorAPI<Expose, P> = {
    props,
    state: stateObj,
    set: setters,
    methods: mergedMethods,
    locals: localsRef.current,
    view: undefined,
    expose: undefined as any,
    name: spec.name,
  }
  apiSkeleton.view = effectiveView as any

  const exposeNow =
    spec.expose?.(apiSkeleton, ctx) ??
    ((apiSkeleton.state as any) as unknown as Expose)
  apiSkeleton.expose = exposeNow
  apiRef.current = apiSkeleton

  // ---------- EVENTS MERGE (inheritance) ----------
  const parentEvents = base?.__events ?? {}
  const currentEvents = spec.events ?? {}
  const effectiveEvents = React.useMemo(
    () => mergeByKey(parentEvents, currentEvents),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, spec.events]
  )

  // Freeze event keys on first render to satisfy Rules of Hooks (stable hook count/order).
  const eventKeysRef = React.useRef<string[]>(Object.keys(effectiveEvents))
  const lockedKeys = eventKeysRef.current

  if (process.env.NODE_ENV !== "production") {
    const nowKeys = Object.keys(effectiveEvents)
    const changed =
      nowKeys.length !== lockedKeys.length ||
      nowKeys.some((k, i) => k !== lockedKeys[i])
    if (changed) {
      // eslint-disable-next-line no-console
      console.warn(
        `[useClassified] Event keys changed for "${
          spec.name ?? "Behavior"
        }". ` +
          `Keys must be declared stably. Using initial keys: [${lockedKeys.join(
            ", "
          )}]`
      )
    }
  }

  // ---------- BIND EVENTS VIA useNamedEffect ----------
  lockedKeys.forEach((key) => {
    const parentEvt = parentEvents[key]
    const childEvt = currentEvents[key]
    const chain = composeEventChain(parentEvt, childEvt)
    if (chain.length === 0) return

    // Choose kind/when: child takes precedence, else parent, else defaults
    const chosenKind: EffectKind =
      childEvt?.kind ?? parentEvt?.kind ?? "effect"
    const chosenWhen = (api: BehaviorAPI<Expose, P>, c: BehaviorContext) =>
      childEvt?.when?.(api, c) ?? parentEvt?.when?.(api, c) ?? true

    // Aggregate deps in a deterministic way (parent first if runSuperBefore, else child first, etc.)
    const deps = ((): React.DependencyList => {
      const lists: React.DependencyList[] = chain.map((e) => {
        try {
          return e.deps(apiRef.current, ctx)
        } catch {
          return []
        }
      })
      return ([] as any[]).concat(...lists)
    })()

    // Build a composed effect body: execute each event.run in order; collect cleanups; clean up in reverse.
    const effectBody = () => {
      const cleanups: Array<() => void> = []
      for (const e of chain) {
        const c = e.run(apiRef.current, ctx)
        if (typeof c === "function") cleanups.push(c)
      }
      return () => {
        for (let i = cleanups.length - 1; i >= 0; i--) {
          try {
            cleanups[i]()
          } catch {
            // ignore cleanup errors
          }
        }
      }
    }

    // Gate with 'when' evaluated per render
    const whenNow = !!chosenWhen(apiRef.current, ctx)

    // Build a dependencySnapshot that preserves old dep semantics
    // (flatten deps so React compares element-wise, like a normal DependencyList)
    const dependencySnapshot: Record<string, any> = {}
    deps.forEach((value, index) => {
      dependencySnapshot[String(index)] = value
    })

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useNamedEffect({
      name: `${spec.name ?? "Behavior"}.${key}`,
      handler(_prev, _current) {
        // we don't currently need prev/current for events; keep semantics identical
        return effectBody()
      },
      dependencySnapshot,
      options: {
        kind: chosenKind,
        when: whenNow,
        // debug: true,
      },
    })
  })

  // ---------- INSTANCE ----------
  const hideBase = spec.options?.hideBaseInApi !== false
  const apiPublic = hideBase
    ? { ...apiRef.current }
    : { ...(apiRef.current as any), base: base?.api }

  // Inherit platform config (base → explicit) so children see it too
  const inheritedPlatform: PlatformStrapperSpecs = {
    ...(base?.__platformStrapper ?? {}),
    ...(platformStrapper ?? {}),
  }

  // React strapper: decide memoization once per instance
  const memoizeView = inheritedPlatform.react?.memoizeView ?? false

  let View: React.FC<PropsWithChildren<P>> = (p) => {
    const v = apiRef.current.view
    return v ? (v(apiRef.current, ctx, p) as any) : null
  }
  if (memoizeView) {
    View = React.memo(View)
  }

  const instance: BehaviorInstance<Expose, P> = {
    api: apiPublic,
    View,
    __events: effectiveEvents,
    __baseExpose: baseExpose,
    __platformStrapper: inheritedPlatform,
  }

  return instance
}

export default useClassified
