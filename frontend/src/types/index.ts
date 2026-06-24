export type Language = 'mr' | 'hi' | 'en' | 'gu' | 'pa' | 'ta' | 'te' | 'kn' | 'bn';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type RecoveryStage = 'gentle' | 'firm' | 'stern' | 'legal';
export type AgentStatus = 'idle' | 'running' | 'paused' | 'error';
export type BillCategory = 'tractor_purchase' | 'tractor_sales' | 'spare_purchase' | 'spare_sales' | 'cash_voucher' | 'other';
export type CallStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'interested' | 'not_interested' | 'callback';
export type Channel = 'voice' | 'whatsapp' | 'sms' | 'email';

export interface Contact {
  id: string; dealer_id: string; name: string; phone: string; email?: string;
  village?: string; district?: string; state?: string; language: Language;
  lead_status: LeadStatus; score: number; tags: string[];
  last_contact?: string; created_at: string;
  opt_in_whatsapp: boolean; opt_in_sms: boolean; opt_in_call: boolean;
}

export interface UsedTractor {
  id: string; make: string; model: string; year: number; hours: number;
  asking_price: number; cost_price: number; days_on_lot: number;
  urgency_score: number; condition: 'excellent' | 'good' | 'fair' | 'poor';
  description?: string; photos: string[]; status: 'available' | 'reserved' | 'sold';
  ai_description?: string; created_at: string;
}

export interface RecoveryCase {
  id: string; customer_name: string; phone: string; amount_due: number;
  due_date: string; escalation_stage: RecoveryStage; last_contact?: string;
  ptp_date?: string; ptp_amount?: number; status: 'active' | 'resolved' | 'legal';
  channel_history: { channel: Channel; date: string; outcome: string }[];
}

export interface Campaign {
  id: string; name: string; goal: string; channels: Channel[];
  status: AgentStatus; total_contacts: number; sent: number;
  responses: number; interested: number; created_at: string; language: Language;
}

export interface Document {
  id: string; category: BillCategory; period_month: string;
  file_url?: string; filename?: string; ocr_data?: Record<string, unknown>;
  confirmed: boolean; tally_synced: boolean; uploaded_at?: string;
}

export interface Accountant {
  id: string; name: string; phone: string; email: string;
  tally_enabled: boolean; is_default: boolean;
}

export interface DashboardMetrics {
  total_leads: number; new_leads_today: number; active_campaigns: number;
  pending_recovery: number; recovery_amount: number; used_tractors: number;
  monthly_sales: number; calls_today: number; whatsapp_today: number;
  conversion_rate: number;
}
