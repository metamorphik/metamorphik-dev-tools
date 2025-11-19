import * as React from "react"

export type Cleanup = void | (() => void)
export type EffectKind = "effect" | "layout" | "insertion" | "raf" | "idle"

export interface UseNamedEffectOptions {
  when?: boolean
  kind?: EffectKind
  debug?: boolean
  onError?: (error: unknown) => void
}

// ---------- DEBUG HELPERS ----------
const isDev = process.env.NODE_ENV !== "production"

function safeToString(x: unknown): string {
  try {
    if (typeof x === "string") return JSON.stringify(x)
    return JSON.stringify(x, (_k, v) =>
      typeof v === "function" ? `[Function ${v.name || "anonymous"}]` : v
    )
  } catch {
    try { return String(x) } catch { return "[Unprintable]" }
  }
}

function diffDeps(prev: React.DependencyList | null, next: React.DependencyList | undefined) {
  if (!next) return { initial: prev === null, changes: [] as Array<{i:number; from:any; to:any}>, prev, next }
  const changes: Array<{ i: number; from: any; to: any }> = []
  if (!prev) return { initial: true, changes, prev, next }
  const len = Math.max(prev.length, next.length)
  for (let i = 0; i < len; i++) {
    const a = prev[i]
    const b = next[i]
    if (a !== b) changes.push({ i, from: a, to: b })
  }
  return { initial: false, changes, prev, next }
}

function logRun(name: string, kind: EffectKind, when: boolean, tag: "schedule" | "run" | "cleanup", info?: string) {
  // prettier-ignore
  console.debug(`[useNamedEffect] ${tag} → ${name} (kind=${kind}, when=${when})${info ? " " + info : ""}`)
}

function logDeps(name: string, kind: EffectKind, when: boolean, prev: React.DependencyList | null, next?: React.DependencyList) {
  const { initial, changes } = diffDeps(prev, next)
  const header = initial ? "initial run" : (changes.length ? `changes: ${changes.map(c => `[${c.i}] ${safeToString(c.from)} → ${safeToString(c.to)}`).join(", ")}` : "no dep changes")
  logRun(name, kind, when, "run", `| ${header}`)
}

// ---------- HOOK ----------
export function useNamedEffect(
  name: string,
  effect: (prevDeps: React.DependencyList | null, deps?: React.DependencyList) => Cleanup,
  deps?: React.DependencyList,
  options?: UseNamedEffectOptions
): void {
  const { when = true, kind = "effect", debug = false, onError } = options ?? {}
  const prevDepsRef = React.useRef<React.DependencyList | null>(null)

  const safeCall = <T extends (...args: any[]) => any>(fn: T): ReturnType<T> | undefined => {
    try { return fn() } catch (err) { onError ? onError(err) : (() => { throw err })(); }
    return undefined
  }

  // ---- Choose hook by kind ----
  if (kind === "layout") {
    React.useLayoutEffect(() => {
      const prev = prevDepsRef.current
      if (isDev && debug) logDeps(name, kind, when, prev, deps)
      let cleanup: Cleanup
      if (!when) {
        prevDepsRef.current = deps ?? null
        return
      }
      const c = safeCall(() => effect(prev, deps))
      cleanup = c
      prevDepsRef.current = deps ?? null
      return () => {
        if (isDev && debug) logRun(name, kind, when, "cleanup")
        if (typeof cleanup === "function") safeCall(cleanup as () => void)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
    return
  }

  if (kind === "insertion") {
    const useIns = (React as any).useInsertionEffect as
      | ((cb: () => Cleanup, deps?: React.DependencyList) => void)
      | undefined

    if (useIns) {
      useIns(() => {
        const prev = prevDepsRef.current
        if (isDev && debug) logDeps(name, kind, when, prev, deps)
        let cleanup: Cleanup
        if (!when) {
          prevDepsRef.current = deps ?? null
          return
        }
        const c = safeCall(() => effect(prev, deps))
        cleanup = c
        prevDepsRef.current = deps ?? null
        return () => {
          if (isDev && debug) logRun(name, kind, when, "cleanup")
          if (typeof cleanup === "function") safeCall(cleanup as () => void)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps)
      return
    }
    // fall through to default if insertion not available
  }

  if (kind === "raf") {
    React.useEffect(() => {
      if (isDev && debug) logRun(name, kind, when, "schedule")
      const prev = prevDepsRef.current
      if (!when) {
        prevDepsRef.current = deps ?? null
        return
      }
      let cleanupFns: Array<() => void> = []
      const id = requestAnimationFrame(() => {
        if (isDev && debug) logDeps(name, kind, when, prev, deps)
        const c = safeCall(() => effect(prev, deps))
        if (typeof c === "function") cleanupFns.push(() => safeCall(c as () => void))
        prevDepsRef.current = deps ?? null
      })
      return () => {
        if (isDev && debug) logRun(name, kind, when, "cleanup")
        cancelAnimationFrame(id)
        while (cleanupFns.length) cleanupFns.pop()!()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
    return
  }

  if (kind === "idle") {
    React.useEffect(() => {
      if (isDev && debug) logRun(name, kind, when, "schedule")
      const prev = prevDepsRef.current
      if (!when) {
        prevDepsRef.current = deps ?? null
        return
      }
      let cancelled = false
      const ric: any = (globalThis as any).requestIdleCallback
      const cic: any = (globalThis as any).cancelIdleCallback
      const cb = () => {
        if (cancelled) return
        if (isDev && debug) logDeps(name, kind, when, prev, deps)
        const c = safeCall(() => effect(prev, deps))
        if (typeof c === "function") {
          // run cleanup at unmount/time of next effect
          cleanup = c
        }
        prevDepsRef.current = deps ?? null
      }
      let cleanup: Cleanup
      let cancel: () => void
      if (typeof ric === "function" && typeof cic === "function") {
        const id = ric(cb); cancel = () => cic(id)
      } else {
        const t = setTimeout(cb, 1); cancel = () => clearTimeout(t)
      }
      return () => {
        if (isDev && debug) logRun(name, kind, when, "cleanup")
        cancelled = true
        cancel?.()
        if (typeof cleanup === "function") safeCall(cleanup as () => void)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
    return
  }

  // Default: 'effect'
  React.useEffect(() => {
    const prev = prevDepsRef.current
    if (isDev && debug) logDeps(name, kind, when, prev, deps)
    let cleanup: Cleanup
    if (!when) {
      prevDepsRef.current = deps ?? null
      return
    }
    const c = safeCall(() => effect(prev, deps))
    cleanup = c
    prevDepsRef.current = deps ?? null
    return () => {
      if (isDev && debug) logRun(name, kind, when, "cleanup")
      if (typeof cleanup === "function") safeCall(cleanup as () => void)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// Convenience wrappers (same as before)
export function useNamedLayoutEffect(
  name: string,
  effect: (prevDeps: React.DependencyList | null, deps?: React.DependencyList) => Cleanup,
  deps?: React.DependencyList,
  options?: Omit<UseNamedEffectOptions, "kind">
) { useNamedEffect(name, effect, deps, { ...options, kind: "layout" }) }

export function useNamedInsertionEffect(
  name: string,
  effect: (prevDeps: React.DependencyList | null, deps?: React.DependencyList) => Cleanup,
  deps?: React.DependencyList,
  options?: Omit<UseNamedEffectOptions, "kind">
) { useNamedEffect(name, effect, deps, { ...options, kind: "insertion" }) }

export function useNamedRafEffect(
  name: string,
  effect: (prevDeps: React.DependencyList | null, deps?: React.DependencyList) => Cleanup,
  deps?: React.DependencyList,
  options?: Omit<UseNamedEffectOptions, "kind">
) { useNamedEffect(name, effect, deps, { ...options, kind: "raf" }) }

export function useNamedIdleEffect(
  name: string,
  effect: (prevDeps: React.DependencyList | null, deps?: React.DependencyList) => Cleanup,
  deps?: React.DependencyList,
  options?: Omit<UseNamedEffectOptions, "kind">
) { useNamedEffect(name, effect, deps, { ...options, kind: "idle" }) }
