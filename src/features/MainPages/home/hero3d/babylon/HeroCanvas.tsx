import { useEffect, useRef } from 'react';
import { Engine, TransformNode } from 'babylonjs';

import { FloatingAnimationController } from '@/features/MainPages/home/hero3d/animation/FloatingAnimationController';
import { createHeroScene } from '@/features/MainPages/home/hero3d/hero/HeroScene';
import { frameHeroCamera } from '@/features/MainPages/home/hero3d/hero/HeroCamera';
import { LayoutGenerator } from '@/features/MainPages/home/hero3d/layout/LayoutGenerator';
import { AssetScanner } from '@/features/MainPages/home/hero3d/loaders/AssetScanner';
import { ModelLoader } from '@/features/MainPages/home/hero3d/loaders/ModelLoader';
import type { HeroCompositionBounds, HeroObject } from '@/features/MainPages/home/hero3d/types';

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const engine = new Engine(canvas, true, { adaptToDeviceRatio: true });
    const { lighting, scene } = createHeroScene(engine, canvas);
    const scanner = new AssetScanner();
    const loader = new ModelLoader();
    const layout = new LayoutGenerator();
    const animation = new FloatingAnimationController();
    const clusterRig = new TransformNode('home-hero-cluster-rig', scene);
    const objects: HeroObject[] = [];
    const abortController = new AbortController();
    let compositionBounds: HeroCompositionBounds | null = null;
    let heroObject: HeroObject | null = null;
    let heroCamera: import('babylonjs').ArcRotateCamera | null = null;

    void scanner.scan(abortController.signal)
      .then(async ({ models }) => {
        const settled = await Promise.allSettled(models.map((model) => loader.load(scene, model)));
        settled.forEach((result) => {
          if (result.status === 'fulfilled') objects.push(result.value);
          else console.warn('Unable to load hero model.', result.reason);
        });
        compositionBounds = layout.layout(objects);
        heroObject = layout.getHeroObject();
        objects.forEach((object) => {
          if (object.rootNode.isEnabled()) object.rootNode.parent = clusterRig;
        });
        objects.forEach((object) => {
          object.meshes.forEach((mesh) => mesh.receiveShadows = true);
          lighting.addShadowCasters(object.meshes);
        });
        const camera = scene.activeCamera;
        if (camera?.getClassName() === 'ArcRotateCamera') {
          heroCamera = camera as import('babylonjs').ArcRotateCamera;
          frameHeroCamera(heroCamera, objects, compositionBounds, heroObject);
          console.info('[Hero3D] Camera framing', {
            cameraDistance: Math.round(heroCamera.radius * 1000) / 1000,
            fovDegrees: Math.round((heroCamera.fov * 180 / Math.PI) * 1000) / 1000,
          });
        }
        animation.setObjects(objects);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) console.warn('Unable to scan hero models.', error);
      });

    const renderLoop = () => {
      const now = performance.now();
      animation.update(objects, now);
      lighting.setHighlight(0);
      scene.render();
    };
    engine.runRenderLoop(renderLoop);

    const resize = () => {
      engine.resize();
      if (heroCamera && objects.length) {
        frameHeroCamera(heroCamera, objects, compositionBounds, heroObject);
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement ?? canvas);
    window.addEventListener('resize', resize);
    return () => {
      abortController.abort();
      observer.disconnect();
      window.removeEventListener('resize', resize);
      engine.stopRenderLoop(renderLoop);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="home-hero-canvas" aria-label="FurniSpace 3D furniture preview" />;
}
