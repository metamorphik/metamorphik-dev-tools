# Classified Inheritance Demo

A tiny Vite + React + TypeScript project demonstrating `createClassifiedComponent`
inheritance with explicit effect triggers.

## Dev

```bash
npm i
npm run dev
```

Open http://localhost:5173

## Files of interest

- `src/useNamedEffect.ts` – minimal named effect wrapper
- `src/useClassified.ts` – behavior-class hook with inheritance
- `src/createClassifiedComponent.ts` – factory to render as normal React components
- `src/App.tsx` – Base + three derived components; buttons to trigger effects
