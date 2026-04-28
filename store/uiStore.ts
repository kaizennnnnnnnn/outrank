import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  toasts: Toast[];
  recapFlights: RecapFlight[];
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modal: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  triggerRecapFlight: (flight: Omit<RecapFlight, 'id'>) => void;
  clearRecapFlight: (id: string) => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

/**
 * One in-flight log → recap animation. Each habit log fires one of these
 * so a successful log visually files itself into today's record. Position
 * is in viewport coords; the animator queries [data-recap-drop] for the
 * destination at flight time so it can land precisely on the panel.
 */
export interface RecapFlight {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  categorySlug: string;
  value: number;
  unit: string;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  activeModal: null,
  modalData: null,
  toasts: [],
  recapFlights: [],
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openModal: (modal, data) => set({ activeModal: modal, modalData: data ?? null }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  addToast: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  triggerRecapFlight: (flight) =>
    set((s) => ({
      recapFlights: [...s.recapFlights, { ...flight, id: crypto.randomUUID() }],
    })),
  clearRecapFlight: (id) =>
    set((s) => ({ recapFlights: s.recapFlights.filter((f) => f.id !== id) })),
}));
