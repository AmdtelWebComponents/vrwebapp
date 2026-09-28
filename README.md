 # VR Web App
 
 A WebXR room-viewer built with [Astro](https://astro.build) and [Three.js](https://threejs.org). Browse a catalogue of 3D-scanned rooms in the browser or step inside them with a WebXR headset (Quest-class devices supported).

Astro is installed locally in this project. Use it through `pnpm` or `pnpm exec`; a global `astro` install is not required.
 
 ## Project Structure
 
 ```text
 /
 ├── public/
 │   ├── draco/          # Draco WASM decoder (see public/draco/README.md)
 │   ├── hdr/            # HDR environment maps
 │   ├── models/         # Draco-compressed .glb room models
 │   └── textures/       # Optional PBR textures
 ├── src/
 │   ├── components/
│   │   ├── ViewerDebugPanel.astro    # Diagnostics / performance panel
│   │   ├── ViewerSettingsPanel.astro # Room + material controls
│   │   └── ViewerTopBar.astro        # Shared viewer controls container
 │   ├── lib/
│   │   ├── localModelStore.js        # Local model import helpers
│   │   ├── rooms.js                  # Room catalogue (id, modelUrl, camera, …)
│   │   └── vrViewer.js               # Three.js / WebXR lifecycle module
 │   └── pages/
 │       ├── index.astro # Room selector home page
│       └── viewer.astro# Full-screen viewer route and UI bootstrap
 ├── astro.config.mjs
├── pnpm-workspace.yaml
 └── package.json
 ```
 
 ## Commands
 
All commands run from the project root with `pnpm`:
 
 | Command            | Action                                      |
 | :----------------- | :------------------------------------------ |
 | `pnpm install`     | Install dependencies                        |
| `pnpm dev`         | Dev server at `localhost:4321`              |
 | `pnpm build`       | Production build to `./dist/`               |
 | `pnpm preview`     | Preview the production build locally        |
| `pnpm exec astro --help` | Run the local Astro CLI               |
| `pnpm models:export` | Export one GLB per modeled room collection from `blender/kellyburn_NewPlans_draft.blend` into `public/models/` |
| `pnpm models:export:quest` | Export lighter Quest-focused GLBs (filters high-cost handle meshes) |
| `pnpm models:audit` | Print Blender scene export warnings without writing files |
| `pnpm models:audit:strict` | Fail when the audit reports any issue |

## Local Astro CLI

Use the locally installed Astro CLI instead of a global install:

```bash
pnpm exec astro --help
pnpm exec astro dev
pnpm exec astro build
```

To stop the dev server:

```bash
# If the server is running in your current terminal
Ctrl+C

# If you need to use the local Astro CLI explicitly
pnpm exec astro dev stop
```

If the server was started in another terminal and does not stop cleanly, you can also kill the default port on Linux:

```bash
fuser -k 4321/tcp
```

## Validation Notes

- `pnpm build` is the most reliable validation command for this repo.
- `pnpm astro check` is currently not reliable here because the project uses TypeScript 7, while Astro's checker still depends on an older programmatic TypeScript API.

## Viewer UI

- `/viewer?room=<id>` opens a specific room.
- `/viewer?room=<id>&menu=hidden` hides the main settings menu while keeping the viewer and diagnostics active.
- The viewer UI is split into Astro components for the topbar container, settings controls, and diagnostics panel.
- The diagnostics panel reports module-load, loader, environment, room-load, and deferred background timings.
 
 ## Adding Rooms
 
 Edit `src/lib/rooms.js`. Each entry needs:
 
 ```js
 {
	 id: 'my-room',           // URL slug  (/viewer?room=my-room)
	 name: 'My Room',
	 description: '…',
	 modelUrl: '/models/my-room.glb',  // Draco-compressed .glb in public/models/
	 scale: 10,               // uniform scale applied after centering
	 cameraPosition: [0, 1.6, -2],
	 target: [0, 1.6, 5],
	 isMock: false            // set true to show the "Mock" badge in the selector
 }
 ```
 
 Export `.glb` with Draco compression from Blender. Keep scale consistent with floor-level VR (1 unit = 1 metre).

For repeatable exports in this repo, use:

```bash
pnpm models:export
```

For Quest-focused exports with reduced geometry load:

```bash
pnpm models:export:quest
```

To audit the source blend for common runtime/export issues:

```bash
pnpm models:audit
```

To fail the command on any audit warning:

```bash
pnpm models:audit:strict
```

This runs the Blender script at `blender/export_rooms.py`, exporting one GLB per modeled room collection and skipping helper/control meshes used only during modeling. The `Assets` collection (reference plans/elevations) is intentionally excluded from export.

### Blender Naming Convention

- Each room collection has one base `Room_<Name>` mesh (e.g. `Room_Kitchen`, `Room_Shower`, `Room_Hallway-Stairs`).
- Use underscores between tokens; hyphens are allowed within a token for intentional compound room names (`Family-Dining`, `Hallway-Stairs`, `En-Suite`).
- Avoid dot-separated names (e.g. `Room.Shower`); run `pnpm models:audit` after renaming objects in Blender to confirm everything matches.

Local models can also be loaded into the viewer at runtime through the local model flow backed by `src/lib/localModelStore.js`.
 
 ## WebXR Notes
 
 - The viewer requests an `xrCompatible` WebGL context at creation time so Three.js never needs an async `makeXRCompatible()` call mid-session.
 - When a WebXR polyfill is present (dev browsers), `XRWebGLBinding.prototype.createProjectionLayer` is temporarily removed before `renderer.xr.setSession()` to prevent Three.js from attempting the layers path with a polyfilled session. It is restored immediately after.
 - VR requires `immersive-vr` support; the "Enter VR" button is hidden until `navigator.xr.isSessionSupported` resolves to `true`.
- GLTF/DRACO and HDR loaders are initialized lazily to reduce first-load pressure, and the environment background is applied after the room is ready.
