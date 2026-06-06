import {
  ArcRotateCamera,
  Color3,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Observable,
  Scene,
  SceneLoader,
  StandardMaterial,
  Tools,
  Vector3,
} from 'babylonjs';
import 'babylonjs-loaders';

export type CameraMode = 'orbit' | 'front' | 'top';

export type SceneManagerEvent =
  | { type: 'ready'; scene: Scene }
  | { type: 'model-loading'; url: string }
  | { type: 'model-loaded'; meshes: Mesh[]; url: string }
  | { type: 'error'; error: Error };

export class SceneManager {
  private static instance: SceneManager | null = null;

  private camera: ArcRotateCamera | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private engine: Engine | null = null;
  private renderLoop: (() => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private scene: Scene | null = null;

  readonly events = new Observable<SceneManagerEvent>();

  private constructor() {}

  static getInstance() {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }

    return SceneManager.instance;
  }

  init(canvas: HTMLCanvasElement) {
    if (this.engine && this.scene && this.canvas === canvas) {
      return this.scene;
    }

    this.dispose();

    this.canvas = canvas;
    this.engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      preserveDrawingBuffer: true,
      stencil: true,
    });
    this.scene = new Scene(this.engine);
    this.scene.clearColor.set(0.96, 0.97, 0.95, 1);

    this.camera = new ArcRotateCamera(
      'viewer-camera',
      Tools.ToRadians(45),
      Tools.ToRadians(65),
      6,
      Vector3.Zero(),
      this.scene,
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 1.5;
    this.camera.upperRadiusLimit = 20;
    this.camera.wheelDeltaPercentage = 0.01;

    this.setEnvironment();

    this.renderLoop = () => {
      this.scene?.render();
    };
    this.engine.runRenderLoop(this.renderLoop);

    this.resizeHandler = () => {
      this.engine?.resize();
    };
    window.addEventListener('resize', this.resizeHandler);

    this.events.notifyObservers({ type: 'ready', scene: this.scene });

    return this.scene;
  }

  dispose() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    if (this.engine && this.renderLoop) {
      this.engine.stopRenderLoop(this.renderLoop);
    }

    this.scene?.dispose();
    this.engine?.dispose();

    this.camera = null;
    this.canvas = null;
    this.engine = null;
    this.renderLoop = null;
    this.resizeHandler = null;
    this.scene = null;
  }

  async loadModel(url: string) {
    const scene = this.assertScene();

    try {
      this.events.notifyObservers({ type: 'model-loading', url });

      const result = await SceneLoader.ImportMeshAsync('', '', url, scene);
      const meshes = result.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh);

      this.frameMeshes(meshes);
      this.events.notifyObservers({ type: 'model-loaded', meshes, url });

      return meshes;
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error('Unable to load model.');

      this.events.notifyObservers({ type: 'error', error });
      throw error;
    }
  }

  setEnvironment() {
    const scene = this.assertScene();

    if (!scene.getMeshByName('viewer-demo-ground')) {
      const groundMaterial = new StandardMaterial('viewer-ground-material', scene);
      groundMaterial.diffuseColor = Color3.FromHexString('#dfe4da');
      groundMaterial.specularColor = Color3.Black();

      const ground = MeshBuilder.CreateGround(
        'viewer-demo-ground',
        { height: 8, width: 8 },
        scene,
      );
      ground.material = groundMaterial;
    }

    if (!scene.getMeshByName('viewer-demo-box')) {
      const boxMaterial = new StandardMaterial('viewer-box-material', scene);
      boxMaterial.diffuseColor = Color3.FromHexString('#356859');

      const box = MeshBuilder.CreateBox(
        'viewer-demo-box',
        { size: 1 },
        scene,
      );
      box.position = new Vector3(-0.8, 0.5, 0);
      box.material = boxMaterial;
    }

    if (!scene.getMeshByName('viewer-demo-sphere')) {
      const sphereMaterial = new StandardMaterial('viewer-sphere-material', scene);
      sphereMaterial.diffuseColor = Color3.FromHexString('#b85c38');

      const sphere = MeshBuilder.CreateSphere(
        'viewer-demo-sphere',
        { diameter: 0.8, segments: 32 },
        scene,
      );
      sphere.position = new Vector3(0.85, 0.4, 0.15);
      sphere.material = sphereMaterial;
    }

    const existingLight = scene.getLightByName('viewer-key-light');

    if (!existingLight) {
      const light = new HemisphericLight(
        'viewer-key-light',
        new Vector3(0, 1, 0),
        scene,
      );
      light.intensity = 0.8;
    }
  }

  setCameraMode(mode: CameraMode) {
    const camera = this.assertCamera();

    if (mode === 'front') {
      camera.alpha = Tools.ToRadians(90);
      camera.beta = Tools.ToRadians(90);
    }

    if (mode === 'top') {
      camera.alpha = Tools.ToRadians(90);
      camera.beta = Tools.ToRadians(10);
    }

    if (mode === 'orbit') {
      camera.alpha = Tools.ToRadians(45);
      camera.beta = Tools.ToRadians(65);
    }
  }

  private frameMeshes(meshes: Mesh[]) {
    if (!meshes.length || !this.camera) {
      return;
    }

    const bounds = meshes.reduce<{
      max: Vector3;
      min: Vector3;
    } | null>((currentBounds, mesh) => {
      const meshBounds = mesh.getHierarchyBoundingVectors(true);

      if (!currentBounds) {
        return meshBounds;
      }

      return {
        max: Vector3.Maximize(currentBounds.max, meshBounds.max),
        min: Vector3.Minimize(currentBounds.min, meshBounds.min),
      };
    }, null);

    if (!bounds) {
      return;
    }

    const center = bounds.min.add(bounds.max).scale(0.5);
    const size = bounds.max.subtract(bounds.min).length();

    this.camera.setTarget(center);
    this.camera.radius = Math.max(size * 1.4, 2);
  }

  private assertCamera() {
    if (!this.camera) {
      throw new Error('Babylon camera has not been initialized.');
    }

    return this.camera;
  }

  private assertScene() {
    if (!this.scene) {
      throw new Error('Babylon scene has not been initialized.');
    }

    return this.scene;
  }
}
