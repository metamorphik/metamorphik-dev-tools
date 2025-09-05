// src/lib/react-horizon.tsx
import React, { useEffect, useMemo } from 'react';
import { createEventHorizon, type Handler } from './event-horizon';

export class HorizonError extends Error {
  code: 'NOT_FOUND' | 'NOT_IN_SCOPE';
  constructor(code: 'NOT_FOUND' | 'NOT_IN_SCOPE', message: string) {
    super(message);
    this.name = 'HorizonError';
    this.code = code;
  }
}

type EH = ReturnType<typeof createEventHorizon>;
type Registry = Map<string, EH>;

const CurrentCtx  = React.createContext<EH | null>(null);
const RegistryCtx = React.createContext<Registry | null>(null);

// Global registry of horizon names (visibility-agnostic)
const GlobalNameRegistry: Map<string, number> = new Map();

function registerGlobalName(name?: string) {
  if (!name) return;
  GlobalNameRegistry.set(name, (GlobalNameRegistry.get(name) ?? 0) + 1);
}
function unregisterGlobalName(name?: string) {
  if (!name) return;
  const n = (GlobalNameRegistry.get(name) ?? 0) - 1;
  if (n <= 0) GlobalNameRegistry.delete(name);
  else GlobalNameRegistry.set(name, n);
}
function globalHasName(name: string) {
  return GlobalNameRegistry.has(name);
}

/** Provider with optional name for registry-based addressing */
export function EventHorizonProvider({
  children,
  instance,
  log,
  name,
}: {
  children: React.ReactNode;
  instance?: EH;
  log?: boolean;
  name?: string;
}) {
  const parentRegistry = React.useContext(RegistryCtx);
  const eh = useMemo(() => instance ?? createEventHorizon(!!log), [instance, log]);

  const registry = useMemo<Registry>(() => {
    const base = parentRegistry ? new Map(parentRegistry) : new Map();
    if (name) base.set(name, eh);
    return base;
  }, [parentRegistry, name, eh]);

  // NEW: track name existence globally (independent of local visibility)
  React.useEffect(() => {
    registerGlobalName(name);
    return () => unregisterGlobalName(name);
  }, [name]);

  return (
    <CurrentCtx.Provider value={eh}>
      <RegistryCtx.Provider value={registry}>{children}</RegistryCtx.Provider>
    </CurrentCtx.Provider>
  );
}

export function useEventHorizon(name?: string) {
  const current = React.useContext(CurrentCtx);
  const registry = React.useContext(RegistryCtx);

if (name == null) {
  if (!current) throw new Error('useHorizon() must be used inside <EventHorizonProvider>');
    return current;
  }
  if (!registry) throw new Error(`useHorizon("${name}") used outside any provider`);

  const target = registry.get(name);
  if (!target) {
    if (globalHasName(name)) {
      throw new HorizonError('NOT_IN_SCOPE', `Horizon "${name}" exists but is out of scope here.`);
    }else {
      throw new HorizonError('NOT_FOUND', `Horizon "${name}" does not exist.`);
    }
  }
  return target;
}

export const useEmitToEventHorizon = () => useEventHorizon().emit;
export function useOnEvent(type: string, handler: Handler) {
  const eh = useEventHorizon();
  useEffect(() => eh.on(type, handler), [eh, type, handler]);
}
export function useEmitToNamedEventHorizon(name: string) {
  return useEventHorizon(name).emit;
}

/** HOC sugar for `definesHorizon` prop (boolean | string) */
export function withEventHorizonScope<P extends object>(Comp: React.ComponentType<P>) {
  return function Wrapped(props: P & { definesHorizon?: boolean | string; horizonLog?: boolean; horizonName?: string }) {
    const { definesHorizon, horizonLog, horizonName, ...rest } = props as any;
    if (!definesHorizon) return <Comp {...(rest as P)} />;
    const name = typeof definesHorizon === 'string' ? definesHorizon : (horizonName || undefined);
    const instance = React.useMemo(() => createEventHorizon(!!horizonLog), [horizonLog]);
    return (
      <EventHorizonProvider instance={instance} name={name}>
        <Comp {...(rest as P)} />
      </EventHorizonProvider>
    );
  };
}

export function useOnNamedEventHorizon(name: string, type: string, handler: Handler) {
  const target = useEventHorizon(name);
  React.useEffect(() => target.on(type, handler), [target, type, handler]);
}

export function useOnNamedEventHorizonSafe(name: string, type: string, handler: Handler) {
  const registry = React.useContext(RegistryCtx);
  React.useEffect(() => {
    const target = registry?.get(name);
    if (!target) return;            // quietly skip if not visible
    const off = target.on(type, handler);
    return off;
  }, [registry, name, type, handler]);
}

// Safe emitter (no-throw). Returns { ok } or { ok:false, error:{ code: 'NOT_IN_SCOPE'|'NOT_FOUND', message } }
export function useEmitToNamedEventHorizonSafe(name: string) {
  const registry = React.useContext(RegistryCtx);

  return (type: string, payload: any) => {
    const target = registry?.get(name);
    if (target) {
      target.emit(type, payload);
      return { ok: true as const };
    }
    const existsElsewhere = globalHasName(name);
    const code = existsElsewhere ? 'NOT_IN_SCOPE' : 'NOT_FOUND';
    const message = existsElsewhere
      ? `Horizon "${name}" exists but is out of scope here.`
      : `Horizon "${name}" does not exist.`;
    return { ok: false as const, error: { code, message } };
  };
}