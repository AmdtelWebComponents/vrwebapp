# VR Web App Project Guidelines

## Core Philosophy
- **Minimalism first**: Smallest possible code that is fast, secure, and maintainable.
- **Astro as orchestrator**: Use islands only when necessary. Prefer vanilla Three.js.
- **Performance**: Optimize for VR (60+ FPS on Quest). Use Draco, proper disposal, minimal draw calls.
- **Styling**: Open Props + semantic CSS custom properties only. NO Tailwind classes. Keep HTML clean.
- **Package Manager**: Always use pnpm.

## File Structure Expectations
- `src/lib/` for pure logic (e.g. `vr-core.ts`)
- `src/components/` for Astro islands
- `src/styles/` for Open Props + custom CSS
- `public/models/`, `public/textures/`, `public/hdr/`

## Coding Standards
- TypeScript strict.
- Three.js: Use modern patterns, clone materials before editing, traverse GLTF intelligently.
- VR: Support desktop (mouse/OrbitControls) + WebXR seamlessly. Raycasting for surface selection.
- Stage 1: Surface color/texture picker that works in both web view and VR.
- Comments: Explain Blender export tips when relevant (UVs, materials, scale).

## Blender → Web Workflow
- Export .glb with Draco compression.
- Unique materials or named meshes for editable surfaces.
- PBR textures, proper UVs.

## GitHub Copilot Rules
- Always prefer smallest code.
- Suggest clean, commented, typed solutions.
- When editing, maintain Open Props styling and pnpm compatibility.
- For Three.js changes: ensure dispose() cleanup, raycaster for interaction, XR controller support.

Follow these rules on every suggestion.