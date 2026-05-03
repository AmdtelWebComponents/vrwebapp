 # VR Web App
 
 A WebXR room-viewer built with [Astro](https://astro.build) and [Three.js](https://threejs.org). Browse a catalogue of 3D-scanned rooms in the browser or step inside them with a WebXR headset (Quest-class devices supported).
 
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
 │   │   └── VRViewer.js # Three.js / WebXR lifecycle module
 │   ├── lib/
 │   │   └── rooms.js    # Room catalogue (id, modelUrl, camera, …)
 │   └── pages/
 │       ├── index.astro # Room selector home page
 │       └── viewer.astro# Full-screen viewer with room switcher + VR button
 ├── astro.config.mjs
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
 | `pnpm astro check` | TypeScript / Astro type-check              |
 
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
 
 ## WebXR Notes
 
 - The viewer requests an `xrCompatible` WebGL context at creation time so Three.js never needs an async `makeXRCompatible()` call mid-session.
 - When a WebXR polyfill is present (dev browsers), `XRWebGLBinding.prototype.createProjectionLayer` is temporarily removed before `renderer.xr.setSession()` to prevent Three.js from attempting the layers path with a polyfilled session. It is restored immediately after.
 - VR requires `immersive-vr` support; the "Enter VR" button is hidden until `navigator.xr.isSessionSupported` resolves to `true`.
