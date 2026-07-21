import {
  AbstractMesh,
  BoundingInfo,
  Scene,
  SceneLoader,
  TransformNode,
  Vector3,
} from 'babylonjs';
import 'babylonjs-loaders';

import type { HeroModelMetadata, HeroObject } from '@/features/MainPages/home/hero3d/types';
import { createBounds, toVector3Data } from '@/features/MainPages/home/hero3d/utils/sceneBounds';

export class ModelLoader {
  async load(
    scene: Scene,
    model: Pick<HeroModelMetadata, 'category' | 'layout' | 'name' | 'path' | 'preferredScale' | 'priority' | 'sceneGroup'>,
  ): Promise<HeroObject> {
    const result = await SceneLoader.ImportMeshAsync('', '', model.path, scene);
    const rootNode = new TransformNode(`hero-root-${model.name}`, scene);
    const meshes = result.meshes.filter((mesh): mesh is AbstractMesh => mesh instanceof AbstractMesh);

    const bounds = this.getBounds(meshes);
    const center = bounds.minimum.add(bounds.maximum).scale(0.5);
    const size = bounds.maximum.subtract(bounds.minimum);

    // Move the imported hierarchy around its own centre so layout coordinates remain model-agnostic.
    [...result.transformNodes, ...meshes].forEach((node) => {
      if (!node.parent && node !== rootNode) {
        node.parent = rootNode;
        node.position.subtractInPlace(center);
      }
    });

    rootNode.computeWorldMatrix(true);

    return {
      meshes,
      mesh: meshes.find((mesh) => mesh.getTotalVertices() > 0) ?? null,
      boundingInfo: new BoundingInfo(bounds.minimum, bounds.maximum),
      metadata: {
        boundingBox: createBounds(bounds.minimum, bounds.maximum),
        category: model.category,
        center: toVector3Data(center),
        estimatedSize: size.length(),
        height: size.y,
        meshCount: meshes.length,
        name: model.name,
        nodeCount: result.transformNodes.length + meshes.length,
        path: model.path,
        layout: model.layout,
        preferredScale: model.preferredScale,
        priority: model.priority,
        radius: Math.max(size.x, size.z) / 2,
        sceneGroup: model.sceneGroup,
      },
      originalTransform: {
        position: rootNode.position.clone(),
        rotation: rootNode.rotation.clone(),
        scaling: rootNode.scaling.clone(),
      },
      pivot: center.clone(),
      rootNode,
    };
  }

  private getBounds(meshes: AbstractMesh[]) {
    const visibleMeshes = meshes.filter((mesh) => mesh.getTotalVertices() > 0);

    if (!visibleMeshes.length) {
      return { maximum: Vector3.Zero(), minimum: Vector3.Zero() };
    }

    return visibleMeshes.reduce((current, mesh) => {
      const meshBounds = mesh.getHierarchyBoundingVectors(true);
      return {
        maximum: Vector3.Maximize(current.maximum, meshBounds.max),
        minimum: Vector3.Minimize(current.minimum, meshBounds.min),
      };
    }, {
      maximum: new Vector3(-Infinity, -Infinity, -Infinity),
      minimum: new Vector3(Infinity, Infinity, Infinity),
    });
  }
}
