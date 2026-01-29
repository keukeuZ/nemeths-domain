import { create } from 'zustand';

// ==========================================
// TYPES
// ==========================================

export type PanelType =
  | 'territory'
  | 'army'
  | 'buildings'
  | 'spellbook'
  | 'alliance'
  | 'leaderboard'
  | 'settings';

export type ModalType =
  | 'register'
  | 'combat_initiate'
  | 'combat_result'
  | 'building_construct'
  | 'unit_train'
  | 'spell_cast'
  | 'alliance_create'
  | 'alliance_invite'
  | 'confirm';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface ConfirmModalData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

// ==========================================
// STORE
// ==========================================

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  activePanel: PanelType;

  // Modals
  activeModal: ModalType | null;
  modalData: unknown;

  // Toasts
  toasts: Toast[];

  // Map interaction mode
  mapMode: 'view' | 'attack' | 'move' | 'spell';

  // Tutorial
  showTutorial: boolean;
  tutorialStep: number;

  // Actions
  toggleSidebar: () => void;
  setActivePanel: (panel: PanelType) => void;
  openModal: (modal: ModalType, data?: unknown) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setMapMode: (mode: UIState['mapMode']) => void;
  setTutorial: (show: boolean, step?: number) => void;
  nextTutorialStep: () => void;
  confirm: (data: ConfirmModalData) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>()((set, get) => ({
  // Initial state
  sidebarOpen: true,
  activePanel: 'territory',
  activeModal: null,
  modalData: null,
  toasts: [],
  mapMode: 'view',
  showTutorial: false,
  tutorialStep: 0,

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setActivePanel: (panel) => {
    set({ activePanel: panel, sidebarOpen: true });
  },

  openModal: (modal, data) => {
    set({ activeModal: modal, modalData: data });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },

  addToast: (toast) => {
    const id = `toast-${++toastId}`;
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  setMapMode: (mode) => {
    set({ mapMode: mode });
  },

  setTutorial: (show, step) => {
    set({
      showTutorial: show,
      tutorialStep: step ?? 0,
    });
  },

  nextTutorialStep: () => {
    set((state) => ({
      tutorialStep: state.tutorialStep + 1,
    }));
  },

  confirm: (data) => {
    set({
      activeModal: 'confirm',
      modalData: data,
    });
  },
}));

// ==========================================
// TOAST HELPERS
// ==========================================

export const toast = {
  success: (title: string, message?: string) => {
    useUIStore.getState().addToast({ type: 'success', title, message });
  },
  error: (title: string, message?: string) => {
    useUIStore.getState().addToast({ type: 'error', title, message });
  },
  warning: (title: string, message?: string) => {
    useUIStore.getState().addToast({ type: 'warning', title, message });
  },
  info: (title: string, message?: string) => {
    useUIStore.getState().addToast({ type: 'info', title, message });
  },
};
