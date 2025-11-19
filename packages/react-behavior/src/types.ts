import type { DependencyList } from "react";
import type { PropsWithChildren } from "react"
import { useNamedEffect, type EffectKind } from "./useNamedEffects"

export type Cleanup = void | (() => void)

/** Public API exposed by an instance (generic over your own Expose shape) */
export interface BehaviorAPI<Expose = any, P = any> {
  /** Host component props (children included) */
  props: PropsWithChildren<P> | undefined
  /** Local state bag */
  state: Record<string, any>
  /** Stable per-key setters */
  set: Record<string, (value: any | ((prev: any) => any)) => void>
  /** Methods (child overrides parent by key); auto-bound to live api */
  methods: Record<string, any>
     /** 
   * Per-instance, mutable, non-reactive bag.
   * Shared across base/derived chain; does NOT trigger re-renders.
   */
  locals: Record<string, any>
  /** Primary render entry (pure, no hooks) */
  view?: (
    api: BehaviorAPI<Expose, P>,
    ctx: BehaviorContext,
    props: PropsWithChildren<P> | undefined
  ) => React.ReactNode
  /** Public surface computed from api+ctx, or defaults to state */
  expose: Expose
  /** Optional debug name */
  name?: string
}

/** Context passed to callbacks; includes base’s exposed API and base view if any */
export interface BehaviorContext {
  baseExpose?: any
  baseView?: ((api: any, ctx: BehaviorContext, props?: any) => React.ReactNode) | undefined
}

/** Engine-agnostic event spec (mapped to React via useNamedEffect) */
export interface EventSpec<Expose = any, P = any> {
  /** Stable dependency list for this event (computed from API) */
  deps: (api: BehaviorAPI<Expose, P>, ctx: BehaviorContext) => React.DependencyList
  /** The side-effect; may return cleanup */
  run: (api: BehaviorAPI<Expose, P>, ctx: BehaviorContext) => Cleanup
  /** Optional scheduling hint; default 'effect' */
  kind?: EffectKind
  /** Optional gate; default true */
  when?: (api: BehaviorAPI<Expose, P>, ctx: BehaviorContext) => boolean
  /** Chaining controls when overriding a base event of the same name */
  runSuperBefore?: boolean
  runSuperAfter?: boolean
}

/** Named events map */
export type NamedEvents<Expose = any, P = any> = Record<string, EventSpec<Expose, P>>

/** Behavior specification */
export interface UseClassifiedSpec<Expose = any, P = any> {
  name?: string
  /** Initial, local state keys (key shape should remain stable across renders) */
  state?: Record<string, any>
  /** Methods that receive bound api as first arg when invoked */
  methods?: Record<string, (api: BehaviorAPI<Expose, P>, ...args: any[]) => any>
  /** Named events; keys are canonical */
  events?: NamedEvents<Expose, P>
  /** Primary render entry (optional). Child overrides parent by default; can call ctx.baseView */
  view?: (
    api: BehaviorAPI<Expose, P>,
    ctx: BehaviorContext,
    props: PropsWithChildren<P> | undefined
  ) => React.ReactNode
  /** Compute public interface */
  expose?: (api: BehaviorAPI<Expose, P>, ctx: BehaviorContext) => Expose
  /** Options (room for future) */
  options?: {
    hideBaseInApi?: boolean
    reactStrapper?: ReactStrapperConfig   // <-- add this
  }
}

/** The live instance returned from the hook */
export interface BehaviorInstance<Expose = any, P = any> {
  api: BehaviorAPI<Expose, P>
  /** A ready-to-use React component that renders spec.view */
  View: React.FC<PropsWithChildren<P>>
  /** Internal: resolved named events (after inheritance/merge) */
  __events: NamedEvents<Expose, P>
  /** Internal: base exposed API for chaining inside callbacks */
  __baseExpose?: any
  
  __platformStrapper?: PlatformStrapperSpecs  // <-- add
}

export interface ReactStrapperConfig {
  /** If true, the returned View is React.memo(...) — use only if your view is pure */
  memoizeView?: boolean
}

/** Bucket for per-platform strappers; extend freely (angular, vue, etc.) */
export interface PlatformStrapperSpecs {
  react?: ReactStrapperConfig
  // angular?: AngularStrapperConfig
  // vue?: VueStrapperConfig
}
