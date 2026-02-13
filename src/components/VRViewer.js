import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

export async function initVRViewer(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Basic lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 7.5);
  scene.add(dirLight);

  // HDR environment
  const hdrLoader = new HDRLoader();
  hdrLoader.load('/hdr/autumn_hill_view_1k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture; // optional
  });

  // Model loader with Draco
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');
  const loader = new GLTFLoader().setDRACOLoader(dracoLoader);

  loader.load('/models/kellyburn_Room_Livingroom.glb', (gltf) => {
    const model = gltf.scene;

    // Center the model at world origin
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // Position camera inside at eye height, looking toward bay window
    camera.position.set(0, 0.6, -2);           // eye level, roughly center
    // Look forward along +Z; adjust vector to point at bay window
    controls.target.set(0, 1, 5);           // look +Z direction
    // Alternative: if bay is on -Z, +X, etc.:
    // controls.target.set(0, 1.6, -5);       // look -Z
    // controls.target.set(5, 1.6, 0);        // look +X
    // Or rotate camera yaw 90° if needed:
    // camera.rotation.y = Math.PI / 2;

    scene.add(model);
  }, undefined, (err) => console.error('Model load error:', err));

  // Basic OrbitControls – full freedom, no limits
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;     // snappy response (set true if you prefer smoothing)
  controls.enablePan = true;          // allow panning (right-click drag or two-finger)
  controls.enableZoom = true;
  controls.enableRotate = true;
  // No min/max distance, no polar/azimuth limits → full movement freedom

  // VR button (conditional)
  let vrButton = null;
  if ('xr' in navigator) {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
      if (supported) {
        vrButton = VRButton.createButton(renderer);
        vrButton.style.position = 'absolute';
        vrButton.style.bottom = '20px';
        vrButton.style.left = '50%';
        vrButton.style.transform = 'translateX(-50%)';
        container.appendChild(vrButton);
      } else {
        const info = document.createElement('div');
        info.textContent = 'VR not supported – use mouse/touch';
        info.style.position = 'absolute';
        info.style.bottom = '10px';
        info.style.left = '10px';
        info.style.color = 'white';
        info.style.background = 'rgba(0,0,0,0.6)';
        info.style.padding = '8px 12px';
        info.style.borderRadius = '6px';
        container.appendChild(info);
      }
    }).catch(console.error);
  }

  // Render loop
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  // Handle resize
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  // Cleanup function
  return () => {
    window.removeEventListener('resize', onResize);
    renderer.dispose();
    if (vrButton) vrButton.remove();
  };
}