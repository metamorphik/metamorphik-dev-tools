// Public surface for @metamorphik/react-behavior

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

export * from "./behaviorSpecs"