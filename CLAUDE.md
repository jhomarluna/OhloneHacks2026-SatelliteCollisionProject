# Kessler Syndrome Simulator

## Overview
Interactive 3D visualization of satellite collisions in Earth orbit demonstrating the Kessler Syndrome cascade effect. Built for OhloneHacks 2026.

## Tech Stack
- **React 18** + **TypeScript** + **Vite**
- **Three.js** / **React Three Fiber** / **@react-three/drei** for 3D rendering
- **Zustand** for state management
- **Recharts** for timeline charts

## Architecture
- `src/scene/` — All 3D visual components (Earth, Satellites, Debris, OrbitShells, CollisionEffects)
- `src/sim/` — Simulation logic (engine tick, collision probability, initialization)
- `src/store/` — Zustand store (`simStore.ts`) holds all simulation state
- `src/components/` — React UI panels (Controls, Stats, Timeline, EventLog)
- `src/types/sim.ts` — All TypeScript type definitions
- `src/data/presets.ts` — Simulation config presets
- `src/data/celestrak.ts` — CelesTrak API fetch + TLE-to-sim-state parser

## Key Patterns
- **60fps rendering**: Visual components use `useFrame` + `InstancedMesh` for smooth animation. Sim logic still ticks at 200ms intervals for collision/metrics.
- **Angles are cosmetic**: Collision detection is probabilistic per-band (density-based), not based on actual satellite positions. This decouples visual animation from simulation logic.
- **Orbital inclination**: Each band has an `inclination` value that tilts its orbital plane in 3D space.
- **Collision effects**: Engine emits `CollisionEffect` objects with 3D positions; `CollisionEffects.tsx` renders expanding particle bursts.
- **Real satellite data**: `celestrak.ts` fetches live GP data from CelesTrak, converts mean motion to altitude, buckets into orbital bands, and samples ~300 representative satellites for visualization. The `realDataTotal` count is displayed in the UI.
- **Launch rate**: `config.launchRate` spawns N new satellites per tick into random bands, simulating ongoing constellation deployments.

## Running
```bash
npm install
npm run dev
```

## Conventions
- Scene components go in `src/scene/`
- UI components go in `src/components/`
- All sim types defined in `src/types/sim.ts`
- State mutations go through Zustand store actions
