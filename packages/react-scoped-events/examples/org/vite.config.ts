import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Easiest: allow all hosts (safe in a demo)
    allowedHosts: ["codesandbox.io", ".codesandbox.io", ".csb.app"],
    // HMR sometimes needs this behind CSB’s proxy
    hmr: { clientPort: 443 },
    // (Optional) keep the default Vite port so CSB doesn’t change it
    port: 5173
  }
});
