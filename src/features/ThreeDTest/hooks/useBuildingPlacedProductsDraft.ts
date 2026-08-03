import { useCallback, useEffect, useMemo, useState } from 'react';

import type { PlacedBuildingProduct } from '@/features/ThreeDTest/schemas/buildingScene.types';

const BUILDING_PLACED_PRODUCTS_DRAFT_PREFIX = 'furnispace-building-placed-products-draft-v1';

type BuildingPlacedProductsDraft = {
  placedProducts: PlacedBuildingProduct[];
  selectedProductId: string | null;
  updatedAt: string;
};

function getDraftStorageKey(sceneId?: string) {
  return `${BUILDING_PLACED_PRODUCTS_DRAFT_PREFIX}:${sceneId ?? 'local-test'}`;
}

function isPlacedProductList(value: unknown): value is PlacedBuildingProduct[] {
  return Array.isArray(value) && value.every((item) =>
    item &&
    typeof item === 'object' &&
    typeof (item as Partial<PlacedBuildingProduct>).sceneObjectId === 'string' &&
    typeof (item as Partial<PlacedBuildingProduct>).modelUrl === 'string',
  );
}

function readDraft(storageKey: string): BuildingPlacedProductsDraft | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(storageKey);

    if (!rawDraft) {
      return null;
    }

    const parsedDraft = JSON.parse(rawDraft) as Partial<BuildingPlacedProductsDraft>;

    if (!isPlacedProductList(parsedDraft.placedProducts) || typeof parsedDraft.updatedAt !== 'string') {
      return null;
    }

    return {
      placedProducts: parsedDraft.placedProducts,
      selectedProductId: typeof parsedDraft.selectedProductId === 'string' ? parsedDraft.selectedProductId : null,
      updatedAt: parsedDraft.updatedAt,
    };
  } catch {
    return null;
  }
}

function isDraftNewerThanRemote(draftUpdatedAt: string, remoteSavedAt?: string | null) {
  if (!remoteSavedAt) {
    return true;
  }

  return new Date(draftUpdatedAt).getTime() > new Date(remoteSavedAt).getTime();
}

export function useBuildingPlacedProductsDraft(sceneId?: string) {
  const storageKey = useMemo(() => getDraftStorageKey(sceneId), [sceneId]);
  const isRemoteScene = Boolean(sceneId);
  const [draft, setDraft] = useState<BuildingPlacedProductsDraft | null>(() =>
    isRemoteScene ? null : readDraft(storageKey),
  );

  useEffect(() => {
    setDraft(isRemoteScene ? null : readDraft(storageKey));
  }, [isRemoteScene, storageKey]);

  const persistDraft = useCallback((placedProducts: PlacedBuildingProduct[], selectedProductId: string | null) => {
    if (isRemoteScene) {
      return;
    }

    const nextDraft = {
      placedProducts,
      selectedProductId,
      updatedAt: new Date().toISOString(),
    };

    setDraft(nextDraft);
    window.localStorage.setItem(storageKey, JSON.stringify(nextDraft));
  }, [isRemoteScene, storageKey]);

  const clearDraft = useCallback(() => {
    setDraft(null);

    if (isRemoteScene) {
      return;
    }

    window.localStorage.removeItem(storageKey);
  }, [isRemoteScene, storageKey]);

  const shouldKeepDraft = useCallback((remoteSavedAt?: string | null) => {
    if (isRemoteScene) {
      return false;
    }

    return Boolean(draft && draft.placedProducts.length > 0 && isDraftNewerThanRemote(draft.updatedAt, remoteSavedAt));
  }, [draft, isRemoteScene]);

  return useMemo(() => ({
    clearDraft,
    draft,
    persistDraft,
    shouldKeepDraft,
  }), [clearDraft, draft, persistDraft, shouldKeepDraft]);
}
