# VR Web App Project Context

## Purpose
VR room viewer built with Astro + Three.js/WebXR.
Primary route: /viewer?room=<id>.

## Current Architecture
- App shell/pages:
  - src/pages/index.astro: room selector home
  - src/pages/viewer.astro: viewer orchestration and UI wiring
- Viewer runtime:
  - src/lib/vrViewer.js: Three.js scene, model loading, WebXR session lifecycle, locomotion, material editing
- Data and local model support:
  - src/lib/rooms.js: room catalogue source of truth
  - src/lib/localModelStore.js: local model import flow
- Viewer UI components:
  - src/components/ViewerTopBar.astro
  - src/components/ViewerSettingsPanel.astro
  - src/components/ViewerDebugPanel.astro

## Build and Run
- Install: pnpm install
- Dev: pnpm dev
- Build: pnpm build
- Preview: pnpm preview
- Model export: pnpm models:export
- Quest export: pnpm models:export:quest
- Model audit: pnpm models:audit
- Strict model audit: pnpm models:audit:strict
- Most reliable validation command: pnpm build

## Model Export Workflow
- Source blend: blender/kellyburn_NewPlans_draft.blend
- Export script: blender/export_rooms.py
- Export output: one GLB per modeled room collection in public/models/ (Kitchen, Lounge, Shower, Utility, Family_Dining, Office1, Hallway_Stairs, Plant, Vestibule, Coats, Bedroom_1-5, First_Floor_Hall, Bathroom, Exterior_Walls, Exterior_Chimneys).
- Export behavior: collection-driven export with Draco compression; helper meshes (CTRL_* and *_Hole*) are excluded. The Assets collection (reference plans/elevations) is intentionally excluded from export. Collections with no exportable mesh geometry (e.g. Open Passages, which only holds a boolean-cutter helper) are also excluded.
- Profiles:
  - standard: full room detail used for desktop/general preview.
  - quest: filters high-cost handle meshes to reduce triangle count and improve headset performance.

## Naming Conventions (Blender source)
- Each room collection has one base "Room_<Name>" mesh, e.g. Room_Kitchen, Room_Shower, Room_Hallway-Stairs.
- Use underscores between tokens; hyphens are allowed within a token for intentional compound room names (Family-Dining, Hallway-Stairs, En-Suite).
- Avoid dot-separated names (e.g. `Room.Shower`); Blender's own numeric duplicate suffixes (`.001`) are still tolerated.
- `pnpm models:audit` reports any collection/object naming that doesn't match this convention under `AUDIT ROOM_COLLECTIONS_NAMING`.


## Validation and Tooling Constraints
- pnpm astro check may be unreliable here due to TypeScript API version mismatch.
- Ignore integrated browser Electron CSP warnings during local dev; they are host-shell warnings, not app logic failures.

## VR and Performance Conventions
- Keep desktop orbit mode and VR mode both working.
- Optimize for Quest-class performance: Draco models, controlled allocations, and minimal draw overhead.
- Dispose Three.js resources and listeners when adding new assets/lifecycle hooks.
- Clone GLTF materials before mutation.

## Locomotion Status
- Baseline commit includes controller-based locomotion path.
- Keyboard input behavior in Immersive Web Emulator can be inconsistent due to emulator/browser event bridging.
- Treat IWE keyboard issues as environment limitations unless reproduced on headset/controller runtime.

## UI Composition Notes
- Viewer controls are modularized into topbar/settings/debug components.
- Query support:
  - /viewer?room=<id>
  - /viewer?room=<id>&menu=hidden

## Session Handoff Checklist For New Chats
1. Read this file first.
2. Read README.md for commands and user-facing behavior.
3. If working on viewer behavior, inspect src/pages/viewer.astro and src/lib/vrViewer.js.
4. After major changes, update this file and README.md if behavior/commands changed.

## Last Confirmed Baseline
- Branch: main
- Baseline commit used to stabilize work: 009e657 (Add VR controller locomotion)
- Baseline validation: pnpm build passes
