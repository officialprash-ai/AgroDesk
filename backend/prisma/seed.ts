import { PrismaClient } from '@prisma/client';
import { resetDemoData, DEMO_DEALER_ID, DEMO_PHONE, DEMO_PASSWORD } from '../src/lib/demoSeed.js';
import { TRACTOR_BRANDS } from '../src/lib/brands.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding AgroDesk...');

  // Brand catalog
  const brands = await Promise.all(
    TRACTOR_BRANDS.map(name => prisma.brand.upsert({ where: { name }, update: {}, create: { name } })),
  );
  console.log('Brands:', brands.length);

  // Create demo dealer
  const dealer = await prisma.dealer.upsert({
    where: { id: 'd1' },
    update: {},
    create: {
      id: 'd1',
      name: 'Rajesh Tractor Agency',
      city: 'Nashik',
      district: 'Nashik',
      state: 'Maharashtra',
      phone: '+919876543210',
      email: 'rajesh@example.com',
      language: 'mr',
      plan: 'growth',
      business_type: 'both',
      onboarding_status: 'active',
      onboarding_step: 4,
      brand_ids: brands.filter(b => ['Mahindra', 'Sonalika', 'John Deere'].includes(b.name)).map(b => b.id),
    },
  });
  console.log('Dealer:', dealer.name);

  // Contacts
  const contacts = await Promise.all([
    prisma.contact.upsert({ where: { id: 'c1' }, update: {}, create: { id: 'c1', dealer_id: 'd1', name: 'Ramesh Patil', phone: '9876543201', village: 'Sinnar', district: 'Nashik', language: 'mr', lead_status: 'qualified', score: 92, opt_in_whatsapp: true, opt_in_call: true, opt_in_sms: true } }),
    prisma.contact.upsert({ where: { id: 'c2' }, update: {}, create: { id: 'c2', dealer_id: 'd1', name: 'Anil Deshmukh', phone: '9876543202', village: 'Igatpuri', district: 'Nashik', language: 'mr', lead_status: 'new', score: 74, opt_in_whatsapp: true, opt_in_call: false, opt_in_sms: true } }),
    prisma.contact.upsert({ where: { id: 'c3' }, update: {}, create: { id: 'c3', dealer_id: 'd1', name: 'Suresh Jadhav', phone: '9876543203', village: 'Yeola', district: 'Nashik', language: 'mr', lead_status: 'proposal', score: 88, opt_in_whatsapp: true, opt_in_call: true, opt_in_sms: false } }),
    prisma.contact.upsert({ where: { id: 'c4' }, update: {}, create: { id: 'c4', dealer_id: 'd1', name: 'Dinesh Kamble', phone: '9876543204', village: 'Dindori', district: 'Nashik', language: 'hi', lead_status: 'contacted', score: 61, opt_in_whatsapp: false, opt_in_call: true, opt_in_sms: true } }),
    prisma.contact.upsert({ where: { id: 'c5' }, update: {}, create: { id: 'c5', dealer_id: 'd1', name: 'Prakash More', phone: '9876543205', village: 'Malegaon', district: 'Nashik', language: 'mr', lead_status: 'won', score: 95, opt_in_whatsapp: true, opt_in_call: true, opt_in_sms: true } }),
    prisma.contact.upsert({ where: { id: 'c6' }, update: {}, create: { id: 'c6', dealer_id: 'd1', name: 'Vijay Shinde', phone: '9876543206', village: 'Niphad', district: 'Nashik', language: 'mr', lead_status: 'new', score: 45, opt_in_whatsapp: true, opt_in_call: false, opt_in_sms: false } }),
  ]);
  console.log('Contacts:', contacts.length);

  // Used Tractors
  const tractors = await Promise.all([
    prisma.usedTractor.upsert({ where: { id: 't1' }, update: {}, create: { id: 't1', dealer_id: 'd1', make: 'Sonalika', model: 'DI 745 III', year: 2019, hours: 3200, asking_price: 520000, cost_price: 480000, condition: 'good', status: 'available', urgency_score: 72, days_on_lot: 45 } }),
    prisma.usedTractor.upsert({ where: { id: 't2' }, update: {}, create: { id: 't2', dealer_id: 'd1', make: 'John Deere', model: '5310', year: 2020, hours: 2100, asking_price: 780000, cost_price: 720000, condition: 'excellent', status: 'available', urgency_score: 38, days_on_lot: 18 } }),
    prisma.usedTractor.upsert({ where: { id: 't3' }, update: {}, create: { id: 't3', dealer_id: 'd1', make: 'Mahindra', model: '575 DI', year: 2017, hours: 4800, asking_price: 340000, cost_price: 310000, condition: 'fair', status: 'available', urgency_score: 89, days_on_lot: 88 } }),
  ]);
  console.log('Tractors:', tractors.length);

  // Recovery Cases
  const recovery = await Promise.all([
    prisma.recoveryCase.upsert({ where: { id: 'r1' }, update: {}, create: { id: 'r1', dealer_id: 'd1', customer_name: 'Anil Kamble', phone: '9876543210', amount_due: 185000, due_date: new Date('2024-11-15'), escalation_stage: 'firm', status: 'active', channel_history: [] } }),
    prisma.recoveryCase.upsert({ where: { id: 'r2' }, update: {}, create: { id: 'r2', dealer_id: 'd1', customer_name: 'Raju Pawar', phone: '9876543211', amount_due: 92000, due_date: new Date('2024-12-01'), escalation_stage: 'gentle', status: 'active', channel_history: [] } }),
    prisma.recoveryCase.upsert({ where: { id: 'r3' }, update: {}, create: { id: 'r3', dealer_id: 'd1', customer_name: 'Santosh Gaikwad', phone: '9876543212', amount_due: 340000, due_date: new Date('2024-10-20'), escalation_stage: 'legal', status: 'active', channel_history: [] } }),
  ]);
  console.log('Recovery cases:', recovery.length);

  // Campaigns
  const campaigns = await Promise.all([
    prisma.campaign.upsert({ where: { id: 'camp1' }, update: {}, create: { id: 'camp1', dealer_id: 'd1', name: 'Rabi Season Outreach 2025', goal: 'Re-engage farmers for the Rabi season', channels: ['whatsapp'], status: 'running', total_contacts: 450, sent: 312, responses: 67, interested: 23 } }),
    prisma.campaign.upsert({ where: { id: 'camp2' }, update: {}, create: { id: 'camp2', dealer_id: 'd1', name: 'Used Tractor Clearance', goal: 'Move aging used-tractor stock', channels: ['voice'], status: 'idle', total_contacts: 120, sent: 0, responses: 0, interested: 0 } }),
  ]);
  console.log('Campaigns:', campaigns.length);

  // Accountant
  await prisma.accountant.upsert({
    where: { id: 'acc1' },
    update: {},
    create: { id: 'acc1', dealer_id: 'd1', name: 'CA Mehta & Associates', phone: '9876500001', email: 'mehta@caoffice.com', is_default: true, tally_enabled: true },
  });
  console.log('Accountant seeded');

  // ─── Demo account (for client demos) ──────────────────────────────────
  await resetDemoData(prisma);
  console.log(`Demo account seeded → phone ${DEMO_PHONE} / password ${DEMO_PASSWORD} (id: ${DEMO_DEALER_ID})`);

  console.log('\nSeed complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
