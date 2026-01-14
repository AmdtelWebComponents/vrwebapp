import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

export async function initVRViewer(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true; // Still enable XR on renderer (harmless if not used)
  container.appendChild(renderer.domElement);

  // Lights, model loading, etc. (as before)
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  // ── Setup Draco + GLTF ──
  const dracoLoader = new DRACOLoader();
  
  // Option 1: Use node_modules path (recommended for Astro/Vite builds)
  // dracoLoader.setDecoderPath('/node_modules/three/examples/jsm/libs/draco/gltf/');
  
  // Option 2: If the above 404s in production, copy the draco folder to public/draco/ and use:
  dracoLoader.setDecoderPath('/draco/');  // or process.env.PUBLIC_URL + '/draco/' if needed
  
  dracoLoader.setDecoderConfig({ type: 'js' });  // 'js' is reliable; 'wasm' is faster but needs extra setup
  
  dracoLoader.preload();  // Optional but good practice – warms up the decoder

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  loader.load('/models/kellyburn.glb', (gltf) => {
    scene.add(gltf.scene);
    console.log('Model loaded successfully');
    // Optional: Center/scale model if needed
    // gltf.scene.position.set(0, 0, 0);
    // gltf.scene.scale.set(1, 1, 1);
  }, undefined, (error) => {
    console.error('Error loading GLB:', error);
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  camera.position.set(0, 1.6, 5); // Good eye-level starting point

  // VR support check + conditional button
  let vrButton = null;
  if ('xr' in navigator) {
    try {
      const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
      if (isSupported) {
        vrButton = VRButton.createButton(renderer);
        // Optional: Customize button text/style
        vrButton.style.position = 'absolute';
        vrButton.style.bottom = '20px';
        vrButton.style.left = '50%';
        vrButton.style.transform = 'translateX(-50%)';
        container.appendChild(vrButton); // Or document.body if preferred
        console.log('VR supported – button added');
      } else {
        console.log('VR not supported on this device/browser – using normal 3D view');
        // Optional: Add a small info message
        const info = document.createElement('div');
        info.textContent = 'VR not available – use mouse/touch to explore';
        info.style.position = 'absolute';
        info.style.bottom = '10px';
        info.style.left = '10px';
        info.style.color = 'white';
        info.style.background = 'rgba(0,0,0,0.5)';
        info.style.padding = '8px';
        info.style.borderRadius = '4px';
        container.appendChild(info);
      }
    } catch (err) {
      console.error('Error checking VR support:', err);
    }
  } else {
    console.log('WebXR API not available in this browser');
  }

  // Animation loop (handles both normal and XR rendering)
  renderer.setAnimationLoop(() => {
    // Your other per-frame logic here (e.g., controls.update() if not damping)
    renderer.render(scene, camera);
  });

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Cleanup
  return () => {
    renderer.dispose();
    if (vrButton) vrButton.remove();
  };
}