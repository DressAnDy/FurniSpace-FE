import { Mesh, Vector3 } from 'babylonjs';
import type { Scene, TransformNode } from 'babylonjs';

import type {
  BuildingLevelVisibility,
  BuildingPlacementSurface,
  PlacedBuildingProduct,
  Vector3State,
} from '@/features/ThreeDTest/schemas/buildingScene.types';

const COLLISION_GAP = 0.03;
const COLLISION_SWEEP_STEP = 0.08;
const WALL_COLLISION_GAP = 0.015;

export type BuildingProductBounds = {
  maxX: number;
  maxY: number;
  maxZ: number;
  minX: number;
  minY: number;
  minZ: number;
};

export type BuildingPlacementValidationInput = {
  boundaryEnabled?: boolean;
  collisionEnabled?: boolean;
  position: Vector3State;
  productId: string;
  productRoot: TransformNode | undefined;
  scene: Scene;
  surface: BuildingPlacementSurface;
};

function roundPosition(position: Vector3State): Vector3State {
  return {
    x: Number(position.x.toFixed(2)),
    y: Number(position.y.toFixed(2)),
    z: Number(position.z.toFixed(2)),
  };
}

function getRootGroundOffset(root: TransformNode) {
  return Number(root.metadata?.groundOffsetY ?? 0);
}

function setRootAnchorPosition(root: TransformNode, position: Vector3State) {
  root.position.set(position.x, position.y + getRootGroundOffset(root), position.z);
}

function getProductMeshWorldExtents(root: TransformNode | undefined) {
  const meshes = root?.getChildMeshes(false, (mesh) =>
    mesh instanceof Mesh &&
    !mesh.metadata?.interactionProxy &&
    mesh.isEnabled() &&
    mesh.getTotalVertices() > 0,
  );

  if (!meshes?.length) {
    return null;
  }

  meshes.forEach((mesh) => mesh.computeWorldMatrix(true));

  return meshes.reduce<{
    max: Vector3;
    min: Vector3;
  } | null>((bounds, mesh) => {
    const meshBounds = mesh.getBoundingInfo().boundingBox;

    if (!bounds) {
      return {
        max: meshBounds.maximumWorld.clone(),
        min: meshBounds.minimumWorld.clone(),
      };
    }

    return {
      max: new Vector3(
        Math.max(bounds.max.x, meshBounds.maximumWorld.x),
        Math.max(bounds.max.y, meshBounds.maximumWorld.y),
        Math.max(bounds.max.z, meshBounds.maximumWorld.z),
      ),
      min: new Vector3(
        Math.min(bounds.min.x, meshBounds.minimumWorld.x),
        Math.min(bounds.min.y, meshBounds.minimumWorld.y),
        Math.min(bounds.min.z, meshBounds.minimumWorld.z),
      ),
    };
  }, null);
}

export function getBuildingProductBounds(root: TransformNode | undefined): BuildingProductBounds | null {
  const bounds = getProductMeshWorldExtents(root);

  if (!bounds) {
    return null;
  }

  return {
    maxX: bounds.max.x,
    maxY: bounds.max.y,
    maxZ: bounds.max.z,
    minX: bounds.min.x,
    minY: bounds.min.y,
    minZ: bounds.min.z,
  };
}

function getProductBoundsAtPosition(root: TransformNode, position: Vector3State) {
  const originalPosition = {
    x: root.position.x,
    y: root.position.y,
    z: root.position.z,
  };

  setRootAnchorPosition(root, position);
  root.computeWorldMatrix(true);
  root.getChildMeshes(false).forEach((mesh) => mesh.computeWorldMatrix(true));
  const bounds = getBuildingProductBounds(root);
  root.position.set(originalPosition.x, originalPosition.y, originalPosition.z);
  root.computeWorldMatrix(true);
  root.getChildMeshes(false).forEach((mesh) => mesh.computeWorldMatrix(true));

  return bounds;
}

function areBoundsOverlapping(first: BuildingProductBounds, second: BuildingProductBounds) {
  return first.minX < second.maxX - COLLISION_GAP &&
    first.maxX > second.minX + COLLISION_GAP &&
    first.minY < second.maxY - COLLISION_GAP &&
    first.maxY > second.minY + COLLISION_GAP &&
    first.minZ < second.maxZ - COLLISION_GAP &&
    first.maxZ > second.minZ + COLLISION_GAP;
}

function areBoundsTouchingWall(first: BuildingProductBounds, second: BuildingProductBounds) {
  return first.minX < second.maxX - WALL_COLLISION_GAP &&
    first.maxX > second.minX + WALL_COLLISION_GAP &&
    first.minY < second.maxY - WALL_COLLISION_GAP &&
    first.maxY > second.minY + WALL_COLLISION_GAP &&
    first.minZ < second.maxZ - WALL_COLLISION_GAP &&
    first.maxZ > second.minZ + WALL_COLLISION_GAP;
}

function getWallCollisionBounds(scene: Scene, levelId: BuildingPlacementSurface['levelId']) {
  return scene.meshes
    .filter((mesh) =>
      mesh instanceof Mesh &&
      mesh.metadata?.source === 'building-test-environment' &&
      mesh.metadata?.kind === 'wall-collision' &&
      mesh.metadata?.levelId === levelId &&
      mesh.isEnabled() &&
      mesh.isVisible &&
      mesh.getTotalVertices() > 0,
    )
    .map((mesh) => {
      mesh.computeWorldMatrix(true);
      const wallBounds = mesh.getBoundingInfo().boundingBox;

      return {
        maxX: wallBounds.maximumWorld.x,
        maxY: wallBounds.maximumWorld.y,
        maxZ: wallBounds.maximumWorld.z,
        minX: wallBounds.minimumWorld.x,
        minY: wallBounds.minimumWorld.y,
        minZ: wallBounds.minimumWorld.z,
      };
    });
}

export function isCollidingWithBuildingWalls({
  productRoot,
  position,
  scene,
  surface,
}: Omit<BuildingPlacementValidationInput, 'productId'>) {
  if (!productRoot) {
    return false;
  }

  const nextBounds = getProductBoundsAtPosition(productRoot, position);

  if (!nextBounds) {
    return false;
  }

  return getWallCollisionBounds(scene, surface.levelId)
    .some((wallBounds) => areBoundsTouchingWall(nextBounds, wallBounds));
}

export function isPositionInsideSurface(
  bounds: BuildingProductBounds | null,
  position: Vector3State,
  surface: BuildingPlacementSurface,
) {
  const halfWidth = surface.width / 2;
  const halfDepth = surface.depth / 2;
  const minX = surface.bounds?.minX ?? surface.position.x - halfWidth;
  const maxX = surface.bounds?.maxX ?? surface.position.x + halfWidth;
  const minZ = surface.bounds?.minZ ?? surface.position.z - halfDepth;
  const maxZ = surface.bounds?.maxZ ?? surface.position.z + halfDepth;

  if (!bounds) {
    return position.x >= minX && position.x <= maxX && position.z >= minZ && position.z <= maxZ;
  }

  return bounds.minX >= minX + COLLISION_GAP &&
    bounds.maxX <= maxX - COLLISION_GAP &&
    bounds.minZ >= minZ + COLLISION_GAP &&
    bounds.maxZ <= maxZ - COLLISION_GAP;
}

export function isCollidingWithOtherBuildingProducts({
  position,
  productId,
  productRoot,
  scene,
}: Omit<BuildingPlacementValidationInput, 'surface'>) {
  if (!productRoot) {
    return false;
  }

  const nextBounds = getProductBoundsAtPosition(productRoot, position);

  if (!nextBounds) {
    return false;
  }

  return scene.transformNodes
    .filter((node) =>
      node.metadata?.source === 'building-test-product' &&
      node.metadata?.sceneObjectId &&
      node.metadata.sceneObjectId !== productId,
    )
    .some((node) => {
      const otherBounds = getBuildingProductBounds(node);

      return otherBounds ? areBoundsOverlapping(nextBounds, otherBounds) : false;
    });
}

export function isValidBuildingProductPosition(input: BuildingPlacementValidationInput) {
  const nextBounds = input.productRoot ? getProductBoundsAtPosition(input.productRoot, input.position) : null;
  const boundaryEnabled = input.boundaryEnabled ?? true;
  const collisionEnabled = input.collisionEnabled ?? true;

  return (!boundaryEnabled || isPositionInsideSurface(nextBounds, input.position, input.surface)) &&
    (!boundaryEnabled || !isCollidingWithBuildingWalls(input)) &&
    (!collisionEnabled || !isCollidingWithOtherBuildingProducts(input));
}

export function getLastValidBuildingProductPosition(
  input: BuildingPlacementValidationInput & {
    previousPosition: Vector3State;
  },
) {
  const deltaX = input.position.x - input.previousPosition.x;
  const deltaY = input.position.y - input.previousPosition.y;
  const deltaZ = input.position.z - input.previousPosition.z;
  const travelDistance = Math.hypot(deltaX, deltaY, deltaZ);
  const steps = Math.max(1, Math.ceil(travelDistance / COLLISION_SWEEP_STEP));
  let lastValidPosition = input.previousPosition;

  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    const candidate = roundPosition({
      x: input.previousPosition.x + deltaX * progress,
      y: input.previousPosition.y + deltaY * progress,
      z: input.previousPosition.z + deltaZ * progress,
    });

    if (!isValidBuildingProductPosition({ ...input, position: candidate })) {
      break;
    }

    lastValidPosition = candidate;
  }

  return lastValidPosition;
}

export function getBuildingProductPlacementSummary(product: PlacedBuildingProduct) {
  return {
    levelId: product.levelId as BuildingLevelVisibility,
    mode: product.placementMode ?? 'FLOOR',
    surfaceId: product.surfaceId,
  };
}
