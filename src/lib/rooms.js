export const rooms = [
  {
    id: 'living-room',
    name: 'Living Room',
    description: 'Primary room capture. Baseline model used for initial tuning.',
    modelUrl: '/models/kellyburn_Room_Livingroom.glb',
    scale: 10,
    cameraPosition: [0, 1.6, -2],
    target: [0, 1.6, 5],
    isMock: false
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    description: 'Mock room entry to validate routing and viewer switching.',
    modelUrl: '/models/kellyburn_Room_Livingroom.glb',
    scale: 10,
    cameraPosition: [1.2, 1.6, -1.8],
    target: [0, 1.6, 3],
    isMock: true
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    description: 'Mock room entry ready for a dedicated model when available.',
    modelUrl: '/models/kellyburn_Room_Livingroom.glb',
    scale: 10,
    cameraPosition: [-1.2, 1.6, -2.2],
    target: [0, 1.6, 2.5],
    isMock: true
  }
];
