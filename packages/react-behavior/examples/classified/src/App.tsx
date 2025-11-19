import React from "react"
import { createClassifiedComponent } from "../../../src/createClassifiedComponent"

/** =========================
 * Base class (1 method, 2 effects, 1 view)
 *   - onCountChange (deps: [count])
 *   - onManualTrigger (deps: [triggerNonce])
 * ========================= */
export const BaseDialog = createClassifiedComponent<any, { label?: string }>({
  name: "BaseDialog",
  state: {
    open: false,
    count: 0,
    effectHits: 0,
    triggerNonce: 0,
    title: "BaseDialog View",
  },
  methods: {
    inc(api) { api.set.count((c: number) => c + 1) },
    toggle(api) { api.set.open((o: boolean) => !o) },
    trigger(api) { api.set.triggerNonce((n: number) => n + 1) }, // manual trigger
  },
  events: {
    onCountChange: {
      deps: (api) => [api.state.count],
      run: (api) => {
        api.set.effectHits((x: number) => x + 1)
        console.log("[BaseDialog] onCountChange → count:", api.state.count)
      },
    },
    onManualTrigger: {
      deps: (api) => [api.state.triggerNonce],
      run: (api) => {
        api.set.effectHits((x: number) => x + 1)
        console.log("[BaseDialog] onManualTrigger → nonce:", api.state.triggerNonce)
      },
    },
  },
  view: (api, _ctx, props) => (
    <div className="dialog" data-component="BaseDialog">
      <div className="banner">VIEW: BaseDialog</div>
      <h3 className="title">{api.state.title}</h3>
      <div className="row">
        <span className="pill">count: {api.state.count}</span>
        <span className="pill">effectHits: {api.state.effectHits}</span>
        <span className="pill">open: {String(api.state.open)}</span>
        <span className="pill">nonce: {api.state.triggerNonce}</span>
        {props?.label && <span className="pill">label: {props.label}</span>}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button onClick={() => api.methods.inc()}>Count +1 (fires onCountChange)</button>
        <button onClick={() => api.methods.trigger()}>Trigger Effect (manual)</button>
        <button onClick={() => api.methods.toggle()}>
          {api.state.open ? "Hide" : "Show"} Content
        </button>
      </div>
      {api.state.open && (
        <div className="body">
          <strong>Children:</strong> {props?.children}
        </div>
      )}
    </div>
  ),
})

/** ==========================================================
 * DerivedAllOverride — overrides method, BOTH effects, and view
 * ========================================================== */
export const DerivedAllOverride = createClassifiedComponent(BaseDialog, {
  name: "DerivedAllOverride",
  methods: {
    inc(api) { api.set.count((c: number) => c + 2) },          // override count increment
    trigger(api) { api.set.triggerNonce((n: number) => n + 10) }, // stronger manual trigger
  },
  events: {
    onCountChange: {
      runSuperBefore: true,
      deps: (api) => [api.state.count],
      run: (api) => {
        api.set.effectHits((x: number) => x + 1)
        console.log("[DerivedAllOverride] onCountChange → count:", api.state.count)
      },
    },
    onManualTrigger: {
      runSuperAfter: true, // child first, then base
      deps: (api) => [api.state.triggerNonce],
      run: (api) => {
        api.set.effectHits((x: number) => x + 1)
        console.log("[DerivedAllOverride] onManualTrigger → nonce:", api.state.triggerNonce)
      },
    },
  },
  view: (api, ctx, props) => (
    <div className="dialog fancy" data-component="DerivedAllOverride">
      <div className="banner">VIEW: DerivedAllOverride (overrides Base)</div>
      <h3 className="title">DerivedAllOverride View</h3>

      <div className="row" style={{ marginBottom: 8 }}>
        <span className="pill">count: {api.state.count}</span>
        <span className="pill">effectHits: {api.state.effectHits}</span>
        <span className="pill">open: {String(api.state.open)}</span>
        <span className="pill">nonce: {api.state.triggerNonce}</span>
        {props?.label && <span className="pill">label: {props.label}</span>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => api.methods.inc()}>Count +2 (fires onCountChange)</button>
        <button onClick={() => api.methods.trigger()}>Trigger Effect (+10 nonce)</button>
        <button onClick={() => api.methods.toggle()}>
          {api.state.open ? "Hide" : "Show"} Content
        </button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <em>Below is the BaseDialog view included inside the derived view:</em>
      </div>
      {ctx.baseView?.(api, ctx, props)}

      <div className="body" style={{ marginTop: 8 }}>
        <strong>Derived footer:</strong> ✨ Fancy extras here ✨
      </div>
    </div>
  ),
})

/** ==========================================================
 * DerivedNoView — overrides method & one effect, omits view (inherits Base view)
 * ========================================================== */
export const DerivedNoView = createClassifiedComponent(BaseDialog, {
  name: "DerivedNoView",
  methods: {
    inc(api) { api.set.count((c: number) => c + 5) },
  },
  events: {
    onCountChange: {
      runSuperAfter: true,
      deps: (api) => [api.state.count],
      run: (api) => {
        api.set.effectHits((x: number) => x + 1)
        console.log("[DerivedNoView] onCountChange → count:", api.state.count)
      },
    },
    // omit onManualTrigger → inherits Base onManualTrigger
  },
  // view omitted → inherits Base view (so it has the same buttons)
})

/** ==========================================================
 * DerivedNoViewNoEffect — override method only; omit view & both effects (inherit all)
 * ========================================================== */
export const DerivedNoViewNoEffect = createClassifiedComponent(BaseDialog, {
  name: "DerivedNoViewNoEffect",
  methods: {
    inc(api) { api.set.count((c: number) => c + 10) },
  },
  // omits both effects + view → inherits all from Base
})

/** ============= App container just renders all 4 with headings ============= */
export default function App() {
  return (
    <div className="container">
      <div className="section">
        <div className="banner">COMPONENT</div>
        <h2>BaseDialog</h2>
        <BaseDialog label="Base">
          <span>Base children content</span>
        </BaseDialog>
      </div>

      <hr />

      <div className="section">
        <div className="banner">COMPONENT</div>
        <h2>DerivedAllOverride (overrides method + both effects + view)</h2>
        <DerivedAllOverride label="DerivedAllOverride">
          <span>DerivedAllOverride children content</span>
        </DerivedAllOverride>
      </div>

      <hr />

      <div className="section">
        <div className="banner">COMPONENT</div>
        <h2>DerivedNoView (overrides method + one effect, inherits view + manual effect)</h2>
        <DerivedNoView label="DerivedNoView">
          <span>DerivedNoView children content</span>
        </DerivedNoView>
      </div>

      <hr />

      <div className="section">
        <div className="banner">COMPONENT</div>
        <h2>DerivedNoViewNoEffect (overrides method only; inherits both effects + view)</h2>
        <DerivedNoViewNoEffect label="DerivedNoViewNoEffect">
          <span>DerivedNoViewNoEffect children content</span>
        </DerivedNoViewNoEffect>
      </div>
    </div>
  )
}
