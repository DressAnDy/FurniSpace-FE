import { ArcRotateCamera, Tools, Vector3 } from 'babylonjs';

import type { HeroCompositionBounds, HeroObject } from '@/features/MainPages/home/hero3d/types';

export function createHeroCamera(scene: import('babylonjs').Scene, canvas: HTMLCanvasElement) {
  const camera = new ArcRotateCamera(
    'home-hero-camera',
    Tools.ToRadians(0),
    Tools.ToRadians(88),
    8,
    Vector3.Zero(),
    scene,
  );

  camera.fov = Tools.ToRadians(30);
  camera.detachControl();
  camera.lowerAlphaLimit = camera.alpha;
  camera.upperAlphaLimit = camera.alpha;
  camera.lowerBetaLimit = Tools.ToRadians(86);
  camera.upperBetaLimit = Tools.ToRadians(90);
  camera.lowerRadiusLimit = 1.2;
  camera.wheelPrecision = 90;
  camera.panningSensibility = 0;
  return camera;
}

export function frameHeroCamera(
  camera: ArcRotateCamera,
  objects: HeroObject[],
  compositionBounds?: HeroCompositionBounds | null,
  _heroObject?: HeroObject | null,
) {
  const meshes = objects.flatMap((object) => object.meshes).filter((mesh) => mesh.getTotalVertices() > 0);
  if (!compositionBounds && !meshes.length) return;

  const bounds = compositionBounds ?? meshes.reduce((current, mesh) => {
    const meshBounds = mesh.getHierarchyBoundingVectors(true);
    return {
      maximum: Vector3.Maximize(current.maximum, meshBounds.max),
      minimum: Vector3.Minimize(current.minimum, meshBounds.min),
    };
  }, {
    maximum: new Vector3(-Infinity, -Infinity, -Infinity),
    minimum: new Vector3(Infinity, Infinity, Infinity),
  });
  const center = bounds.minimum.add(bounds.maximum).scale(0.5);
  const width = Math.max(bounds.maximum.x - bounds.minimum.x, 0.1);
  const height = Math.max(bounds.maximum.y - bounds.minimum.y, 0.1);
  const depth = Math.max(bounds.maximum.z - bounds.minimum.z, 0.1);
  const aspectRatio = camera.getEngine().getAspectRatio(camera);
  const verticalFov = camera.fov;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspectRatio);
  const widthDistance = width / (2 * Math.tan(horizontalFov / 2) * 0.68);
  const heightDistance = height / (2 * Math.tan(verticalFov / 2) * 0.66);
  const target = new Vector3(center.x, bounds.minimum.y + height * 0.5, center.z);

  camera.setTarget(target);
  camera.radius = Math.max(widthDistance, heightDistance) + depth * 0.08;
  camera.upperRadiusLimit = camera.radius * 1.35;
}
