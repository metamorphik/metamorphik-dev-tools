// Re-export the public primitives only (keep internals private if needed)
export * from "./event-horizon";   // createEventHorizon, Handler, etc.
export * from "./react-horizon";   // EventHorizonProvider, useEmit, useOn, useEmitTo, useOnNamed, withHorizonScope
