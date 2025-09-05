import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import {
  EventHorizonProvider,
  useEventHorizon,
  useOnEvent,
  useEmitToNamedEventHorizon,
  useEmitToNamedEventHorizonSafe,
  HorizonError
} from '../src/react-horizon';
import { createEventHorizon } from '../src/event-horizon';

function Emitter({ name }: { name: string }) {
  const emit = useEmitToNamedEventHorizon(name);
  return <button onClick={() => emit('ping', { n: 1 })}>Emit</button>;
}

function Listener({ label }: { label: string }) {
  const [count, setCount] = React.useState(0);
  useOnEvent('ping', () => setCount((c) => c + 1));
  return <div>{label}:{count}</div>;
}

describe('react-horizon (provider/hooks)', () => {
  it('throws if useEventHorizon is used outside provider', () => {
    // a component that calls the hook directly
    const Broken = () => { useEventHorizon(); return null; };
    expect(() => render(<Broken />)).toThrow(/must be used inside <EventHorizonProvider>/i);
  });

  it('registers/unregisters listeners via useOnEvent', async () => {
    const instance = createEventHorizon();
    const App = () => (
      <EventHorizonProvider instance={instance}>
        <Listener label="L" />
      </EventHorizonProvider>
    );
    const r = render(<App />);
    // one listener registered on 'ping'
    expect(instance._listeners.get('ping')?.size ?? 0).toBe(1);
    r.unmount();
    expect(instance._listeners.get('ping')?.size ?? 0).toBe(0);
  });

it('named horizon: NOT_FOUND vs NOT_IN_SCOPE', () => {
  // 1) Mount a root tree that DEFINES "alpha"
  const alpha = createEventHorizon();
  const AlphaRoot = () => (
    <EventHorizonProvider instance={alpha} name="alpha">
      <div>alpha-defined</div>
    </EventHorizonProvider>
  );
  const alphaRender = render(<AlphaRoot />); // registers "alpha" globally

  // 2) In a completely separate render (no parent registry),
  // mount a provider WITHOUT any name, and probe for "alpha".
  const Probe = ({ name }: { name: string }) => {
    try {
      useEventHorizon(name);
      return <div>FOUND</div>;
    } catch (e: any) {
      if (e instanceof HorizonError) return <div>{e.code}</div>;
      return <div>OTHER</div>; // e.g., used outside any provider
    }
  };

  const OtherRoot = () => (
    <EventHorizonProvider>
      <Probe name="alpha" />
    </EventHorizonProvider>
  );

  const otherRender = render(<OtherRoot />);
  expect(screen.getByText('NOT_IN_SCOPE')).toBeInTheDocument();

  // 3) Now unmount the alpha-defining root so the global registry drops "alpha"
  alphaRender.unmount();
  otherRender.rerender(
    <EventHorizonProvider>
      <Probe name="alpha" />
    </EventHorizonProvider>
  );
  // With "alpha" no longer globally registered, it should be NOT_FOUND.
  expect(screen.getByText('NOT_FOUND')).toBeInTheDocument();
});
  it('emit/listen across same provider using name helpers', async () => {
    const scope = createEventHorizon();
    const App = () => (
      <EventHorizonProvider instance={scope} name="room">
        <Listener label="cnt" />
        <Emitter name="room" />
      </EventHorizonProvider>
    );
    render(<App />);
    expect(screen.getByText('cnt:0')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /emit/i }));
    // allow microtask
    await new Promise((r) => queueMicrotask(r));
    expect(screen.getByText('cnt:1')).toBeInTheDocument();
  });

  it('safe emitter returns error object instead of throwing', async () => {
    const App = () => {
      const safe = useEmitToNamedEventHorizonSafe('missing');
      return <button onClick={() => {
        const res = safe('ping', {});
        (window as any).__res = res;
      }}>Try</button>;
    };
    render(<EventHorizonProvider><App /></EventHorizonProvider>);
    await user.click(screen.getByRole('button', { name: 'Try' }));
    const res = (window as any).__res;
    expect(res.ok).toBe(false);
    expect(['NOT_FOUND','NOT_IN_SCOPE']).toContain(res.error.code);
  });
});
