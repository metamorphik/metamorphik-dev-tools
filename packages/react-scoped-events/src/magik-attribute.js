// src/lib/magicattribute.tsx
import React from "react";
import { EventHorizonProvider } from "./react-horizon";
import { createEventHorizon } from "./event-horizon";
let _enabled = false;
function extractHorizonMeta(props) {
    if (!props)
        return null;
    const dh = props.definesHorizon;
    const dhwn = props.definesHorizonWithName;
    const log = !!props.horizonLog;
    if (dh == null && dhwn == null)
        return null;
    const name = typeof dh === "string" && dh.trim()
        ? dh.trim()
        : (dhwn?.trim() || props.horizonName || undefined);
    const { definesHorizon, definesHorizonWithName, horizonLog, horizonName, ...rest } = props;
    return { name, log, rest: rest };
}
function wrapWithProvider(type, meta, children) {
    if (type === EventHorizonProvider) {
        return React.createElement(type, { ...meta.rest, children });
    }
    const instance = createEventHorizon(!!meta.log);
    return React.createElement(EventHorizonProvider, {
        instance,
        name: meta.name,
        children: React.createElement(type, meta.rest, ...children),
    });
}
/** Call once at app startup */
export function enableHorizonAttributes() {
    if (_enabled)
        return;
    _enabled = true;
    const origCreateElement = React.createElement;
    React.createElement = function patchedCreateElement(type, props, ...children) {
        const meta = extractHorizonMeta(props);
        if (!meta)
            return origCreateElement(type, props, ...children);
        return wrapWithProvider(type, meta, children);
    };
}
