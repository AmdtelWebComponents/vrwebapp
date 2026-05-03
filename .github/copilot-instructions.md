# VR Web App Guidelines

## Code Style
- Keep changes minimal, fast, and maintainable. Avoid broad refactors unless requested.
- Use `pnpm` for all package/script operations.
- Prefer TypeScript for new logic; keep strict typing compatible with `astro/tsconfigs/strict`.
- For styling, use Open Props and semantic CSS custom properties. Do not introduce Tailwind.
- Add comments only for non-obvious logic (especially VR/Three.js lifecycle or Blender export gotchas).

## Architecture
- Astro is the app shell; keep page files thin and orchestration-focused.
- `src/pages/index.astro` is the room-selector home page (`/`).
- `src/pages/viewer.astro` is the viewer route (`/viewer?room=<id>`) and bootstraps the VRViewer.
- `src/components/VRViewer.js` owns Three.js/WebXR setup, interaction mode switching, and lifecycle.
- `src/lib/rooms.js` is the single source of truth for the room catalogue.
- Put reusable pure logic in `src/lib/` when functionality grows beyond one viewer module.
- Keep assets in `public/models/`, `public/textures/`, `public/hdr/`, and Draco decoders in `public/draco/`.

## Build and Validation
- Install deps: `pnpm install`
- Dev server: `pnpm dev`
- Production build: `pnpm build`
- Preview build: `pnpm preview`
- Astro CLI checks: `pnpm astro check`
- There are currently no dedicated lint/test scripts; run the most relevant Astro check/build command for changes.

## Conventions
- Maintain desktop + VR parity: mouse/touch (`OrbitControls`) and WebXR should both work after changes.
- Optimize for VR performance (Quest-class devices): Draco-compressed models, minimal draw calls, careful allocations.
- Three.js resource safety is required: dispose renderers/controls and clean up geometries, materials, textures, and listeners when adding new resources.
- Clone materials before mutating shared GLTF materials.
- Use raycasting/controller-friendly interaction patterns for editable surfaces.
- Blender export expectations for interactive surfaces:
	- Export `.glb` with Draco compression.
	- Use unique/named materials or mesh names for targetable surfaces.
	- Ensure UVs and PBR textures are correct; keep scale consistent with floor-level VR.

## Docs
- See `README.md` for base Astro workflow commands.
- See `public/draco/README.md` for Draco decoder/background details.