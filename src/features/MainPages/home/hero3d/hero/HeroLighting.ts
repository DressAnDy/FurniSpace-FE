import {
  Color3,
  DirectionalLight,
  GlowLayer,
  HemisphericLight,
  ShadowGenerator,
  Vector3,
} from 'babylonjs';

export function createHeroLighting(scene: import('babylonjs').Scene) {
  const ambient = new HemisphericLight('home-hero-ambient-light', new Vector3(0.05, 1, 0.15), scene);
  ambient.intensity = 0.62;
  ambient.diffuse = Color3.FromHexString('#fff8ef');
  ambient.groundColor = Color3.FromHexString('#d7c7b8');

  const key = new DirectionalLight('home-hero-key-light', new Vector3(-0.4, -1, 0.3), scene);
  key.position = new Vector3(4, 6, -4);
  key.intensity = 1.18;
  key.diffuse = Color3.FromHexString('#fff1dd');

  const fill = new DirectionalLight('home-hero-cool-fill-light', new Vector3(0.55, -0.7, -0.25), scene);
  fill.position = new Vector3(-5, 4, 4);
  fill.intensity = 0.34;
  fill.diffuse = Color3.FromHexString('#dce9ff');

  const rim = new DirectionalLight('home-hero-rim-light', new Vector3(0.18, -0.45, 0.9), scene);
  rim.position = new Vector3(0, 3, -6);
  rim.intensity = 0.22;
  rim.diffuse = Color3.FromHexString('#fff8ed');

  const shadows = new ShadowGenerator(1024, key);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 24;

  const glow = new GlowLayer('home-hero-glow', scene, { blurKernelSize: 32 });
  glow.intensity = 0;

  return {
    addShadowCasters(meshes: import('babylonjs').AbstractMesh[]) {
      meshes.forEach((mesh) => {
        if (mesh.getTotalVertices() > 0) shadows.addShadowCaster(mesh);
      });
    },
    setHighlight(progress: number) {
      glow.intensity = progress > 0 ? 0.08 + Math.sin(progress * Math.PI) * 0.08 : 0;
    },
  };
}
