import React, { useState, useRef } from "react"
import {
  useNamedEffect,
  useNamedLayoutEffect,
  useNamedIdleEffect
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
  useNamedEffect("logCount", (prev, current) => {
    console.log(`Count changed from ${prev} to ${current}`)
  }, [count])

  // 2️⃣ Layout effect — measure before paint
  useNamedLayoutEffect("measureBox", () => {
    const rect = boxRef.current?.getBoundingClientRect()
    console.log("Box bounds:", rect?.width, rect?.height)
  }, [count])

  // 3️⃣ Idle effect — log message after browser is idle
  useNamedIdleEffect("idleLog", () => {
    console.log("Idle time reached, count =", count)
  }, [count])

  // 4️⃣ Conditional effect with gating and debug logs
  useNamedEffect("debugCounter", () => {
    console.log("Debug effect fired for count", count)
  }, [count], { when: enabled, debug: true })

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
          marginBottom: 20
        }}
      />

      <button onClick={() => setCount((c) => c + 1)}>Increment ({count})</button>
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
