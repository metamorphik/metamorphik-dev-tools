import { jsx as _jsx } from "react/jsx-runtime";
// src/lib/react-horizon.tsx
import React, { useEffect, useMemo } from 'react';
import { createEventHorizon } from './event-horizon';
export class HorizonError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'HorizonError';
        this.code = code;
    }
}
const CurrentCtx = React.createContext(null);
const RegistryCtx = React.createContext(null);
// Global registry of horizon names (visibility-agnostic)
const GlobalNameRegistry = new Map();
function registerGlobalName(name) {
    if (!name)
        return;
    GlobalNameRegistry.set(name, (GlobalNameRegistry.get(name) ?? 0) + 1);
}
function unregisterGlobalName(name) {
    if (!name)
        return;
    const n = (GlobalNameRegistry.get(name) ?? 0) - 1;
    if (n <= 0)
        GlobalNameRegistry.delete(name);
    else
        GlobalNameRegistry.set(name, n);
}
function globalHasName(name) {
    return GlobalNameRegistry.has(name);
}
/** Provider with optional name for registry-based addressing */
export function EventHorizonProvider({ children, instance, log, name, }) {
    const parentRegistry = React.useContext(RegistryCtx);
    const eh = useMemo(() => instance ?? createEventHorizon(!!log), [instance, log]);
    const registry = useMemo(() => {
        const base = parentRegistry ? new Map(parentRegistry) : new Map();
        if (name)
            base.set(name, eh);
        return base;
    }, [parentRegistry, name, eh]);
    // NEW: track name existence globally (independent of local visibility)
    React.useEffect(() => {
        registerGlobalName(name);
        return () => unregisterGlobalName(name);
    }, [name]);
    return (_jsx(CurrentCtx.Provider, { value: eh, children: _jsx(RegistryCtx.Provider, { value: registry, children: children }) }));
}
export function useEventHorizon(name) {
    const current = React.useContext(CurrentCtx);
    const registry = React.useContext(RegistryCtx);
    if (name == null) {
        if (!current)
            throw new Error('useHorizon() must be used inside <EventHorizonProvider>');
        return current;
    }
    if (!registry)
        throw new Error(`useHorizon("${name}") used outside any provider`);
    const target = registry.get(name);
    if (!target) {
        if (globalHasName(name)) {
            throw new HorizonError('NOT_IN_SCOPE', `Horizon "${name}" exists but is out of scope here.`);
        }
        else {
            throw new HorizonError('NOT_FOUND', `Horizon "${name}" does not exist.`);
        }
    }
    return target;
}
export const useEmitToEventHorizon = () => useEventHorizon().emit;
export function useOnEvent(type, handler) {
    const eh = useEventHorizon();
    useEffect(() => eh.on(type, handler), [eh, type, handler]);
}
export function useEmitToNamedEventHorizon(name) {
    return useEventHorizon(name).emit;
}
/** HOC sugar for `definesHorizon` prop (boolean | string) */
export function withEventHorizonScope(Comp) {
    return function Wrapped(props) {
        const { definesHorizon, horizonLog, horizonName, ...rest } = props;
        if (!definesHorizon)
            return _jsx(Comp, { ...rest });
        const name = typeof definesHorizon === 'string' ? definesHorizon : (horizonName || undefined);
        const instance = React.useMemo(() => createEventHorizon(!!horizonLog), [horizonLog]);
        return (_jsx(EventHorizonProvider, { instance: instance, name: name, children: _jsx(Comp, { ...rest }) }));
    };
}
export function useOnNamedEventHorizon(name, type, handler) {
    const target = useEventHorizon(name);
    React.useEffect(() => target.on(type, handler), [target, type, handler]);
}
export function useOnNamedEventHorizonSafe(name, type, handler) {
    const registry = React.useContext(RegistryCtx);
    React.useEffect(() => {
        const target = registry?.get(name);
        if (!target)
            return; // quietly skip if not visible
        const off = target.on(type, handler);
        return off;
    }, [registry, name, type, handler]);
}
// Safe emitter (no-throw). Returns { ok } or { ok:false, error:{ code: 'NOT_IN_SCOPE'|'NOT_FOUND', message } }
export function useEmitToNamedEventHorizonSafe(name) {
    const registry = React.useContext(RegistryCtx);
    return (type, payload) => {
        const target = registry?.get(name);
        if (target) {
            target.emit(type, payload);
            return { ok: true };
        }
        const existsElsewhere = globalHasName(name);
        const code = existsElsewhere ? 'NOT_IN_SCOPE' : 'NOT_FOUND';
        const message = existsElsewhere
            ? `Horizon "${name}" exists but is out of scope here.`
            : `Horizon "${name}" does not exist.`;
        return { ok: false, error: { code, message } };
    };
}
