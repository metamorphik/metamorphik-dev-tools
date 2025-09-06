# Metamorphik Dev Tools

> **Stance:** Small, focused developer utilities. Clear boundaries. Predictable behavior. Minimal APIs. No surprise dependencies. Ship with tests; document just enough; iterate in public.

This repo is a home for Metamorphik’s developer tooling. It is a monorepo only for convenience; each package stands on its own philosophy and versioning. The root does **not** contain app code or builds.

---

## What’s here (today)

* **react-scoped-events** — scoped, hierarchical event system for React.

  * Folder: [https://github.com/metamorphik/metamorphik-dev-tools/tree/main/packages/react-scoped-events](https://github.com/metamorphik/metamorphik-dev-tools/tree/main/packages/react-scoped-events)
  * Readme & usage live **in the package**.

(Additional packages will land here when they meet the same bar.)

---

## How we work

* **Quality over breadth.** Keep APIs tiny and intentional.
* **Determinism first.** Prefer explicit scopes/state over global magic.
* **No root build.** Work happens inside each package.
* **Releases:** per‑package, tag‑driven (e.g., `events-vX.Y.Z`).
* **CI:** runs per package; root is lightweight.

---

## Contributing

Open an issue or PR. Keep changes scoped to a single package. Add tests alongside code.

Issues: [https://github.com/metamorphik/metamorphik-dev-tools/issues](https://github.com/metamorphik/metamorphik-dev-tools/issues)

---

## License

MIT © Metamorphik
