import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Contact, UsedTractor, RecoveryCase, Campaign, Document, Accountant, DashboardMetrics } from '../types';

export interface KBEntry {
  id: string;
  text: string;
  source: 'manual' | 'pdf';
  filename?: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_KB: Record<string, KBEntry[]> = {
  'Tractor Catalog': [
    { id: 'tc1', text: 'John Deere 5310 – 55 HP, 4WD, Price: ₹8.5L – ₹9.2L. Best for medium farms.', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: 'tc2', text: 'Mahindra 575 DI – 45 HP, 2WD, Price: ₹6.2L – ₹7.0L. Popular in Maharashtra.', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: 'tc3', text: 'Kubota MU5501 – 55 HP, 4WD, Price: ₹9.8L – ₹10.5L. Japan technology, fuel efficient.', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ],
  'Pricing & Offers': [
    { id: 'po1', text: 'Kharif Season Offer: ₹25,000 cashback on all John Deere tractors above ₹8L. Valid till 30 June 2024.', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: 'po2', text: 'Exchange offer: Trade-in old tractor and get ₹50,000 additional discount on new purchase.', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ],
  'EMI Calculator': [
    { id: 'em1', text: 'John Deere Finance: 7.5% p.a. for 48 months. ₹8.5L tractor = ₹20,500/month EMI.', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: 'em2', text: 'SBI Tractor Loan: 8.25% p.a., up to 7 years. Minimum 15% down payment required.', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ],
  'FAQs': [
    { id: 'fq1', text: 'Q: What documents are needed for a tractor loan? A: Aadhaar, PAN, 7/12 Utara, 6-month bank statement, passport photo.', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: 'fq2', text: 'Q: How long does loan approval take? A: 3–5 working days for complete documents. SBI takes 7 days.', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ],
  'Warranty & Service': [
    { id: 'ws1', text: 'John Deere: 2-year standard warranty. Extended warranty available for ₹18,000 (2 additional years).', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: 'ws2', text: 'Free first service at 50 hours or 3 months (whichever is earlier). Second service at 250 hours.', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ],
  'Govt Schemes (PM-KISAN)': [
    { id: 'gk1', text: 'PM-KISAN: ₹6,000/year direct benefit to eligible farmers in 3 instalments. Apply at pmkisan.gov.in.', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: 'gk2', text: 'SMAM Scheme: 50–80% subsidy on farm machinery including tractors for SC/ST farmers.', source: 'manual', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ],
};

interface DealerProfile {
  id: string;
  name: string;
  city: string;
  district?: string;
  state?: string;
  language: string;
  phone?: string;
  plan?: string;
  is_demo?: boolean;
  brand_ids?: string[];
  business_type?: string | null;
  onboarding_status?: string;
  onboarding_step?: number;
}

interface AppStore {
  // Auth
  token: string | null;
  dealer: DealerProfile | null;
  setAuth: (token: string, dealer: DealerProfile) => void;
  clearAuth: () => void;
  setLanguage: (language: string) => void;
  updateDealer: (patch: Partial<DealerProfile>) => void;

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

  // Theme
  theme: 'dark' | 'light' | 'night';
  setTheme: (theme: 'dark' | 'light' | 'night') => void;

  // Dealership logo
  dealerLogo: string | null;
  setDealerLogo: (logo: string | null) => void;

  // Knowledge Base (AI Salesman)
  knowledgeBase: Record<string, KBEntry[]>;
  addKBEntry: (category: string, entry: KBEntry) => void;
  updateKBEntry: (category: string, id: string, text: string) => void;
  deleteKBEntry: (category: string, id: string) => void;
  setKBEntries: (category: string, entries: KBEntry[]) => void;

  // Notifications
  notifications: { id: string; title: string; message: string; type: 'success' | 'error' | 'info'; }[];
  toasts: { id: string; title: string; message: string; type: 'success' | 'error' | 'info'; }[];
  addNotification: (n: Omit<AppStore['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      token: null,
      dealer: null,
      setAuth: (token, dealer) => set({ token, dealer }),
      clearAuth: () => set({ token: null, dealer: null }),
      setLanguage: (language) => set((s) => ({ dealer: s.dealer ? { ...s.dealer, language } : s.dealer })),
      updateDealer: (patch) => set((s) => ({ dealer: s.dealer ? { ...s.dealer, ...patch } : s.dealer })),
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
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      dealerLogo: null,
      setDealerLogo: (logo) => set({ dealerLogo: logo }),
      knowledgeBase: DEFAULT_KB,
      addKBEntry: (category, entry) => set((s) => ({
        knowledgeBase: { ...s.knowledgeBase, [category]: [...(s.knowledgeBase[category] ?? []), entry] },
      })),
      updateKBEntry: (category, id, text) => set((s) => ({
        knowledgeBase: {
          ...s.knowledgeBase,
          [category]: (s.knowledgeBase[category] ?? []).map((e) =>
            e.id === id ? { ...e, text, updatedAt: new Date().toISOString() } : e
          ),
        },
      })),
      deleteKBEntry: (category, id) => set((s) => ({
        knowledgeBase: { ...s.knowledgeBase, [category]: (s.knowledgeBase[category] ?? []).filter((e) => e.id !== id) },
      })),
      setKBEntries: (category, entries) => set((s) => ({ knowledgeBase: { ...s.knowledgeBase, [category]: entries } })),
      notifications: [],
      toasts: [],
      addNotification: (n) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const notif = { ...n, id };
        set((s) => ({ notifications: [notif, ...s.notifications].slice(0, 50), toasts: [...s.toasts, notif] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }));
        }, 4000);
      },
      removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter(n => n.id !== id), toasts: s.toasts.filter(t => t.id !== id) })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
    }),
    {
       name: 'agrodesk-auth',
      partialize: (s) => ({ token: s.token, dealer: s.dealer, dealerLogo: s.dealerLogo, theme: s.theme, knowledgeBase: s.knowledgeBase }),
    }
  )
);
