import { Color4, CubeTexture, Scene } from 'babylonjs';

import { createHeroCamera } from '@/features/MainPages/home/hero3d/hero/HeroCamera';
import { createHeroLighting } from '@/features/MainPages/home/hero3d/hero/HeroLighting';

export function createHeroScene(engine: import('babylonjs').Engine) {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);
  scene.skipPointerMovePicking = true;
  const environmentUrl = import.meta.env.VITE_HERO_HDR_URL;
  if (environmentUrl) {
    scene.environmentTexture = CubeTexture.CreateFromPrefilteredData(environmentUrl, scene);
    scene.environmentIntensity = 0.8;
  }
  createHeroCamera(scene);
  const lighting = createHeroLighting(scene);
  return { lighting, scene };
}
