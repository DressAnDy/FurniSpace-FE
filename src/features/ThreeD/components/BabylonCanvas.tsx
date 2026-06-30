import { useEffect, useRef } from 'react';
import { Engine, Scene } from 'babylonjs';

export type BabylonCanvasProps = {
  className?: string;
  onSceneReady: (scene: Scene, engine: Engine, canvas: HTMLCanvasElement) => void;
  onRender?: (scene: Scene) => void;
};

export function BabylonCanvas({ className, onRender, onSceneReady }: BabylonCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onRenderRef = useRef(onRender);
  const onSceneReadyRef = useRef(onSceneReady);

  useEffect(() => {
    onRenderRef.current = onRender;
    onSceneReadyRef.current = onSceneReady;
  }, [onRender, onSceneReady]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      preserveDrawingBuffer: true,
      stencil: true,
    });
    const scene = new Scene(engine);
    scene.clearColor.set(0.96, 0.97, 0.95, 1);

    onSceneReadyRef.current(scene, engine, canvas);

    const renderLoop = () => {
      onRenderRef.current?.(scene);
      scene.render();
    };

    engine.runRenderLoop(renderLoop);

    const handleResize = () => {
      engine.resize();
    };
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
    };
    let resizeFrame = 0;
    const scheduleResize = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(handleResize);
    };
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleResize);

    resizeObserver?.observe(canvas.parentElement ?? canvas);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', handleResize);
    scheduleResize();

    return () => {
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      engine.stopRenderLoop(renderLoop);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
