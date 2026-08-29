import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getProjectAreaMeasurementImages,
  getProjectMeasurementImages,
  getScheduleMeasurementImages,
  linkMeasurementImageToArea,
  uploadMeasurementImage,
  unlinkMeasurementImageFromArea,
  type MeasurementImageUploadInput,
  type MeasurementImageGalleryQuery,
} from '@/services/api/measurementImages';

export const measurementImageQueryKeys = {
  all: ['measurement-images'] as const,
  project: (projectId: string, query?: MeasurementImageGalleryQuery) => ['measurement-images', 'project', projectId, query] as const,
  schedule: (scheduleId: string, query?: MeasurementImageGalleryQuery) => ['measurement-images', 'schedule', scheduleId, query] as const,
  area: (projectAreaId: string, query?: MeasurementImageGalleryQuery) => ['measurement-images', 'area', projectAreaId, query] as const,
};

export function useProjectMeasurementImages(projectId?: string, query?: MeasurementImageGalleryQuery) {
  return useQuery({
    queryKey: measurementImageQueryKeys.project(projectId ?? '', query),
    queryFn: () => getProjectMeasurementImages(projectId ?? '', query),
    enabled: Boolean(projectId),
  });
}

export function useScheduleMeasurementImages(scheduleId?: string, query?: MeasurementImageGalleryQuery) {
  return useQuery({
    queryKey: measurementImageQueryKeys.schedule(scheduleId ?? '', query),
    queryFn: () => getScheduleMeasurementImages(scheduleId ?? '', query),
    enabled: Boolean(scheduleId),
  });
}

export function useProjectAreaMeasurementImages(projectAreaId?: string, query?: MeasurementImageGalleryQuery) {
  return useQuery({
    queryKey: measurementImageQueryKeys.area(projectAreaId ?? '', query),
    queryFn: () => getProjectAreaMeasurementImages(projectAreaId ?? '', query),
    enabled: Boolean(projectAreaId),
  });
}

export function useUploadMeasurementImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MeasurementImageUploadInput) => uploadMeasurementImage(input),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: measurementImageQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['measurement-images', 'schedule', input.scheduleId] });
      if (input.projectAreaId) {
        void queryClient.invalidateQueries({ queryKey: ['measurement-images', 'area', input.projectAreaId] });
      }
    },
  });
}

export function useLinkMeasurementImageToArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { fileId: string; projectAreaId: string }) => linkMeasurementImageToArea(input.projectAreaId, input.fileId),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: measurementImageQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['measurement-images', 'area', input.projectAreaId] });
    },
  });
}

export function useUnlinkMeasurementImageFromArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { fileId: string; projectAreaId: string }) => unlinkMeasurementImageFromArea(input.projectAreaId, input.fileId),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: measurementImageQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['measurement-images', 'area', input.projectAreaId] });
    },
  });
}
