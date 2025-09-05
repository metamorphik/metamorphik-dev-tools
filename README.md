# react-scoped-events

Scoped, hierarchical event system for React — think of it like **pub/sub with boundaries**.  
You define **event horizons** (scopes) in your component tree, and decide whether an event stays local, bubbles to a project, or goes global.

---

## ✨ Features

- 🔹 **Scoped events** — emit/listen inside a local horizon only.  
- 🔹 **Named horizons** — `global`, `project:Earth`, `module:42`, etc.  
- 🔹 **Nested providers** — project inside global, module inside project.  
- 🔹 **Strict & safe APIs**  
  - strict hooks throw at render if you ask for an out-of-scope horizon.  
  - safe hooks resolve at call time and tell you if horizon is missing.  
- 🔹 **Lightweight** — no external deps beyond React.  

---

## Live Demo

Try it instantly on CodeSandbox:

[![Play on CodeSandbox](https://img.shields.io/badge/Play%20on-CodeSandbox-151515?logo=codesandbox&logoColor=white)](https://codesandbox.io/s/p7v2q6)

---

## 🚀 Quickstart

Install:
```bash
npm install react-scoped-events
```

Wrap your app in a top-level horizon:
```tsx
import {
  EventHorizonProvider,
  useEmitToEventHorizon,
  useOnEvent
} from "react-scoped-events";

function SenderPanel() {
  const emit = useEmitToEventHorizon();
  return (
    <button onClick={() => emit("hello", { msg: "Hi there" })}>
      Send hello
    </button>
  );
}

function ReceiverPanel() {
  useOnEvent("hello", (payload) => {
    alert("Got event: " + payload.msg);
  });
  return <div>👂 Listening for hello…</div>;
}

export default function App() {
  return (
    <EventHorizonProvider name="global">
      <div style={{ display: "flex", gap: 20 }}>
        <SenderPanel />
        <ReceiverPanel />
      </div>
    </EventHorizonProvider>
  );
}
```

Clicking the button in **SenderPanel** will trigger an alert in **ReceiverPanel**.

---

## 🧭 API overview

- **Provider**
  - `<EventHorizonProvider name="...">` — defines a scope.
- **Emit**
  - `useEmitToEventHorizon()` — emit in the current horizon.
  - `useEmitToNamedEventHorizon("global")` — emit to one of the enclosing horizon.
  - `useEmitToNamedEventHorizonSafe("foo")` — safe variant (returns `{ok,error}`).  
- **Listen**
  - `useOnEvent(type, handler)` — subscribe in current horizon.
  - `useOnNamedEventHorizon("global", type, handler)` — subscribe in one of the enclosing horizon.
  - `useOnNamedEventHorizonSafe("foo", type, handler)` — safe, silent if not visible.
- **HOC**
  - `withEventHorizonScope(Component)` — wrap any component to make it define a horizon if it receives `definesHorizon`.

---

## 📦 Why not Zustand?

We started with Zustand, but quickly realized horizons were naturally modeled by **React Context**:
- Clear ownership boundaries.
- Works without extra dependencies.
- Easier nesting & naming.

---

## 📝 License

MIT © 2025 Metamorphik
