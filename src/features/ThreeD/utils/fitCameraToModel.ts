import type { ArcRotateCamera, AbstractMesh } from 'babylonjs';
import { Vector3 } from 'babylonjs';

export function fitCameraToMeshes(camera: ArcRotateCamera, meshes: AbstractMesh[]) {
  const visibleMeshes = meshes.filter((mesh) => mesh.isEnabled() && mesh.getTotalVertices() > 0);

  if (!visibleMeshes.length) {
    camera.setTarget(Vector3.Zero());
    camera.radius = 6;
    return;
  }

  const bounds = visibleMeshes.reduce<{
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

  camera.setTarget(center);
  camera.radius = Math.max(size * 1.35, 2.4);
}
