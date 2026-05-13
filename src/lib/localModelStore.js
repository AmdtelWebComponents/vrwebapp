const DB_NAME = 'vrwebapp';
const STORE_NAME = 'models';
const LOCAL_MODEL_KEY = 'localModel';
const LOCAL_MODEL_NAME_KEY = 'localModelName';

function openModelDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const { result } = request;
      if (!result.objectStoreNames.contains(STORE_NAME)) {
        result.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalModelFile(file) {
  const buffer = await file.arrayBuffer();
  const db = await openModelDB();

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(buffer, LOCAL_MODEL_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  sessionStorage.setItem(LOCAL_MODEL_NAME_KEY, file.name);
}

export async function readLocalModelBlobUrl() {
  try {
    const db = await openModelDB();
    const buffer = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(LOCAL_MODEL_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });

    if (!buffer) return null;
    return URL.createObjectURL(new Blob([buffer], { type: 'model/gltf-binary' }));
  } catch {
    return null;
  }
}

export function getLocalRoomShell() {
  const name = sessionStorage.getItem(LOCAL_MODEL_NAME_KEY) || 'Local Model';
  if (!sessionStorage.getItem(LOCAL_MODEL_NAME_KEY)) return null;

  return {
    id: '__local__',
    name,
    description: 'Loaded from your device.',
    modelUrl: '',
    scale: 1,
    cameraPosition: [0, 1.6, -2],
    target: [0, 1.6, 5],
    isMock: false
  };
}
