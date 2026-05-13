import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

const MATERIAL_PRESETS = {
  matte: { roughness: 0.9, metalness: 0 },
  satin: { roughness: 0.55, metalness: 0.02 },
  gloss: { roughness: 0.2, metalness: 0.05 },
  concrete: { roughness: 0.95, metalness: 0 },
  'brushed-metal': { roughness: 0.35, metalness: 0.85 }
};

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function disposeMaterial(material) {
  if (!material) return;

  const keys = Object.keys(material);
  for (const key of keys) {
    const value = material[key];
    if (value && typeof value === 'object' && value.isTexture) {
      value.dispose();
    }
  }

  material.dispose();
}

function disposeObject3D(root) {
  root.traverse((node) => {
    if (node.geometry) {
      node.geometry.dispose();
    }

    if (Array.isArray(node.material)) {
      node.material.forEach(disposeMaterial);
    } else if (node.material) {
      disposeMaterial(node.material);
    }
  });
}

function fitModelToOrigin(model) {
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());

  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= bounds.min.y;
}

function detectSurfaceGroup(mesh, material) {
  const source = [mesh.name, mesh.parent?.name, material?.name].filter(Boolean).join(' ').toLowerCase();

  if (source.includes('wall') || source.includes('partition') || source.includes('drywall') || source.includes('plaster')) {
    return 'walls';
  }

  if (source.includes('ceiling') || source.includes('ceil') || source.includes('roof')) {
    return 'ceiling';
  }

  if (source.includes('floor') || source.includes('ground') || source.includes('tile') || source.includes('carpet') || source.includes('rug')) {
    return 'floor';
  }

  return 'objects';
}

function createMaterialSnapshot(material) {
  return {
    color: material.color ? `#${material.color.getHexString()}` : null,
    roughness: typeof material.roughness === 'number' ? material.roughness : null,
    metalness: typeof material.metalness === 'number' ? material.metalness : null
  };
}

function applyMaterialValues(material, values = {}) {
  if (values.preset && MATERIAL_PRESETS[values.preset]) {
    const preset = MATERIAL_PRESETS[values.preset];
    if (typeof material.roughness === 'number') material.roughness = preset.roughness;
    if (typeof material.metalness === 'number') material.metalness = preset.metalness;
  }

  if (values.color && material.color) {
    material.color.set(values.color);
  }

  if (typeof values.roughness === 'number' && typeof material.roughness === 'number') {
    material.roughness = clamp01(values.roughness);
  }

  if (typeof values.metalness === 'number' && typeof material.metalness === 'number') {
    material.metalness = clamp01(values.metalness);
  }

  material.needsUpdate = true;
}

function makeSummary(surfaceGroups) {
  return {
    all: surfaceGroups.all.length,
    walls: surfaceGroups.walls.length,
    ceiling: surfaceGroups.ceiling.length,
    floor: surfaceGroups.floor.length,
    objects: surfaceGroups.objects.length
  };
}

export async function initVRViewer(container, options = {}) {
  const {
    initialRoom,
    onRoomChange = () => {}
  } = options;

  if (!initialRoom?.modelUrl) {
    throw new Error('initVRViewer requires an initialRoom with modelUrl.');
  }

  let disposed = false;
  let currentModel = null;
  let currentRoom = null;
  let environmentTexture = null;
  let loadToken = 0;
  let vrSupported = false;

  const surfaceGroups = {
    all: [],
    walls: [],
    ceiling: [],
    floor: [],
    objects: []
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);

  // Request an XR-compatible context at creation time so Three.js never needs
  // the async makeXRCompatible() call mid-session, which can invalidate the XRSession.
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { xrCompatible: true })
          ?? canvas.getContext('webgl', { xrCompatible: true });

  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas, context: gl });
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  const directional = new THREE.DirectionalLight(0xffffff, 1);
  directional.position.set(5, 10, 7.5);
  scene.add(ambient, directional);

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('/draco/');
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  const hdrLoader = new HDRLoader();
  hdrLoader.load(
    '/hdr/autumn_hill_view_1k.hdr',
    (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      environmentTexture = texture;
      scene.environment = texture;
      scene.background = texture;
    },
    undefined,
    (error) => {
      console.error('Failed to load HDR environment:', error);
    }
  );

  const onSessionStart = () => {
    controls.enabled = false;
  };

  const onSessionEnd = () => {
    controls.enabled = true;
  };

  renderer.xr.addEventListener('sessionstart', onSessionStart);
  renderer.xr.addEventListener('sessionend', onSessionEnd);

  if ('xr' in navigator) {
    navigator.xr
      .isSessionSupported('immersive-vr')
      .then((supported) => { vrSupported = supported && !disposed; })
      .catch(() => {});
  }

  function clearSurfaceGroups() {
    surfaceGroups.all = [];
    surfaceGroups.walls = [];
    surfaceGroups.ceiling = [];
    surfaceGroups.floor = [];
    surfaceGroups.objects = [];
  }

  function indexEditableSurfaces(model) {
    clearSurfaceGroups();

    model.traverse((node) => {
      if (!node.isMesh || !node.material) return;

      const materials = Array.isArray(node.material) ? node.material : [node.material];
      const clonedMaterials = [];

      materials.forEach((material, index) => {
        if (!material) return;

        const editableMaterial = material.clone();
        const groupId = detectSurfaceGroup(node, editableMaterial);
        const entry = {
          material: editableMaterial,
          snapshot: createMaterialSnapshot(editableMaterial)
        };

        surfaceGroups.all.push(entry);
        if (surfaceGroups[groupId]) {
          surfaceGroups[groupId].push(entry);
        } else {
          surfaceGroups.objects.push(entry);
        }

        clonedMaterials[index] = editableMaterial;
      });

      node.material = Array.isArray(node.material) ? clonedMaterials : clonedMaterials[0];
    });
  }

  function getGroupEntries(groupId = 'all') {
    return surfaceGroups[groupId] || [];
  }

  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function applyRoomView(room) {
    const [camX, camY, camZ] = room.cameraPosition || [0, 1.6, -2];
    const [targetX, targetY, targetZ] = room.target || [0, 1.6, 5];
    camera.position.set(camX, camY, camZ);
    controls.target.set(targetX, targetY, targetZ);
    controls.update();
  }

  async function loadRoom(room) {
    if (disposed || !room?.modelUrl) return;

    currentRoom = room;
    const token = ++loadToken;

    try {
      const gltf = await gltfLoader.loadAsync(room.modelUrl);
      if (disposed || token !== loadToken) {
        disposeObject3D(gltf.scene);
        return;
      }

      if (currentModel) {
        scene.remove(currentModel);
        disposeObject3D(currentModel);
        currentModel = null;
      }

      const model = gltf.scene;
      model.scale.setScalar(room.scale ?? 1);
      fitModelToOrigin(model);
      indexEditableSurfaces(model);
      scene.add(model);

      currentModel = model;
      applyRoomView(room);
      onRoomChange(room);
    } catch (error) {
      console.error(`Failed to load model for room "${room.id}":`, error);
    }
  }

  window.addEventListener('resize', resize);
  resize();

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });

  await loadRoom(initialRoom);

  return {
    loadRoom,
    getCurrentRoom: () => currentRoom,
    getEditableSurfaceSummary() {
      return makeSummary(surfaceGroups);
    },
    setSurfaceAppearance(groupId, values = {}) {
      const entries = getGroupEntries(groupId);
      for (const entry of entries) {
        applyMaterialValues(entry.material, values);
      }
      return { updated: entries.length };
    },
    resetSurfaceAppearance(groupId = 'all') {
      const entries = getGroupEntries(groupId);
      for (const entry of entries) {
        applyMaterialValues(entry.material, {
          color: entry.snapshot.color,
          roughness: entry.snapshot.roughness,
          metalness: entry.snapshot.metalness
        });
      }
      return { updated: entries.length };
    },
    dispose() {
      if (disposed) return;
      disposed = true;

      window.removeEventListener('resize', resize);
      renderer.xr.removeEventListener('sessionstart', onSessionStart);
      renderer.xr.removeEventListener('sessionend', onSessionEnd);
      renderer.setAnimationLoop(null);

      clearSurfaceGroups();

      if (currentModel) {
        scene.remove(currentModel);
        disposeObject3D(currentModel);
        currentModel = null;
      }

      if (environmentTexture) {
        environmentTexture.dispose();
        environmentTexture = null;
      }

      controls.dispose();
      dracoLoader.dispose();
      renderer.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    },
    isVRSupported: () => vrSupported,
    async startVRSession(onStart, onEnd) {
      if (!vrSupported || renderer.xr.isPresenting) return;
      try {
        const session = await navigator.xr.requestSession('immersive-vr', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['bounded-floor', 'hand-tracking']
        });
        // Three.js evaluates `supportsLayers` inside setSession as:
        //   supportsGlBinding && 'createProjectionLayer' in XRWebGLBinding.prototype
        // supportsGlBinding is locked at module load time and will be true when
        // the webxr-polyfill is present. The polyfill also adds createProjectionLayer
        // to XRWebGLBinding.prototype, making supportsLayers=true, which causes
        // new XRWebGLBinding(polyfillSession, gl) to throw for polyfilled sessions.
        // Fix: temporarily remove createProjectionLayer before setSession so
        // Three.js takes the safe XRWebGLLayer path instead.
        const xrBinding = typeof XRWebGLBinding !== 'undefined' ? XRWebGLBinding : null;
        const savedCreateProjectionLayer = xrBinding?.prototype.createProjectionLayer;
        if (xrBinding && savedCreateProjectionLayer) {
          delete xrBinding.prototype.createProjectionLayer;
        }
        try {
          await renderer.xr.setSession(session);
        } finally {
          if (xrBinding && savedCreateProjectionLayer) {
            xrBinding.prototype.createProjectionLayer = savedCreateProjectionLayer;
          }
        }
        onStart?.();
        session.addEventListener('end', () => onEnd?.(), { once: true });
      } catch (error) {
        console.error('Failed to start VR session:', error);
      }
    }
  };
}
