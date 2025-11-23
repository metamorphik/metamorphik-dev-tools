// useNamedEffects.ts
import * as React from "react"
import {
  Cleanup,
  EffectKind,
  NamedEffectCallback,
  NamedEffectDependencySnapshot,
  NamedEffectOptions,
  NamedEffectSpec,
} from "./behaviorSpecs"

// ───────────────────── INTERNAL DEBUG UTILITIES ─────────────────────

// Avoid direct `process` import so this works nicely in browser builds.
const nodeEnv: string | undefined =
  (typeof globalThis !== "undefined" &&
    (globalThis as any)?.process?.env?.NODE_ENV) ||
  undefined

const isDev = !nodeEnv || nodeEnv !== "production"

function safeToString(x: unknown): string {
  try {
    if (typeof x === "string") return JSON.stringify(x)
    return JSON.stringify(x, (_k, v) =>
      typeof v === "function" ? `[Function ${v.name || "anonymous"}]` : v
    )
  } catch {
    try {
      return String(x)
    } catch {
      return "[Unprintable]"
    }
  }
}

function diffSnapshot(
  prev: NamedEffectDependencySnapshot | undefined,
  next: NamedEffectDependencySnapshot
) {
  const changes: Array<{ key: string; from: any; to: any }> = []
  if (!prev) return { initial: true, changes }

  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)])
  for (const key of allKeys) {
    const from = prev[key]
    const to = next[key]
    if (from !== to) {
      changes.push({ key, from, to })
    }
  }

  return { initial: false, changes }
}

function logRun(
  name: string,
  kind: EffectKind,
  when: boolean,
  tag: "schedule" | "run" | "cleanup",
  info?: string
) {
  if (!isDev) return
  // prettier-ignore
  console.debug(
    `[useNamedEffect] ${tag} → ${name} (kind=${kind}, when=${when})${info ? " " + info : ""}`
  )
}

function logSnapshot(
  name: string,
  kind: EffectKind,
  when: boolean,
  prev: NamedEffectDependencySnapshot | undefined,
  next: NamedEffectDependencySnapshot
) {
  if (!isDev) return
  const { initial, changes } = diffSnapshot(prev, next)
  const header = initial
    ? "initial run"
    : changes.length
    ? `changes: ${changes
        .map(
          (c) =>
            `[${c.key}] ${safeToString(c.from)} → ${safeToString(c.to)}`
        )
        .join(", ")}`
    : "no dependency changes"
  logRun(name, kind, when, "run", `| ${header}`)
}

function buildDeps(name: string, snapshot: NamedEffectDependencySnapshot) {
  // Use values so React reruns when any field changes.
  // Order is stable because Object.keys / Object.values follow insertion order,
  // and snapshot is created by the caller.
  return [name, ...Object.values(snapshot)]
}

function makeSafeCaller(onError?: (error: unknown) => void) {
  return <T extends (...args: any[]) => any>(fn: T): ReturnType<T> | undefined => {
    try {
      return fn()
    } catch (err) {
      if (onError) {
        onError(err)
        return undefined
      }
      throw err
    }
  }
}

// ───────────────────────────── CORE HOOK ─────────────────────────────

/**
 * Named effect that remembers a *dependency snapshot* across runs.
 *
 * - You pass a spec: { name, handler, dependencySnapshot, options }.
 * - `prev` is the snapshot from the previous run.
 * - `current` is the latest snapshot.
 *
 * IMPORTANT:
 * - `spec.options.kind` (effect/layout/insertion/raf/idle) should be stable
 *   across renders for the same hook call, to respect React's Rules of Hooks.
 */
export function useNamedEffect<
  TSnapshot extends NamedEffectDependencySnapshot,
>(spec: NamedEffectSpec<TSnapshot>): void {
  const { name, handler, dependencySnapshot, options } = spec
  const resolvedOptions: NamedEffectOptions = options ?? {}
  const {
    when = true,
    kind = "effect",
    debug = false,
    onError,
  } = resolvedOptions

  // NOTE: initialization is with current snapshot,
  // so on the *first* run prev === current (like useRef(initValue)).
  const prevSnapshotRef = React.useRef<TSnapshot | undefined>(undefined)

  const safeCall = makeSafeCaller(onError)
  const deps = buildDeps(name, dependencySnapshot)

  // ── layout ────────────────────────────────────────────────
  if (kind === "layout") {
    React.useLayoutEffect(() => {
      const prev = prevSnapshotRef.current
      const current = dependencySnapshot

      if (debug && isDev) logSnapshot(name, kind, when, prev, current)

      if (!when) {
        prevSnapshotRef.current = current
        return
      }

      let cleanup: Cleanup
      const maybeCleanup = safeCall(() => handler(prev, current))
      cleanup = maybeCleanup

      prevSnapshotRef.current = current

      return () => {
        if (debug && isDev) logRun(name, kind, when, "cleanup")
        if (typeof cleanup === "function") safeCall(cleanup as () => void)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    return
  }

  // ── insertion ─────────────────────────────────────────────
  if (kind === "insertion") {
    const useIns = (React as any).useInsertionEffect as
      | ((cb: () => Cleanup, deps?: React.DependencyList) => void)
      | undefined

    if (useIns) {
      useIns(() => {
        const prev = prevSnapshotRef.current
        const current = dependencySnapshot

        if (debug && isDev) logSnapshot(name, kind, when, prev, current)

        if (!when) {
          prevSnapshotRef.current = current
          return
        }

        let cleanup: Cleanup
        const maybeCleanup = safeCall(() => handler(prev, current))
        cleanup = maybeCleanup

        prevSnapshotRef.current = current

        return () => {
          if (debug && isDev) logRun(name, kind, when, "cleanup")
          if (typeof cleanup === "function") safeCall(cleanup as () => void)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps)

      return
    }

    // If insertion effect is not available, fall through to the default behavior below.
  }

  // ── raf ───────────────────────────────────────────────────
  if (kind === "raf") {
    React.useEffect(() => {
      if (debug && isDev) logRun(name, kind, when, "schedule")

      const prev = prevSnapshotRef.current
      const current = dependencySnapshot

      if (!when) {
        prevSnapshotRef.current = current
        return
      }

      let cleanupFns: Array<() => void> = []

      const id = requestAnimationFrame(() => {
        if (debug && isDev) logSnapshot(name, kind, when, prev, current)

        const maybeCleanup = safeCall(() => handler(prev, current))
        if (typeof maybeCleanup === "function") {
          cleanupFns.push(() => safeCall(maybeCleanup as () => void))
        }

        prevSnapshotRef.current = current
      })

      return () => {
        if (debug && isDev) logRun(name, kind, when, "cleanup")
        cancelAnimationFrame(id)
        while (cleanupFns.length) {
          const fn = cleanupFns.pop()!
          fn()
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    return
  }

  // ── idle ──────────────────────────────────────────────────
  if (kind === "idle") {
    React.useEffect(() => {
      if (debug && isDev) logRun(name, kind, when, "schedule")

      const prev = prevSnapshotRef.current
      const current = dependencySnapshot

      if (!when) {
        prevSnapshotRef.current = current
        return
      }

      let cancelled = false
      let cleanup: Cleanup
      let cancel: () => void

      const ric: any = (globalThis as any).requestIdleCallback
      const cic: any = (globalThis as any).cancelIdleCallback

      const cb = () => {
        if (cancelled) return
        if (debug && isDev) logSnapshot(name, kind, when, prev, current)

        const maybeCleanup = safeCall(() => handler(prev, current))
        cleanup = maybeCleanup
        prevSnapshotRef.current = current
      }

      if (typeof ric === "function" && typeof cic === "function") {
        const id = ric(cb)
        cancel = () => cic(id)
      } else {
        const t = setTimeout(cb, 1)
        cancel = () => clearTimeout(t)
      }

      return () => {
        if (debug && isDev) logRun(name, kind, when, "cleanup")
        cancelled = true
        cancel?.()
        if (typeof cleanup === "function") safeCall(cleanup as () => void)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    return
  }

  // ── default: "effect" ─────────────────────────────────────
  React.useEffect(() => {
    const prev = prevSnapshotRef.current
    const current = dependencySnapshot

    if (debug && isDev) logSnapshot(name, kind, when, prev, current)

    if (!when) {
      prevSnapshotRef.current = current
      return
    }

    let cleanup: Cleanup
    const maybeCleanup = safeCall(() => handler(prev, current))
    cleanup = maybeCleanup

    prevSnapshotRef.current = current

    return () => {
      if (debug && isDev) logRun(name, kind, when, "cleanup")
      if (typeof cleanup === "function") safeCall(cleanup as () => void)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// ───────────────────── CONVENIENCE WRAPPERS ─────────────────────

export function useNamedLayoutEffect<
  TSnapshot extends NamedEffectDependencySnapshot,
>(spec: NamedEffectSpec<TSnapshot>) {
  useNamedEffect({
    ...spec,
    options: {
      ...(spec.options || {}),
      kind: "layout" as EffectKind,
    },
  })
}

export function useNamedInsertionEffect<
  TSnapshot extends NamedEffectDependencySnapshot,
>(spec: NamedEffectSpec<TSnapshot>) {
  useNamedEffect({
    ...spec,
    options: {
      ...(spec.options || {}),
      kind: "insertion" as EffectKind,
    },
  })
}

export function useNamedRafEffect<
  TSnapshot extends NamedEffectDependencySnapshot,
>(spec: NamedEffectSpec<TSnapshot>) {
  useNamedEffect({
    ...spec,
    options: {
      ...(spec.options || {}),
      kind: "raf" as EffectKind,
    },
  })
}

export function useNamedIdleEffect<
  TSnapshot extends NamedEffectDependencySnapshot,
>(spec: NamedEffectSpec<TSnapshot>) {
  useNamedEffect({
    ...spec,
    options: {
      ...(spec.options || {}),
      kind: "idle" as EffectKind,
    },
  })
}
