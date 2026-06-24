import type { Contact, UsedTractor, RecoveryCase, Campaign, Accountant, DashboardMetrics } from '../types';

export const mockMetrics: DashboardMetrics = {
  total_leads: 847, new_leads_today: 23, active_campaigns: 4,
  pending_recovery: 18, recovery_amount: 4320000, used_tractors: 12,
  monthly_sales: 34, calls_today: 156, whatsapp_today: 312, conversion_rate: 18.4,
};

export const mockContacts: Contact[] = [
  { id: 'c1', dealer_id: 'd1', name: 'Ramesh Patil', phone: '+919876543210', village: 'Sinnar', district: 'Nashik', state: 'Maharashtra', language: 'mr', lead_status: 'qualified', score: 82, tags: ['hot-lead','mahindra'], last_contact: '2024-01-15T10:30:00Z', created_at: '2024-01-01T00:00:00Z', opt_in_whatsapp: true, opt_in_sms: true, opt_in_call: true },
  { id: 'c2', dealer_id: 'd1', name: 'Suresh Kumar', phone: '+917654321098', village: 'Igatpuri', district: 'Nashik', state: 'Maharashtra', language: 'hi', lead_status: 'contacted', score: 65, tags: ['warm'], last_contact: '2024-01-14T14:00:00Z', created_at: '2024-01-05T00:00:00Z', opt_in_whatsapp: true, opt_in_sms: false, opt_in_call: true },
  { id: 'c3', dealer_id: 'd1', name: 'Dinesh Jadhav', phone: '+918765432109', village: 'Yeola', district: 'Nashik', state: 'Maharashtra', language: 'mr', lead_status: 'proposal', score: 91, tags: ['hot-lead','john-deere','financing'], last_contact: '2024-01-15T09:00:00Z', created_at: '2024-01-03T00:00:00Z', opt_in_whatsapp: true, opt_in_sms: true, opt_in_call: true },
  { id: 'c4', dealer_id: 'd1', name: 'Vijay Shinde', phone: '+919123456789', village: 'Dindori', district: 'Nashik', state: 'Maharashtra', language: 'mr', lead_status: 'new', score: 40, tags: ['cold'], created_at: '2024-01-14T00:00:00Z', opt_in_whatsapp: false, opt_in_sms: true, opt_in_call: true },
  { id: 'c5', dealer_id: 'd1', name: 'Santosh More', phone: '+916543210987', village: 'Niphad', district: 'Nashik', state: 'Maharashtra', language: 'mr', lead_status: 'won', score: 100, tags: ['customer','mahindra','575DI'], last_contact: '2024-01-12T11:00:00Z', created_at: '2023-12-20T00:00:00Z', opt_in_whatsapp: true, opt_in_sms: true, opt_in_call: true },
  { id: 'c6', dealer_id: 'd1', name: 'Prakash Desai', phone: '+918901234567', village: 'Malegaon', district: 'Nashik', state: 'Maharashtra', language: 'mr', lead_status: 'negotiation', score: 78, tags: ['warm','tafe'], last_contact: '2024-01-13T15:30:00Z', created_at: '2023-12-28T00:00:00Z', opt_in_whatsapp: true, opt_in_sms: true, opt_in_call: false },
];

export const mockUsedTractors: UsedTractor[] = [
  { id: 'ut1', make: 'Mahindra', model: '575 DI', year: 2019, hours: 2800, asking_price: 420000, cost_price: 350000, days_on_lot: 45, urgency_score: 78, condition: 'good', photos: [], status: 'available', ai_description: 'Well-maintained Mahindra 575 DI, 2019 model with 2800 hours. Ideal for medium farm operations. Full service history available.', created_at: '2023-11-30T00:00:00Z' },
  { id: 'ut2', make: 'John Deere', model: '5310', year: 2018, hours: 3500, asking_price: 580000, cost_price: 480000, days_on_lot: 62, urgency_score: 89, condition: 'good', photos: [], status: 'available', ai_description: 'Powerful John Deere 5310, 2018 model. Excellent engine condition, recently serviced. Suitable for large farm operations.', created_at: '2023-11-15T00:00:00Z' },
  { id: 'ut3', make: 'TAFE', model: '45 DI', year: 2020, hours: 1200, asking_price: 320000, cost_price: 275000, days_on_lot: 18, urgency_score: 35, condition: 'excellent', photos: [], status: 'available', ai_description: 'Like-new TAFE 45 DI, 2020 model with just 1200 hours. Excellent condition with minimal wear.', created_at: '2023-12-25T00:00:00Z' },
  { id: 'ut4', make: 'Sonalika', model: 'DI 745 III', year: 2017, hours: 4200, asking_price: 280000, cost_price: 240000, days_on_lot: 88, urgency_score: 95, condition: 'fair', photos: [], status: 'available', ai_description: 'Sonalika DI 745 III, 2017 model, 4200 hours. Priced to sell. Engine overhauled, ready for work.', created_at: '2023-09-15T00:00:00Z' },
  { id: 'ut5', make: 'Kubota', model: 'MU5502', year: 2021, hours: 800, asking_price: 650000, cost_price: 560000, days_on_lot: 10, urgency_score: 20, condition: 'excellent', photos: [], status: 'reserved', ai_description: 'Premium Kubota MU5502, 2021 model. Nearly new condition.', created_at: '2024-01-01T00:00:00Z' },
];

export const mockRecoveryCases: RecoveryCase[] = [
  { id: 'r1', customer_name: 'Anil Kamble', phone: '+919876501234', amount_due: 185000, due_date: '2023-12-01', escalation_stage: 'firm', last_contact: '2024-01-14T10:00:00Z', ptp_date: '2024-01-20', ptp_amount: 185000, status: 'active', channel_history: [{ channel: 'voice', date: '2024-01-14T10:00:00Z', outcome: 'PTP given for Jan 20' }, { channel: 'whatsapp', date: '2024-01-10T09:00:00Z', outcome: 'Message delivered, no reply' }] },
  { id: 'r2', customer_name: 'Bapu Gaikwad', phone: '+918765012345', amount_due: 320000, due_date: '2023-11-15', escalation_stage: 'stern', last_contact: '2024-01-13T14:00:00Z', status: 'active', channel_history: [{ channel: 'voice', date: '2024-01-13T14:00:00Z', outcome: 'Call connected, payment in 15 days' }, { channel: 'sms', date: '2024-01-08T09:00:00Z', outcome: 'SMS sent' }] },
  { id: 'r3', customer_name: 'Chandrakant Wagh', phone: '+917654012345', amount_due: 95000, due_date: '2024-01-05', escalation_stage: 'gentle', last_contact: '2024-01-15T11:00:00Z', ptp_date: '2024-01-18', status: 'active', channel_history: [{ channel: 'whatsapp', date: '2024-01-15T11:00:00Z', outcome: 'Seen, replied - will pay by 18th' }] },
  { id: 'r4', customer_name: 'Dattatray Bhosale', phone: '+916543012345', amount_due: 750000, due_date: '2023-10-01', escalation_stage: 'legal', status: 'active', channel_history: [{ channel: 'voice', date: '2024-01-10T09:00:00Z', outcome: 'Refused to pay' }] },
];

export const mockCampaigns: Campaign[] = [
  { id: 'camp1', name: 'Rabi Season Outreach 2024', goal: 'Generate enquiries for new tractors before Rabi season', channels: ['voice', 'whatsapp', 'sms'], status: 'running', total_contacts: 450, sent: 312, responses: 87, interested: 34, created_at: '2024-01-10T00:00:00Z', language: 'mr' },
  { id: 'camp2', name: 'Used Tractor Buyers - Jan 2024', goal: 'Sell used tractor inventory to budget buyers', channels: ['whatsapp', 'voice'], status: 'running', total_contacts: 200, sent: 156, responses: 42, interested: 18, created_at: '2024-01-12T00:00:00Z', language: 'mr' },
  { id: 'camp3', name: 'Spare Parts Promotion', goal: 'Promote discount on genuine spare parts', channels: ['whatsapp', 'sms'], status: 'paused', total_contacts: 380, sent: 200, responses: 45, interested: 22, created_at: '2024-01-08T00:00:00Z', language: 'hi' },
  { id: 'camp4', name: 'PM-KISAN Subsidy Alert', goal: 'Inform farmers about tractor subsidies post PM-KISAN', channels: ['whatsapp'], status: 'idle', total_contacts: 600, sent: 0, responses: 0, interested: 0, created_at: '2024-01-14T00:00:00Z', language: 'mr' },
];

export const mockAccountants: Accountant[] = [
  { id: 'acc1', name: 'CA Suresh Mehta', phone: '+919823456780', email: 'suresh@mehta-ca.com', tally_enabled: true, is_default: true },
  { id: 'acc2', name: 'Priya Shah (Internal)', phone: '+919712345678', email: 'priya@rajeshagency.com', tally_enabled: false, is_default: false },
];
