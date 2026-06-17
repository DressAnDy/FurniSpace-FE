import {
  ArcRotateCamera,
  Color3,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Tools,
  Vector3,
} from 'babylonjs';

export type RoomGridOptions = {
  axisColor?: string;
  cellSize?: number;
  floorColor?: string;
  gridColor?: string;
};

export function createDefaultCamera(scene: Scene, canvas: HTMLCanvasElement) {
  const camera = new ArcRotateCamera(
    'furnispace-camera',
    Tools.ToRadians(45),
    Tools.ToRadians(62),
    7,
    Vector3.Zero(),
    scene,
  );

  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 1.4;
  camera.upperRadiusLimit = 28;
  camera.wheelDeltaPercentage = 0.01;
  camera.panningSensibility = 60;

  return camera;
}

export function createDefaultLighting(scene: Scene) {
  const light = new HemisphericLight('furnispace-hemi-light', new Vector3(0.4, 1, 0.2), scene);
  light.intensity = 0.88;

  return light;
}

export function createRoomGrid(
  scene: Scene,
  width = 8,
  depth = 8,
  options: RoomGridOptions = {},
) {
  const groundMaterial = new StandardMaterial('furnispace-ground-material', scene);
  groundMaterial.diffuseColor = Color3.FromHexString(options.floorColor ?? '#f2f5f1');
  groundMaterial.specularColor = Color3.Black();

  const ground = MeshBuilder.CreateGround(
    'furnispace-room-ground',
    { height: depth, subdivisions: 1, width },
    scene,
  );
  ground.material = groundMaterial;
  ground.metadata = {
    kind: 'floor',
  };

  const gridColor = Color3.FromHexString(options.gridColor ?? '#bcc9c1');
  const axisColor = Color3.FromHexString(options.axisColor ?? '#7f958b');
  const cellSize = options.cellSize ?? 0.5;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  for (let x = -halfWidth; x <= halfWidth + 0.001; x += cellSize) {
    const line = MeshBuilder.CreateLines(
      `furnispace-grid-x-${x.toFixed(2)}`,
      {
        points: [
          new Vector3(x, 0.006, -halfDepth),
          new Vector3(x, 0.006, halfDepth),
        ],
      },
      scene,
    );
    line.color = Math.abs(x) < 0.001 ? axisColor : gridColor;
    line.isPickable = false;
  }

  for (let z = -halfDepth; z <= halfDepth + 0.001; z += cellSize) {
    const line = MeshBuilder.CreateLines(
      `furnispace-grid-z-${z.toFixed(2)}`,
      {
        points: [
          new Vector3(-halfWidth, 0.006, z),
          new Vector3(halfWidth, 0.006, z),
        ],
      },
      scene,
    );
    line.color = Math.abs(z) < 0.001 ? axisColor : gridColor;
    line.isPickable = false;
  }

  return ground;
}

export function createDemoFurniture(scene: Scene) {
  const wood = new StandardMaterial('demo-wood-material', scene);
  wood.diffuseColor = Color3.FromHexString('#8a5a3b');

  const fabric = new StandardMaterial('demo-fabric-material', scene);
  fabric.diffuseColor = Color3.FromHexString('#356859');

  const accent = new StandardMaterial('demo-accent-material', scene);
  accent.diffuseColor = Color3.FromHexString('#c87b5a');

  const tableTop = MeshBuilder.CreateBox('demo-table-top', { depth: 1.4, height: 0.16, width: 2.2 }, scene);
  tableTop.position = new Vector3(0, 0.86, 0);
  tableTop.material = wood;

  [-0.9, 0.9].forEach((x) => {
    [-0.48, 0.48].forEach((z) => {
      const leg = MeshBuilder.CreateBox(`demo-table-leg-${x}-${z}`, { depth: 0.12, height: 0.76, width: 0.12 }, scene);
      leg.position = new Vector3(x, 0.42, z);
      leg.material = wood;
    });
  });

  const sofaSeat = MeshBuilder.CreateBox('demo-sofa-seat', { depth: 0.9, height: 0.32, width: 1.8 }, scene);
  sofaSeat.position = new Vector3(-2.1, 0.38, -1.5);
  sofaSeat.material = fabric;

  const sofaBack = MeshBuilder.CreateBox('demo-sofa-back', { depth: 0.2, height: 0.8, width: 1.8 }, scene);
  sofaBack.position = new Vector3(-2.1, 0.78, -1.9);
  sofaBack.material = fabric;

  const lamp = MeshBuilder.CreateCylinder('demo-lamp', { diameter: 0.36, height: 1.25 }, scene);
  lamp.position = new Vector3(2.2, 0.64, -1.2);
  lamp.material = accent;

  return [tableTop, sofaSeat, sofaBack, lamp];
}
