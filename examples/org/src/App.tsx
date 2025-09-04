import { createEventHorizon, EventHorizonProvider, useEmitToEventHorizon, useEmitToNamedEventHorizon, useOnEvent, useOnNamedEventHorizon, withEventHorizonScope } from '@metamorphik/react-scoped-events';
import React from 'react';

/** Red flag animation + ripple effect */
function useFlagAnimation() {
  const [flags, setFlags] = React.useState<Array<{ id: number; left: number }>>([]);
  const [ripple, setRipple] = React.useState(false);
  const nextId = React.useRef(1);
  const spawn = () => {
    const id = nextId.current++;
    setFlags(f => [...f, { id, left: Math.random() * 80 + 10 }]);
    setTimeout(() => setFlags(f => f.filter(x => x.id !== id)), 1200);
    setRipple(true);
    setTimeout(() => setRipple(false), 700);
  };
  const view = (
    <>
      <div className={`ripple ${ripple ? 'active' : ''}`} />
      <div className="flagLayer">
        {flags.map(f => (
          <div key={f.id} className="flag" style={{ left: f.left + '%' }}>🚩</div>
        ))}
      </div>
    </>
  );
  return [view, spawn] as const;
}

function ModuleBase({ name }: { name: string }) {
  const emit = useEmitToEventHorizon();
  const emitGlobal = useEmitToNamedEventHorizon('global'); // <-- emit to the global horizon
  
  let emitProject = null;
  if(name.startsWith("A")) {
    emitProject = useEmitToNamedEventHorizon("project:A")
  }else //if(name.startsWith("B")) {
  {
    emitProject = useEmitToNamedEventHorizon("project:B")
  }
  const [count, setCount] = React.useState(0);
  const [flagsView, raise] = useFlagAnimation();

  // Local/project scope
  useOnEvent('flag:red', () => { setCount(c => c + 1); raise(); });

  // ALSO react to global flags so everyone “sees it” when whistle blows
  useOnNamedEventHorizon('global', 'flag:red', () => { setCount(c => c + 1); raise(); });

  return (
    <div className="moduleCircle">
      {flagsView}
      <div className="moduleTitle">{name}</div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
        <button className="chip" onClick={() => emit('flag:red', { from: name })}>
          Raise a red flag
        </button>
        <button className="chip" onClick={() => emitProject('flag:red', { from: name })}>
          Bypass Scrum Master
        </button>
        <button
          className="chip chip--mega"
          title="Escalate to global"
          onClick={() => emitGlobal('flag:red', { from: name, whistle: true })}
        >
          Blow whistle (global)
        </button>
      </div>
      <div className="count">{count}</div>
    </div>
  );
}

const Module = withEventHorizonScope(ModuleBase);

function ProjectCircle({ name, children }: { name: string; children: React.ReactNode }) {
  const [count, setCount] = React.useState(0);
  const [flagsView, raise] = useFlagAnimation();
  useOnEvent('flag:red', () => { setCount(c => c + 1); raise(); });
  const emitProject = useEmitToEventHorizon();
  return (
    <div className="projectCircle">
      {flagsView}
      <div className="projectTitle">Project {name} <span className="bubble">{count}</span></div>
      <div className="modulesWrap">{children}</div>
      <div className="controls">
        <button className="btn btn--warn" onClick={() => emitProject('flag:red', { scope: name })}>Raise flag in Project {name}</button>
      </div>
    </div>
  );
}

function GlobalShell({ children }: { children: React.ReactNode }) {
  const [count, setCount] = React.useState(0);
  const [flagsView, raise] = useFlagAnimation();
  useOnEvent('flag:red', () => { setCount(c => c + 1); raise(); });
  const emitGlobal = useEmitToEventHorizon();
  return (
    <div className="shell">
      <style>{css}</style>
      <header className="top">
        <h1>Event Horizons — Circles with Ripple</h1>
        <p className="sub">Modules (inner), Projects (middle), Global (outer). 🚩 propagate by scope.</p>
      </header>
      <div className="globalCircle">
        {flagsView}
        <div className="globalHead">
          <div className="stat">Global flags <span className="bubble">{count}</span></div>
          <button className="btn btn--danger" onClick={() => emitGlobal('flag:red', { scope: 'global' })}>Raise a global red flag</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const global = React.useMemo(() => createEventHorizon(true), []);
  return (
    <EventHorizonProvider instance={global} name="global">
      <GlobalShell>
        <div className="projectsRow">
          <EventHorizonProvider name="project:A">
            <ProjectCircle name="A">
              <Module name="A-1" definesHorizon="module:A1" />
              <Module name="A-2" definesHorizon="module:A2" />
            </ProjectCircle>
          </EventHorizonProvider>
          <EventHorizonProvider name="project:B">
            <ProjectCircle name="B">
              <Module name="B-1" definesHorizon="module:B1" />
              <Module name="B-2" definesHorizon="module:B2" />
              <Module name="B-3" definesHorizon="module:B3" />
            </ProjectCircle>
          </EventHorizonProvider>
        </div>
      </GlobalShell>
    </EventHorizonProvider>
  );
}

const css = `
*{box-sizing:border-box} :root{--bg:#0b1020;--text:#e5e7eb;--muted:#9ca3af;--accent:#60a5fa;--warn:#f59e0b;--danger:#ef4444}
html,body,#root{height:100%} body{margin:0;background:radial-gradient(80rem 60rem at 10% -10%, #0b2a4d 0%, #0b1020 60%);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial}

.shell{max-width:1200px;margin:0 auto;padding:24px 16px 36px}
.top h1{margin:0 0 6px;font-size:28px} .sub{margin:0;color:var(--muted);font-size:14px}

.globalCircle{position:relative;margin:16px auto 0;width:1050px;max-width:95vw;aspect-ratio:1;border-radius:999px;border:2px dashed rgba(96,165,250,.35);background:radial-gradient(800px 600px at 50% 40%, rgba(96,165,250,.05), rgba(255,255,255,0));box-shadow:inset 0 0 60px rgba(96,165,250,.08);overflow:hidden}
.globalHead{position:absolute;top:16px;left:50%;transform:translateX(-50%);display:flex;gap:10px;align-items:center}
.stat{color:var(--muted)} .bubble{display:inline-block;min-width:22px;padding:2px 6px;border-radius:999px;background:#0b1327;border:1px solid #16213a;margin-left:6px;text-align:center}

.projectsRow{position:absolute;inset:0;display:flex;justify-content:center;align-items:center;gap:22px;flex-wrap:wrap;padding:40px}

.projectCircle{position:relative;width:420px;max-width:42vw;aspect-ratio:1;border-radius:999px;border:2px solid rgba(96,165,250,.25);background:radial-gradient(500px 400px at 50% 40%, rgba(96,165,250,.06), rgba(255,255,255,0));display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;overflow:hidden}
.projectTitle{position:absolute;top:12px;left:50%;transform:translateX(-50%);font-weight:600}
.modulesWrap{display:flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:center;max-width:92%;}
.controls{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:10px;flex-wrap:wrap;justify-content:center}

.moduleCircle{position:relative;width:150px;aspect-ratio:1;border-radius:999px;border:1px solid rgba(96,165,250,.25);background:radial-gradient(260px 180px at 50% 40%, rgba(96,165,250,.07), rgba(255,255,255,0));display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;padding:10px;overflow:hidden}
.moduleTitle{font-size:14px;opacity:.95}
.count{position:absolute;bottom:8px;right:10px;font-size:12px;color:var(--muted)}

.btn{appearance:none;border:1px solid #1f2937;background:linear-gradient(180deg,#1f2937,#111827);color:var(--text);padding:8px 10px;border-radius:10px;font-size:13px;cursor:pointer;transition:transform .06s ease,box-shadow .12s ease,border-color .2s ease}
.btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,0,0,.25);border-color:#334155}
.btn--warn{border-color:#3a2a12;background:linear-gradient(180deg,#3a2a12,#241709);color:#ffdca8}
.btn--danger{border-color:#3c0f12;background:linear-gradient(180deg,#3c0f12,#20090b);color:#ffb4b4}

.chip{appearance:none;border:1px solid #3c0f12;background:linear-gradient(180deg,#3c0f12,#20090b);color:#ffb4b4;padding:6px 10px;border-radius:999px;font-size:12px;cursor:pointer}
.chip:hover{transform:translateY(-1px)}

.flagLayer{pointer-events:none;position:absolute;inset:0;overflow:hidden}
.flag{position:absolute;bottom:-10px;transform:translateX(-50%);animation:raise 1.2s ease-out forwards}
@keyframes raise{0%{bottom:-10px;opacity:0}40%{opacity:1}100%{bottom:85%;opacity:0}}

.ripple{position:absolute;inset:0;border-radius:999px;pointer-events:none;border:2px solid rgba(239,68,68,0);}
.ripple.active{animation:propagate 700ms ease-out forwards}
@keyframes propagate{0%{border-color:rgba(239,68,68,.6);transform:scale(1)}100%{border-color:rgba(239,68,68,0);transform:scale(1.25)}}
`;
