import type { HeroModelManifest } from '@/features/MainPages/home/hero3d/types';

const HERO_MANIFEST_URL = '/assets/models/hero/models.json';

/** Reads the build-generated asset list. Browsers cannot inspect public folders directly. */
export class AssetScanner {
  async scan(signal?: AbortSignal): Promise<HeroModelManifest> {
    const response = await fetch(HERO_MANIFEST_URL, { signal });

    if (!response.ok) {
      throw new Error(`Unable to load hero model manifest (${response.status}).`);
    }

    return response.json() as Promise<HeroModelManifest>;
  }
}
