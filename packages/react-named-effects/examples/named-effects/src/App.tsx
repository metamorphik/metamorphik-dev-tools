import React, { useState, useRef } from "react"
import {
  useNamedEffect,
  useNamedLayoutEffect,
  useNamedIdleEffect,
} from "../../../src/useNamedEffects"

/**
 * Example app demonstrating useNamedEffect family.
 * Drop this next to your useNamedEffect.ts and run.
 */
export default function App() {
  const [count, setCount] = useState(0)
  const [enabled, setEnabled] = useState(true)
  const boxRef = useRef<HTMLDivElement>(null)

  // 1️⃣ Regular effect (same as useEffect but named)
  useNamedEffect({
    name: "logCount",
    handler(prev, current) {
      const prevCount = prev?.count
      const currentCount = current.count
      console.log(`Count changed from ${prevCount} to ${currentCount}`)
    },
    dependencySnapshot: { count },
  })

  // 2️⃣ Layout effect — measure before paint
  useNamedLayoutEffect({
    name: "measureBox",
    handler(_prev, current) {
      const rect = boxRef.current?.getBoundingClientRect()
      console.log(
        "Box bounds (for count =",
        current.count,
        "):",
        rect?.width,
        rect?.height
      )
    },
    dependencySnapshot: { count },
  })

  // 3️⃣ Idle effect — log message after browser is idle
  useNamedIdleEffect({
    name: "idleLog",
    handler(_prev, current) {
      console.log("Idle time reached, count =", current.count)
    },
    dependencySnapshot: { count },
  })

  // 4️⃣ Conditional effect with gating and debug logs
  useNamedEffect({
    name: "debugCounter",
    handler(_prev, current) {
      console.log("Debug effect fired for count", current.count)
    },
    dependencySnapshot: { count },
    options: {
      when: enabled,
      debug: true,
    },
  })

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h2>🧩 useNamedEffect Demo</h2>

      <div
        ref={boxRef}
        style={{
          width: 100 + count * 5,
          height: 80 + count * 2,
          background: "#b3e5fc",
          transition: "all 0.3s ease",
          marginBottom: 20,
        }}
      />

      <button onClick={() => setCount((c) => c + 1)}>
        Increment ({count})
      </button>
      <button
        style={{ marginLeft: 10 }}
        onClick={() => setEnabled((e) => !e)}
      >
        {enabled ? "Disable" : "Enable"} debug effect
      </button>

      <p style={{ marginTop: 30, fontSize: 14, color: "#555" }}>
        Open the console to watch logs from each named effect.
      </p>
    </div>
  )
}
