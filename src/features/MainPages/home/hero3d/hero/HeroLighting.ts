import {
  Color3,
  DirectionalLight,
  GlowLayer,
  HemisphericLight,
  ShadowGenerator,
  Vector3,
} from 'babylonjs';

export function createHeroLighting(scene: import('babylonjs').Scene) {
  const fill = new HemisphericLight('home-hero-fill-light', new Vector3(0.1, 1, 0.2), scene);
  fill.intensity = 1.05;
  fill.diffuse = Color3.FromHexString('#fff7ed');
  fill.groundColor = Color3.FromHexString('#cbb49b');

  const key = new DirectionalLight('home-hero-key-light', new Vector3(-0.4, -1, 0.3), scene);
  key.position = new Vector3(4, 7, -5);
  key.intensity = 1.35;
  key.diffuse = Color3.FromHexString('#fff1dd');

  const shadows = new ShadowGenerator(1024, key);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 16;

  const glow = new GlowLayer('home-hero-glow', scene, { blurKernelSize: 32 });
  glow.intensity = 0;

  return {
    addShadowCasters(meshes: import('babylonjs').AbstractMesh[]) {
      meshes.forEach((mesh) => {
        if (mesh.getTotalVertices() > 0) shadows.addShadowCaster(mesh);
      });
    },
    setHighlight(progress: number) {
      glow.intensity = progress > 0 ? 0.18 + Math.sin(progress * Math.PI) * 0.16 : 0;
    },
  };
}
