import { create } from 'zustand';

let idCounter = 0;

export const useToastStore = create((set) => ({
  toasts: [],
  push: (message, type = 'info') => {
    const id = ++idCounter;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message, type = 'info') {
  useToastStore.getState().push(message, type);
}
