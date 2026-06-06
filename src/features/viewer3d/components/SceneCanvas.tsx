import { Box, CircularProgress } from '@mui/material';
import { useEffect, useRef } from 'react';

import { useScene } from '@/features/viewer3d/hooks/useScene';

export type SceneCanvasProps = {
  modelUrl?: string;
  onError?: (error: Error) => void;
  onReady?: () => void;
};

export function SceneCanvas({ modelUrl, onError, onReady }: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { loadModel, sceneReady } = useScene(canvasRef, { onError, onReady });

  useEffect(() => {
    if (!modelUrl || !sceneReady) {
      return;
    }

    void loadModel(modelUrl).catch(onError);
  }, [loadModel, modelUrl, onError, sceneReady]);

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        height: '100%',
        minHeight: 360,
        position: 'relative',
        width: '100%',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          height: '100%',
          outline: 'none',
          width: '100%',
        }}
      />
      {!sceneReady && (
        <Box
          sx={{
            alignItems: 'center',
            bgcolor: 'rgba(247, 248, 245, 0.72)',
            display: 'flex',
            inset: 0,
            justifyContent: 'center',
            position: 'absolute',
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}
