import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type ThemeMode = 'light' | 'dark';

export type NotificationVariant = 'error' | 'info' | 'success' | 'warning';

export type Notification = {
  id: string;
  message: string;
  variant: NotificationVariant;
};

type UiState = {
  activeModal: string | null;
  notifications: Notification[];
  sidebarOpen: boolean;
  theme: ThemeMode;
  addNotification: (notification: Notification) => void;
  closeModal: () => void;
  openModal: (id: string) => void;
  removeNotification: (id: string) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>()(
  devtools(
    persist(
      immer((set) => ({
        activeModal: null,
        notifications: [],
        sidebarOpen: false,
        theme: 'light',
        addNotification: (notification) =>
          set((state) => {
            state.notifications.push(notification);
          }),
        closeModal: () =>
          set((state) => {
            state.activeModal = null;
          }),
        openModal: (id) =>
          set((state) => {
            state.activeModal = id;
          }),
        removeNotification: (id) =>
          set((state) => {
            state.notifications = state.notifications.filter(
              (notification) => notification.id !== id,
            );
          }),
        setTheme: (theme) =>
          set((state) => {
            state.theme = theme;
          }),
        toggleSidebar: () =>
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen;
          }),
      })),
      {
        name: 'furnispace-ui',
        partialize: (state) => ({ theme: state.theme }),
      },
    ),
    { name: 'ui-store' },
  ),
);
