import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';

/**
 * Demo account configuration.
 * This dealer is used for client demos. It is reset to a known-good state
 * on every login, and is blocked from triggering real outbound actions
 * (calls / SMS / WhatsApp / sends) or deleting data by the demoGuard middleware.
 */
export const DEMO_DEALER_ID = 'demo';
export const DEMO_PHONE = '+919999999999';
export const DEMO_PASSWORD = 'demo1234';

/**
 * Wipe the demo dealer's data and re-seed it to a fresh, known-good state.
 * Safe to call on every demo login. Only ever touches rows owned by the
 * demo dealer, never any real dealer's data.
 */
export async function resetDemoData(prisma: PrismaClient): Promise<void> {
  const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Ensure the demo dealer exists (and is flagged) before touching children.
  await prisma.dealer.upsert({
    where: { id: DEMO_DEALER_ID },
    update: { is_demo: true, password_hash, plan: 'demo' },
    create: {
      id: DEMO_DEALER_ID,
      name: 'AgroDesk Demo Dealership',
      city: 'Nashik',
      district: 'Nashik',
      state: 'Maharashtra',
      phone: DEMO_PHONE,
      email: 'demo@agrodesk.app',
      language: 'mr',
      plan: 'demo',
      is_demo: true,
      password_hash,
    },
  });

  const dealer_id = DEMO_DEALER_ID;

  // Delete child rows in FK-safe order (consents reference contacts).
  await prisma.consent.deleteMany({ where: { dealer_id } });
  await prisma.$transaction([
    prisma.contact.deleteMany({ where: { dealer_id } }),
    prisma.usedTractor.deleteMany({ where: { dealer_id } }),
    prisma.campaign.deleteMany({ where: { dealer_id } }),
    prisma.recoveryCase.deleteMany({ where: { dealer_id } }),
    prisma.document.deleteMany({ where: { dealer_id } }),
    prisma.accountant.deleteMany({ where: { dealer_id } }),
    prisma.agentJob.deleteMany({ where: { dealer_id } }),
  ]);

  // ─── Re-seed fresh demo data ──────────────────────────────────────────
  await prisma.contact.createMany({
    data: [
      { id: 'demo-c1', dealer_id, name: 'Ramesh Patil', phone: '9876543201', village: 'Sinnar', district: 'Nashik', language: 'mr', lead_status: 'qualified', score: 92, opt_in_whatsapp: true, opt_in_call: true, opt_in_sms: true },
      { id: 'demo-c2', dealer_id, name: 'Anil Deshmukh', phone: '9876543202', village: 'Igatpuri', district: 'Nashik', language: 'mr', lead_status: 'new', score: 74, opt_in_whatsapp: true, opt_in_call: false, opt_in_sms: true },
      { id: 'demo-c3', dealer_id, name: 'Suresh Jadhav', phone: '9876543203', village: 'Yeola', district: 'Nashik', language: 'mr', lead_status: 'proposal', score: 88, opt_in_whatsapp: true, opt_in_call: true, opt_in_sms: false },
      { id: 'demo-c4', dealer_id, name: 'Dinesh Kamble', phone: '9876543204', village: 'Dindori', district: 'Nashik', language: 'hi', lead_status: 'contacted', score: 61, opt_in_whatsapp: false, opt_in_call: true, opt_in_sms: true },
      { id: 'demo-c5', dealer_id, name: 'Prakash More', phone: '9876543205', village: 'Malegaon', district: 'Nashik', language: 'mr', lead_status: 'won', score: 95, opt_in_whatsapp: true, opt_in_call: true, opt_in_sms: true },
      { id: 'demo-c6', dealer_id, name: 'Vijay Shinde', phone: '9876543206', village: 'Niphad', district: 'Nashik', language: 'mr', lead_status: 'new', score: 45, opt_in_whatsapp: true, opt_in_call: false, opt_in_sms: false },
    ],
  });

  await prisma.usedTractor.createMany({
    data: [
      { id: 'demo-t1', dealer_id, make: 'Sonalika', model: 'DI 745 III', year: 2019, hours: 3200, asking_price: 520000, cost_price: 480000, condition: 'good', status: 'available', urgency_score: 72, days_on_lot: 45 },
      { id: 'demo-t2', dealer_id, make: 'John Deere', model: '5310', year: 2020, hours: 2100, asking_price: 780000, cost_price: 720000, condition: 'excellent', status: 'available', urgency_score: 38, days_on_lot: 18 },
      { id: 'demo-t3', dealer_id, make: 'Mahindra', model: '575 DI', year: 2017, hours: 4800, asking_price: 340000, cost_price: 310000, condition: 'fair', status: 'available', urgency_score: 89, days_on_lot: 88 },
    ],
  });

  await prisma.recoveryCase.createMany({
    data: [
      { id: 'demo-r1', dealer_id, customer_name: 'Anil Kamble', phone: '9876543210', amount_due: 185000, due_date: new Date('2024-11-15'), escalation_stage: 'firm', status: 'active', channel_history: [] },
      { id: 'demo-r2', dealer_id, customer_name: 'Raju Pawar', phone: '9876543211', amount_due: 92000, due_date: new Date('2024-12-01'), escalation_stage: 'gentle', status: 'active', channel_history: [] },
      { id: 'demo-r3', dealer_id, customer_name: 'Santosh Gaikwad', phone: '9876543212', amount_due: 340000, due_date: new Date('2024-10-20'), escalation_stage: 'legal', status: 'active', channel_history: [] },
    ],
  });

  await prisma.campaign.createMany({
    data: [
      { id: 'demo-camp1', dealer_id, name: 'Rabi Season Outreach 2025', goal: 'Re-engage farmers for the Rabi season', channels: ['whatsapp'], status: 'running', total_contacts: 450, sent: 312, responses: 67, interested: 23 },
      { id: 'demo-camp2', dealer_id, name: 'Used Tractor Clearance', goal: 'Move aging used-tractor stock', channels: ['voice'], status: 'idle', total_contacts: 120, sent: 0, responses: 0, interested: 0 },
    ],
  });

  await prisma.accountant.create({
    data: { id: 'demo-acc1', dealer_id, name: 'CA Mehta & Associates', phone: '9876500001', email: 'mehta@caoffice.com', is_default: true, tally_enabled: true },
  });
}
