import { useEffect, useRef, useState } from 'react';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  Scene,
  SceneLoader,
  Tools,
  TransformNode,
  Vector3,
} from 'babylonjs';
import 'babylonjs-loaders';

type GalleryModel = {
  label: string;
  path: string;
};

const GALLERY_MODELS: GalleryModel[] = [
  { label: 'Sofa', path: '/assets/models/hero/Sofa.glb' },
  { label: 'Coffee Table', path: '/assets/models/hero/CoffeeTable.glb' },
  { label: 'Accent Chair', path: '/assets/models/hero/AccentChair.glb' },
  { label: 'Marble Side Table', path: '/assets/models/hero/MarbleSideTable.glb' },
];

export function HomeModelGallery() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const modelRootRef = useRef<TransformNode | null>(null);
  const loadTokenRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % GALLERY_MODELS.length);
    }, 5200);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      preserveDrawingBuffer: false,
      stencil: false,
    });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0, 0, 0, 0);
    scene.skipPointerMovePicking = true;
    sceneRef.current = scene;

    const camera = new ArcRotateCamera(
      'intro-model-gallery-camera',
      Tools.ToRadians(18),
      Tools.ToRadians(78),
      5.8,
      new Vector3(0, 0.15, 0),
      scene,
    );
    camera.fov = Tools.ToRadians(32);
    camera.detachControl();

    const ambient = new HemisphericLight('intro-model-gallery-ambient', new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.78;
    ambient.diffuse = Color3.FromHexString('#fff3df');
    ambient.groundColor = Color3.FromHexString('#3a332d');

    const key = new DirectionalLight('intro-model-gallery-key', new Vector3(-0.45, -0.9, 0.35), scene);
    key.position = new Vector3(4, 5, -4);
    key.intensity = 1.15;
    key.diffuse = Color3.FromHexString('#ffe7c2');

    const fill = new DirectionalLight('intro-model-gallery-fill', new Vector3(0.55, -0.65, -0.35), scene);
    fill.position = new Vector3(-4, 4, 4);
    fill.intensity = 0.36;
    fill.diffuse = Color3.FromHexString('#dbe8ff');

    const renderLoop = () => {
      const root = modelRootRef.current;
      if (root) root.rotation.y += 0.006;
      scene.render();
    };

    engine.runRenderLoop(renderLoop);

    const resize = () => engine.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement ?? canvas);
    window.addEventListener('resize', resize);
    setSceneReady(true);

    return () => {
      setSceneReady(false);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      engine.stopRenderLoop(renderLoop);
      scene.dispose();
      engine.dispose();
      sceneRef.current = null;
      modelRootRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !isSceneReady) return undefined;

    let cancelled = false;
    const token = loadTokenRef.current + 1;
    loadTokenRef.current = token;
    const model = GALLERY_MODELS[activeIndex];

    modelRootRef.current?.dispose();
    modelRootRef.current = null;

    void SceneLoader.ImportMeshAsync('', '', model.path, scene)
      .then((result) => {
        if (cancelled || loadTokenRef.current !== token) {
          result.meshes.forEach((mesh) => mesh.dispose());
          result.transformNodes.forEach((node) => node.dispose());
          return;
        }

        const root = new TransformNode(`intro-gallery-root-${model.label}`, scene);
        const meshes = result.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && mesh.getTotalVertices() > 0);

        if (!meshes.length) {
          root.dispose();
          return;
        }

        const bounds = meshes.reduce((current, mesh) => {
          const meshBounds = mesh.getHierarchyBoundingVectors(true);
          return {
            max: Vector3.Maximize(current.max, meshBounds.max),
            min: Vector3.Minimize(current.min, meshBounds.min),
          };
        }, {
          max: new Vector3(-Infinity, -Infinity, -Infinity),
          min: new Vector3(Infinity, Infinity, Infinity),
        });
        const center = bounds.min.add(bounds.max).scale(0.5);
        const size = bounds.max.subtract(bounds.min);
        const maxDimension = Math.max(size.x, size.y, size.z, 0.001);

        [...result.transformNodes, ...result.meshes].forEach((node) => {
          if (!node.parent && node !== root) {
            node.parent = root;
            node.position.subtractInPlace(center);
          }
        });

        root.scaling.setAll(2.35 / maxDimension);
        root.rotation.y = Tools.ToRadians(-18);
        root.position.y = 0;
        modelRootRef.current = root;
      })
      .catch((error: unknown) => {
        console.warn(`Unable to load intro gallery model: ${model.label}`, error);
      });

    return () => {
      cancelled = true;
    };
  }, [activeIndex, isSceneReady]);

  const activeModel = GALLERY_MODELS[activeIndex];

  return (
    <div className="home-gallery" aria-label="Furniture model gallery">
      <div className="home-gallery-stage">
        <canvas
          ref={canvasRef}
          className="home-gallery-canvas"
          aria-label={`${activeModel.label} 3D preview`}
        />
      </div>

      <div className="home-gallery-meta">
        <p>3D Preview</p>
        <h3>{activeModel.label}</h3>
      </div>

      <div className="home-gallery-controls" aria-label="Choose furniture model">
        {GALLERY_MODELS.map((model, index) => (
          <button
            key={model.path}
            aria-label={`Show ${model.label}`}
            aria-pressed={index === activeIndex}
            className="home-gallery-dot"
            onClick={() => setActiveIndex(index)}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
