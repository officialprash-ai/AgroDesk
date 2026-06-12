import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Contact, UsedTractor, RecoveryCase, Campaign, Document, Accountant, DashboardMetrics } from '../types';

interface DealerProfile {
  id: string;
  name: string;
  city: string;
  district?: string;
  state?: string;
  language: string;
  phone?: string;
  plan?: string;
}

interface AppStore {
  // Auth
  token: string | null;
  dealer: DealerProfile | null;
  setAuth: (token: string, dealer: DealerProfile) => void;
  clearAuth: () => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // CRM
  contacts: Contact[];
  setContacts: (c: Contact[]) => void;

  // Used Tractors
  usedTractors: UsedTractor[];
  setUsedTractors: (t: UsedTractor[]) => void;

  // Recovery
  recoveryCases: RecoveryCase[];
  setRecoveryCases: (r: RecoveryCase[]) => void;

  // Campaigns
  campaigns: Campaign[];
  setCampaigns: (c: Campaign[]) => void;

  // Accountant
  documents: Document[];
  setDocuments: (d: Document[]) => void;
  accountants: Accountant[];
  setAccountants: (a: Accountant[]) => void;

  // Dashboard
  metrics: DashboardMetrics | null;
  setMetrics: (m: DashboardMetrics) => void;

  // AI Script modal
  scriptModal: { open: boolean; type: string; context?: Record<string, unknown> };
  openScriptModal: (type: string, context?: Record<string, unknown>) => void;
  closeScriptModal: () => void;

  // Notifications
  notifications: { id: string; title: string; message: string; type: 'success' | 'error' | 'info'; }[];
  addNotification: (n: Omit<AppStore['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      token: null,
      dealer: null,
      setAuth: (token, dealer) => set({ token, dealer }),
      clearAuth: () => set({ token: null, dealer: null }),
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      contacts: [],
      setContacts: (c) => set({ contacts: c }),
      usedTractors: [],
      setUsedTractors: (t) => set({ usedTractors: t }),
      recoveryCases: [],
      setRecoveryCases: (r) => set({ recoveryCases: r }),
      campaigns: [],
      setCampaigns: (c) => set({ campaigns: c }),
      documents: [],
      setDocuments: (d) => set({ documents: d }),
      accountants: [],
      setAccountants: (a) => set({ accountants: a }),
      metrics: null,
      setMetrics: (m) => set({ metrics: m }),
      scriptModal: { open: false, type: '' },
      openScriptModal: (type, context) => set({ scriptModal: { open: true, type, context } }),
      closeScriptModal: () => set({ scriptModal: { open: false, type: '' } }),
      notifications: [],
      addNotification: (n) => {
        const id = Date.now().toString();
        set((s) => ({ notifications: [...s.notifications, { ...n, id }] }));
        // Auto-dismiss after 4s
        setTimeout(() => {
          set((s) => ({ notifications: s.notifications.filter(x => x.id !== id) }));
        }, 4000);
      },
      removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) })),
    }),
    {
      name: 'agrodesk-auth',
      partialize: (s) => ({ token: s.token, dealer: s.dealer }),
    }
  )
);
