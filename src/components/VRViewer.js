import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'; // Added for HDR env

export async function initVRViewer(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // Added for better HDR/PBR
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Lights (kept basic; HDR will enhance)
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  // ── Add HDR Environment ──
  // Place your HDR file in public/hdr/ or adjust path (e.g., download from Poly Haven)
  const hdrLoader = new HDRLoader();
  hdrLoader.load('/hdr/autumn_hill_view_1k.hdr', (texture) => { // Replace with your HDR path
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture; // Provides env for PBR materials (key for glass/reflections)
    scene.background = texture; // Optional: Sets background to HDR (remove if you want solid color)
    texture.dispose(); // Clean up after setting
  });

  // ── Setup Draco + GLTF ──
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');
  dracoLoader.setDecoderConfig({ type: 'js' });
  dracoLoader.preload();

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  let modelBounds; // To store room bounds for camera constraints
  let paddedBounds;

  loader.load('/models/kellyburn_Room_Livingroom.glb', (gltf) => {
    scene.add(gltf.scene);
    console.log('Model loaded successfully');

    // ── Compute bounds and set initial camera inside ──
    modelBounds = new THREE.Box3().setFromObject(gltf.scene);
    // paddedBounds = modelBounds.clone().expandByScalar(0.1); // padding
    
    const center = modelBounds.getCenter(new THREE.Vector3());
    const size = modelBounds.getSize(new THREE.Vector3());

    // Assume room is centered; set camera inside (e.g., eye level, near center but offset if needed)
    // Adjust offsets based on your model's origin/scale (e.g., if floor is at y=0)
    camera.position.set(center.x, center.y - size.y / 2 + 1.6, center.z); // Inside, eye height above floor
    // controls.target.set(center.x, center.y - size.y / 2 + 1.6, center.z - 1); // Look slightly forward
    controls.target.copy(camera.position).add(new THREE.Vector3(0, 0, 2)); // look forward a bit (adjust)

    // Optional: Scale/position model if not at origin
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.scale.set(1, 1, 1);
  }, undefined, (error) => {
    console.error('Error loading GLB:', error);
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = true; // Disable panning to help constrain (optional)

  // ── Constrain OrbitControls ──
  // Limit distance/angles to keep camera "inside" (prevents orbiting too far/outside)
  controls.minDistance = 0.1; // Close-up limit
  controls.maxDistance = 5; // Adjust based on room size to avoid exterior views
  controls.minPolarAngle = Math.PI / 4; // Limit looking too up/down
  controls.maxPolarAngle = Math.PI - Math.PI / 4;
  controls.minAzimuthAngle = -Math.PI / 2; // Optional: Limit left/right (uncomment/adjust)
  controls.maxAzimuthAngle = Math.PI / 2;

  // VR support check + conditional button (unchanged)
  let vrButton = null;
  if ('xr' in navigator) {
    try {
      const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
      if (isSupported) {
        vrButton = VRButton.createButton(renderer);
        vrButton.style.position = 'absolute';
        vrButton.style.bottom = '20px';
        vrButton.style.left = '50%';
        vrButton.style.transform = 'translateX(-50%)';
        container.appendChild(vrButton);
        console.log('VR supported – button added');
      } else {
        console.log('VR not supported – using normal 3D view');
        const info = document.createElement('div');
        info.textContent = 'VR not available – use mouse/touch to explore';
        info.style.position = 'absolute';
        info.style.bottom = '10px';
        info.style.left = '10px';
        info.style.color = 'white';
        info.style.background = 'rgb(255, 255, 255)';
        info.style.padding = '8px';
        info.style.borderRadius = '4px';
        container.appendChild(info);
      }
    } catch (err) {
      console.error('Error checking VR support:', err);
    }
  } else {
    console.log('WebXR API not available');
  }

  // Animation loop
  renderer.setAnimationLoop(() => {
    controls.update(); // Needed for damping

    // In animation loop (replace the clamp block):
    // if (paddedBounds) {
    //   camera.position.clamp(paddedBounds.min, paddedBounds.max);
    // }

    // ── Simple Camera Constraints (for both normal/VR) ──
    // Clamp position to model bounds (prevents flying outside; adjust padding)
    // if (modelBounds) {
    //   const padding = 0.1; // Small buffer to avoid wall clipping
    //   camera.position.clamp(
    //     modelBounds.min.clone().addScalar(padding),
    //     modelBounds.max.clone().subtractScalar(padding)
    //   );
    // }

    renderer.render(scene, camera);
  });

  // Resize handler (unchanged)
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Cleanup (unchanged)
  return () => {
    renderer.dispose();
    if (vrButton) vrButton.remove();
  };
}