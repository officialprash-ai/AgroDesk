import { create } from 'zustand';
import { api } from '../lib/api';

export interface SupportSummary {
  newCount: number;
  untransferredCount: number;
  oldestNewAt: string | null;
}

interface SupportStore {
  summary: SupportSummary;
  loading: boolean;
  fetchSummary: () => Promise<void>;
}

/**
 * Lightweight store for the Support Intake summary badge. The dashboard tile and
 * the sidebar poll fetchSummary() every 30s so the "new requests" number stays
 * live without a full page reload.
 */
export const useSupportStore = create<SupportStore>((set) => ({
  summary: { newCount: 0, untransferredCount: 0, oldestNewAt: null },
  loading: false,
  fetchSummary: async () => {
    set({ loading: true });
    try {
      const s = await api.support.summary();
      set({ summary: s, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
