import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { SceneCanvas } from '@/features/viewer3d/components/SceneCanvas';
import { useSceneStore } from '@/stores';

export function ViewerDemoPage() {
  const sceneReady = useSceneStore((state) => state.sceneReady);
  const loadedModels = useSceneStore((state) => state.loadedModels);

  return (
    <Box component="main" sx={{ minHeight: '100vh', py: 3 }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          <Stack
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography component="h1" variant="h5" fontWeight={700}>
                Babylon viewer
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Scene: {sceneReady ? 'ready' : 'initializing'} | Models:{' '}
                {loadedModels.length}
              </Typography>
            </Box>
            <Button component={RouterLink} to="/" variant="outlined">
              Back
            </Button>
          </Stack>

          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              height: { xs: 420, md: 'calc(100vh - 148px)' },
              minHeight: 420,
            }}
          >
            <SceneCanvas />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
