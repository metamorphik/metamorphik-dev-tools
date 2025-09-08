// src/lib/magicattribute.tsx
import React from "react";
import { EventHorizonProvider } from "./react-horizon";
import { createEventHorizon } from "./event-horizon";

type AnyProps = Record<string, any>;
type CE = typeof React.createElement;

let _enabled = false;

function extractHorizonMeta<P extends AnyProps>(props?: P) {
  if (!props) return null;

  const dh = props.definesHorizon;
  const dhwn = props.definesHorizonWithName as string | undefined;
  const log = !!props.horizonLog;

  if (dh == null && dhwn == null) return null;

  const name =
    typeof dh === "string" && dh.trim()
      ? dh.trim()
      : (dhwn?.trim() || props.horizonName || undefined);

  const {
    definesHorizon,
    definesHorizonWithName,
    horizonLog,
    horizonName,
    ...rest
  } = props;

  return { name, log, rest: rest as P };
}

function wrapWithProvider(
  type: any,
  meta: { name?: string; log: boolean; rest: AnyProps },
  children: any[]
) {
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
  if (_enabled) return;
  _enabled = true;

  const origCreateElement: CE = React.createElement;

  (React as any).createElement = function patchedCreateElement(
    type: any,
    props?: AnyProps,
    ...children: any[]
  ) {
    const meta = extractHorizonMeta(props);
    if (!meta) return origCreateElement(type, props, ...children);
    return wrapWithProvider(type, meta, children);
  };
}

// TSX typing augmentation (so TS accepts magic props)
declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      definesHorizon?: boolean | string;
      definesHorizonWithName?: string;
      horizonLog?: boolean;
      horizonName?: string;
    }
  }
}
