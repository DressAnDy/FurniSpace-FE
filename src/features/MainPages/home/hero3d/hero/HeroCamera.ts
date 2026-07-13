import { ArcRotateCamera, Tools, Vector3 } from 'babylonjs';

import type { HeroCompositionBounds, HeroObject } from '@/features/MainPages/home/hero3d/types';

export function createHeroCamera(scene: import('babylonjs').Scene, canvas: HTMLCanvasElement) {
  const camera = new ArcRotateCamera(
    'home-hero-camera',
    Tools.ToRadians(-4),
    Tools.ToRadians(76),
    8,
    Vector3.Zero(),
    scene,
  );

  camera.fov = Tools.ToRadians(31);
  camera.attachControl(canvas, true);
  camera.lowerBetaLimit = Tools.ToRadians(68);
  camera.upperBetaLimit = Tools.ToRadians(84);
  camera.lowerRadiusLimit = 1.2;
  camera.wheelPrecision = 90;
  camera.panningSensibility = 0;
  return camera;
}

export function frameHeroCamera(
  camera: ArcRotateCamera,
  objects: HeroObject[],
  compositionBounds?: HeroCompositionBounds | null,
  heroObject?: HeroObject | null,
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
  const heroBounds = heroObject?.rootNode.isEnabled()
    ? heroObject.meshes.reduce((current, mesh) => {
      if (mesh.getTotalVertices() <= 0) return current;
      const meshBounds = mesh.getHierarchyBoundingVectors(true);
      return {
        maximum: Vector3.Maximize(current.maximum, meshBounds.max),
        minimum: Vector3.Minimize(current.minimum, meshBounds.min),
      };
    }, {
      maximum: new Vector3(-Infinity, -Infinity, -Infinity),
      minimum: new Vector3(Infinity, Infinity, Infinity),
    })
    : null;
  const heroCenter = heroBounds
    ? heroBounds.minimum.add(heroBounds.maximum).scale(0.5)
    : center;
  const heroWidth = heroBounds
    ? Math.max(heroBounds.maximum.x - heroBounds.minimum.x, width * 0.5)
    : width * 0.5;
  const heroHeight = heroBounds
    ? Math.max(heroBounds.maximum.y - heroBounds.minimum.y, height * 0.5)
    : height * 0.5;
  const aspectRatio = camera.getEngine().getAspectRatio(camera);
  const verticalFov = camera.fov;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspectRatio);
  const sofaDistance = heroWidth / (2 * Math.tan(horizontalFov / 2) * 0.56);
  const groupDistance = width / (2 * Math.tan(horizontalFov / 2) * 0.82);
  const heightDistance = Math.max(
    heroHeight / (2 * Math.tan(verticalFov / 2) * 0.72),
    height / (2 * Math.tan(verticalFov / 2) * 1.08),
  );
  const target = new Vector3(heroCenter.x - width * 0.03, bounds.minimum.y + height * 0.34, heroCenter.z - depth * 0.02);

  camera.setTarget(target);
  camera.radius = Math.max(sofaDistance, groupDistance, heightDistance) + depth * 0.07;
  camera.upperRadiusLimit = camera.radius * 1.35;
}
