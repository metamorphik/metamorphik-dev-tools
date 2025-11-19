// Public surface for @metamorphik/react-behavior

// ----- Hooks: Named Effects -----
export {
  useNamedEffect,
  useNamedLayoutEffect,
  useNamedInsertionEffect,
  useNamedRafEffect,
  useNamedIdleEffect
} from "./useNamedEffects";
export type {
  Cleanup as NamedEffectCleanup,
  EffectKind,
  UseNamedEffectOptions
} from "./useNamedEffects";

// ----- Core Behavior Hook -----
export { useClassified } from "./useClassified";

// ----- Classified Component Factory -----
export {
  createClassifiedComponent
} from "./createClassifiedComponent";
export type {
  ClassifiedComponent
} from "./createClassifiedComponent";

// ----- Types (Behavior model) -----
export type {
  BehaviorAPI,
  BehaviorContext,
  EventSpec,
  NamedEvents,
  UseClassifiedSpec,
  BehaviorInstance,
  PlatformStrapperSpecs,
  ReactStrapperConfig
} from "./types";
