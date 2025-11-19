# useNamedEffects — Make reactive side-effects addressable

**Why:** Anonymous effects don’t scale. Named effects give you determinism, debuggability, and a clean override story.

## Install
Just add the file to your project (no deps besides React 18+).

## API
```ts
useNamedEffects(effects: Record<string, {
  when?: boolean            // default: true
  deps?: DependencyList     // must keep same length/order
  run: () => void | () => void
  kind?: 'effect' | 'layout' | 'insertion' | 'raf' | 'idle' // default: 'effect'
}>, options?: {
  order?: (a: string, b: string) => number
  onError?: (name: string, error: unknown) => void
  debug?: boolean
}): void
