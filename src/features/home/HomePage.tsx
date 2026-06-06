import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function HomePage() {
  return (
    <Box component="main" sx={{ py: { xs: 5, md: 8 } }}>
      <Container maxWidth="lg">
        <Stack spacing={3} sx={{ maxWidth: 720 }}>
          <Typography component="h1" variant="h3" fontWeight={700}>
            FurniSpace
          </Typography>
          <Typography color="text.secondary" variant="h6">
            React 18, TypeScript, Vite, React Query, Zustand, Axios, BabylonJS,
            and Material UI are ready for feature-based development.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component={RouterLink} to="/" variant="contained">
              Start building
            </Button>
            <Button component={RouterLink} to="/viewer3d" variant="outlined">
              Test Babylon
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
