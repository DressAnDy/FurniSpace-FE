import { useEffect, useRef } from 'react';
import { Engine, TransformNode } from 'babylonjs';

import { AnimationController } from '@/features/MainPages/home/hero3d/animation/AnimationController';
import { CameraAnimation } from '@/features/MainPages/home/hero3d/animation/CameraAnimation';
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
    const animation = new AnimationController();
    const cameraAnimation = new CameraAnimation();
    const clusterRig = new TransformNode('home-hero-cluster-rig', scene);
    const objects: HeroObject[] = [];
    const abortController = new AbortController();
    const startedAt = performance.now();
    const tilt = { currentX: 0, currentY: 0, targetX: 0, targetY: 0 };
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
          cameraAnimation.setBase(heroCamera);
        }
        animation.setObjects(objects);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) console.warn('Unable to scan hero models.', error);
      });

    const renderLoop = () => {
      const now = performance.now();
      const frame = animation.update(objects, now);
      tilt.currentX += (tilt.targetX - tilt.currentX) * 0.08;
      tilt.currentY += (tilt.targetY - tilt.currentY) * 0.08;
      clusterRig.rotation.x = tilt.currentY * 0.045;
      clusterRig.rotation.z = -tilt.currentX * 0.045;
      cameraAnimation.update(heroCamera, (now - startedAt) / 1000);
      lighting.setHighlight(frame.phase === 'highlight' ? frame.progress : 0);
      scene.render();
    };
    engine.runRenderLoop(renderLoop);

    const resize = () => {
      engine.resize();
      if (heroCamera && objects.length) {
        frameHeroCamera(heroCamera, objects, compositionBounds, heroObject);
        cameraAnimation.setBase(heroCamera);
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement ?? canvas);
    window.addEventListener('resize', resize);
    const updateTilt = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      tilt.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      tilt.targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    };
    const resetTilt = () => {
      tilt.targetX = 0;
      tilt.targetY = 0;
    };
    const handleCameraNudge = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean }>).detail;
      cameraAnimation.setNudge(Boolean(detail?.active));
    };
    canvas.addEventListener('pointermove', updateTilt);
    canvas.addEventListener('pointerleave', resetTilt);
    window.addEventListener('home-hero-camera-nudge', handleCameraNudge);

    return () => {
      abortController.abort();
      observer.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', updateTilt);
      canvas.removeEventListener('pointerleave', resetTilt);
      window.removeEventListener('home-hero-camera-nudge', handleCameraNudge);
      engine.stopRenderLoop(renderLoop);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="home-hero-canvas" aria-label="FurniSpace 3D furniture preview" />;
}
