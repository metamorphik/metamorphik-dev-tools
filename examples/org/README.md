# Demo App (examples/org)

This folder contains the demo application for the
**react-scoped-events** library.

## 🎯 Purpose

-   Showcase how to use `@metamorphik/react-scoped-events` in a real
    React app.
-   Provide a quick playground for contributors and users to experiment.
-   Used as the source for the public CodeSandbox demo.

## 🚀 Running locally

From the repo root:

``` bash
cd examples/org
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## 🌐 Online Demo

You can also try the same app live on CodeSandbox:

[![Play on
CodeSandbox](https://img.shields.io/badge/Play%20on-CodeSandbox-151515?logo=codesandbox&logoColor=white)](https://codesandbox.io/s/github/metamorphik/react-scoped-events/tree/main/examples/org)

## 🛠️ Notes

-   Built with **Vite + React + TypeScript**.
-   Imports the library source directly from `src/lib`, not the
    published npm package.
-   Keep this app simple and focused --- it should demonstrate core
    features (emit, listen, scope isolation).

## ✅ Conventions

-   Keep the demo **minimal and functional**.
-   Avoid adding heavy dependencies --- this is meant for quick
    try-outs.
-   Update this demo whenever the public API changes so it stays in
    sync.

------------------------------------------------------------------------

Happy experimenting!
