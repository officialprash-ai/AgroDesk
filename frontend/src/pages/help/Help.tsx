import React, { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui';
import {
  ChevronDown, ChevronUp, HelpCircle, BookOpen, Phone, PlayCircle,
  Megaphone, Truck, IndianRupee, Bot, FileText, Users, Zap,
  MessageCircle, Mail, ExternalLink, Rocket, Lightbulb, Search,
  CheckCircle, Star
} from 'lucide-react';
import { cn } from '../../lib/utils';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface FAQ { q: string; a: string; }
interface FAQGroup { topic: string; items: FAQ[]; }
interface AgentGuide { icon: React.ElementType; label: string; badge: string; color: string; steps: string[]; tip: string; }
interface VideoCard { title: string; duration: string; tag: string; }

/* ─── Data ───────────────────────────────────────────────────────────────── */
const FAQ_GROUPS: FAQGroup[] = [
  {
    topic: 'Getting Started',
    items: [
      { q: 'What is AgroDesk?', a: 'AgroDesk is an AI-powered dealer intelligence platform built specifically for tractor and agri-equipment dealerships. It combines CRM, outreach agents, money recovery, and AI-driven sales tools into one unified workspace.' },
      { q: 'How do I add my first contact?', a: 'Go to CRM → Contacts and click "Add Contact". Fill in the customer\'s name, phone number, district, and interest. AgroDesk auto-scores each lead based on their profile.' },
      { q: 'How do I change the language of the platform?', a: 'Click the language globe icon in the top header. AgroDesk supports Marathi, Hindi, English, Telugu, Kannada, and several other regional languages. The selected language is saved across sessions.' },
      { q: 'Is my data safe?', a: 'Yes. All data is encrypted in transit (HTTPS/TLS) and at rest. Demo accounts use isolated sample data. Production accounts are isolated per dealership ID with row-level security.' },
    ],
  },
  {
    topic: 'AI Agents',
    items: [
      { q: 'What are AI Agents?', a: 'AI Agents are automated outreach workflows powered by large language models. Each agent handles a specific task — cold calling scripts, WhatsApp follow-ups, recovery reminders, or sales conversations — without manual effort.' },
      { q: 'Can I preview what an agent will say before it runs?', a: 'Yes. Every agent has an "AI Script" button that lets you preview and customise the script before launching. Click the script icon on any agent card to open the Script Studio.' },
      { q: 'How many contacts can I run a campaign on at once?', a: 'Each campaign can target up to 500 contacts in the current plan. Contacts are filtered by score, region, and interest before outreach begins.' },
      { q: 'Are agent calls real?', a: 'In Demo Mode, all calls and messages are simulated — no actual calls or messages are sent. In a live account, outbound actions use your configured Twilio credentials.' },
    ],
  },
  {
    topic: 'CRM & Leads',
    items: [
      { q: 'What does the lead score mean?', a: 'AgroDesk scores each contact from 0–100 based on engagement history, recency, district demand, and tractor interest. Scores above 70 appear in the "Hot Leads" section of the Dashboard.' },
      { q: 'Can I import existing contacts?', a: 'Contact import via CSV is on the roadmap for Q2 2024. Currently, contacts can be added individually or created automatically when a lead comes through the AI Salesman channel.' },
      { q: 'What is the Pipeline view?', a: 'The Pipeline (CRM → Pipeline) shows a Kanban-style board of your deals across stages: New Lead → Contacted → Demo Scheduled → Negotiation → Closed. Drag cards to update stages.' },
    ],
  },
  {
    topic: 'Billing & Plans',
    items: [
      { q: 'What plan am I on?', a: 'Your current plan is shown in Settings → Profile under "Dealership Information". Demo accounts run on the Starter plan with unlimited access to all features for evaluation.' },
      { q: 'How do I upgrade my plan?', a: 'Contact our support team via WhatsApp or email (details in the Contact Support section below) to discuss plan options for your dealership size.' },
    ],
  },
];

const AGENT_GUIDES: AgentGuide[] = [
  {
    icon: Megaphone, label: 'Sales Engine', badge: 'A', color: '#4ade80',
    steps: [
      'Go to Sales Engine from the sidebar.',
      'Select a target segment (e.g. Hot Leads, specific district).',
      'Preview the AI-generated WhatsApp message.',
      'Click "Launch Campaign" to begin outreach.',
      'Track opens and replies in real time.',
    ],
    tip: 'Best time to run: Tuesday–Thursday mornings between 9–11 AM for highest response rates.',
  },
  {
    icon: Truck, label: 'Used Tractor', badge: 'B', color: '#60a5fa',
    steps: [
      'Navigate to Used Tractor in the sidebar.',
      'Add a used tractor listing with model, year, hours, and price.',
      'AgroDesk auto-matches it with interested buyers from your CRM.',
      'Launch a targeted outreach campaign to matched buyers.',
      'Manage enquiries directly from the listing card.',
    ],
    tip: 'Add high-quality photos and a fair valuation to improve buyer interest by 3×.',
  },
  {
    icon: IndianRupee, label: 'Money Recovery', badge: 'C', color: '#fbbf24',
    steps: [
      'Go to Money Recovery and add a recovery case.',
      'Set the amount due, due date, and customer contact.',
      'Select a recovery message tone (Gentle / Firm / Final Notice).',
      'AI sends a personalised reminder via WhatsApp or SMS.',
      'Track payment status and send follow-ups automatically.',
    ],
    tip: 'Gentle tone on day 1, escalate to Firm after 7 days. Avoid weekends for best response.',
  },
  {
    icon: Phone, label: 'Cold Calling', badge: 'D', color: '#a78bfa',
    steps: [
      'Go to Cold Calling and select a contact list.',
      'AgroDesk generates a personalised call script per contact.',
      'Review and customise the script if needed.',
      'Initiate the AI-assisted call session.',
      'After each call, log the outcome (Interested / Follow-up / Not Interested).',
    ],
    tip: 'Calls under 90 seconds with a clear value proposition convert 40% better.',
  },
  {
    icon: Bot, label: 'AI Salesman', badge: 'E', color: '#34d399',
    steps: [
      'Go to AI Salesman to access your virtual sales assistant.',
      'Describe the customer scenario or paste a WhatsApp message.',
      'AI generates a contextual sales response in the chosen language.',
      'Review, edit, and copy the message to send.',
      'Use the "Objection Handler" to prepare for common pushbacks.',
    ],
    tip: 'Use the regional language mode — customers respond 2× better to messages in their mother tongue.',
  },
  {
    icon: FileText, label: 'AI Accountant', badge: 'F', color: '#fb923c',
    steps: [
      'Go to AI Accountant and upload a document or paste text.',
      'Select the document type: Invoice, Loan Statement, or Service Report.',
      'AI extracts and structures the key figures.',
      'Review the summary and download as PDF or share internally.',
    ],
    tip: 'Works best with scanned PDFs of 1–4 pages. Multi-page statements may require splitting.',
  },
];

const VIDEO_CARDS: VideoCard[] = [
  { title: 'AgroDesk in 5 Minutes', duration: '5:12', tag: 'Quickstart' },
  { title: 'Setting Up Your CRM', duration: '8:40', tag: 'CRM' },
  { title: 'Running Your First Campaign', duration: '6:25', tag: 'Agents' },
  { title: 'Money Recovery Masterclass', duration: '11:03', tag: 'Recovery' },
  { title: 'AI Salesman Deep Dive', duration: '9:17', tag: 'AI' },
  { title: 'Dashboard & Analytics Tour', duration: '7:54', tag: 'Analytics' },
];

const QUICK_TIPS = [
  'Use the Pipeline Kanban to track deals visually — drag cards between stages.',
  'The Dashboard "Hot Leads" card shows contacts scored 70+ — act on these first.',
  'Press the theme toggle in the header to switch between Dark, Light, and Night modes.',
  'Upload your dealership logo in Settings → Profile to personalise your workspace.',
  'Each AI agent has a "Script Studio" — always preview before launching.',
  'Filter contacts by district to run hyper-local campaigns.',
];

/* ─── Sub-components ─────────────────────────────────────────────────────── */

const FAQAccordion: React.FC<{ group: FAQGroup }> = ({ group }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-muted)] mb-3">{group.topic}</p>
      <div className="space-y-2">
        {group.items.map((item, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] overflow-hidden transition-all">
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[rgba(255,255,255,0.03)] transition-colors"
            >
              <span className="text-sm font-medium text-[var(--text-primary)] pr-4">{item.q}</span>
              {openIdx === i
                ? <ChevronUp size={15} className="text-brand-400 flex-shrink-0" />
                : <ChevronDown size={15} className="text-[var(--text-muted)] flex-shrink-0" />}
            </button>
            {openIdx === i && (
              <div className="px-4 pb-4 text-sm text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-3 bg-[rgba(255,255,255,0.02)]">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const AgentCard: React.FC<{ guide: AgentGuide }> = ({ guide }) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = guide.icon;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[rgba(255,255,255,0.03)] transition-colors"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${guide.color}18`, border: `1px solid ${guide.color}30` }}>
          <Icon size={16} style={{ color: guide.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{guide.label}</p>
          <p className="text-[11px] text-[var(--text-muted)]">Agent {guide.badge} · Quick start guide</p>
        </div>
        {expanded
          ? <ChevronUp size={15} className="text-brand-400 flex-shrink-0" />
          : <ChevronDown size={15} className="text-[var(--text-muted)] flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3 bg-[rgba(255,255,255,0.02)]">
          <ol className="space-y-2">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <span className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: `${guide.color}20`, color: guide.color }}>
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="flex items-start gap-2 rounded-xl p-3 bg-[rgba(34,197,94,0.06)] border border-[rgba(34,197,94,0.15)]">
            <Lightbulb size={13} className="text-brand-400 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[var(--text-secondary)]"><span className="font-semibold text-brand-400">Pro tip: </span>{guide.tip}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export const Help: React.FC = () => {
  const [faqSearch, setFaqSearch] = useState('');
  const [activeSection, setActiveSection] = useState<'faq' | 'agents' | 'contact' | 'videos' | 'tips'>('faq');

  const filteredGroups: FAQGroup[] = FAQ_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(
      item =>
        !faqSearch ||
        item.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
        item.a.toLowerCase().includes(faqSearch.toLowerCase())
    ),
  })).filter(g => g.items.length > 0);

  const NAV_TABS = [
    { key: 'faq',     icon: HelpCircle,   label: 'FAQs' },
    { key: 'agents',  icon: BookOpen,      label: 'Agent Guides' },
    { key: 'contact', icon: Phone,         label: 'Contact Support' },
    { key: 'videos',  icon: PlayCircle,    label: 'Video Tutorials' },
    { key: 'tips',    icon: Lightbulb,     label: 'Quick Tips' },
  ] as const;

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Help & Support" subtitle="Guides, FAQs, and contact options for AgroDesk" />

      <div className="p-6 space-y-6 page-enter max-w-5xl">

        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-brand)] bg-[rgba(34,197,94,0.04)] px-8 py-6">
          {/* Decorative wheat — left */}
          <div className="absolute left-4 top-0 bottom-0 flex items-end gap-2 opacity-[0.15] pointer-events-none select-none" aria-hidden="true">
            {[0,1,2].map(i => (
              <svg key={i} className="h-16 w-5 text-brand-400" style={{ transform: `rotate(${[-4,0,5][i]}deg)` }} viewBox="0 0 20 56" fill="none">
                <line x1="10" y1="56" x2="10" y2="2" stroke="currentColor" strokeWidth="1.5"/>
                <ellipse cx="15" cy="10" rx="4" ry="2.2" fill="currentColor" transform="rotate(30 15 10)"/>
                <ellipse cx="5" cy="18" rx="4" ry="2.2" fill="currentColor" transform="rotate(-30 5 18)"/>
                <ellipse cx="15" cy="26" rx="4" ry="2.2" fill="currentColor" transform="rotate(30 15 26)"/>
                <ellipse cx="5" cy="34" rx="4" ry="2.2" fill="currentColor" transform="rotate(-30 5 34)"/>
                <ellipse cx="10" cy="4" rx="3" ry="1.8" fill="currentColor"/>
              </svg>
            ))}
          </div>

          <div className="pl-12 pr-16 text-center">
            <h2 className="font-display font-bold text-2xl text-[var(--text-primary)] mb-2">How can we help you?</h2>
            <p className="text-sm text-[var(--text-muted)] mb-5">Search FAQs, browse agent guides, or reach our support team directly.</p>
            <div className="relative max-w-md mx-auto">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={faqSearch}
                onChange={e => { setFaqSearch(e.target.value); setActiveSection('faq'); }}
                placeholder="Search FAQs..."
                className="ag-input pl-9 py-2.5 text-sm w-full rounded-xl"
              />
            </div>
          </div>

          {/* Tractor — right */}
          <div className="absolute right-5 top-0 bottom-0 flex items-center opacity-[0.12] pointer-events-none select-none" aria-hidden="true">
            <svg className="h-20 w-auto text-brand-400 tractor-float" viewBox="0 0 110 70" fill="none">
              <circle cx="28" cy="46" r="20" stroke="currentColor" strokeWidth="2.5"/>
              <circle cx="28" cy="46" r="13" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 4"/>
              <circle cx="28" cy="46" r="3" fill="currentColor"/>
              <line x1="28" y1="26" x2="28" y2="66" stroke="currentColor" strokeWidth="1"/>
              <line x1="8" y1="46" x2="48" y2="46" stroke="currentColor" strokeWidth="1"/>
              <line x1="14" y1="32" x2="42" y2="60" stroke="currentColor" strokeWidth="1"/>
              <line x1="42" y1="32" x2="14" y2="60" stroke="currentColor" strokeWidth="1"/>
              <circle cx="88" cy="52" r="14" stroke="currentColor" strokeWidth="2"/>
              <circle cx="88" cy="52" r="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3"/>
              <circle cx="88" cy="52" r="2.5" fill="currentColor"/>
              <rect x="30" y="38" width="60" height="7" rx="2.5" fill="currentColor" opacity="0.5"/>
              <rect x="34" y="16" width="24" height="25" rx="3" fill="currentColor" opacity="0.25"/>
              <rect x="34" y="16" width="24" height="25" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="38" y="20" width="16" height="12" rx="2" fill="currentColor" opacity="0.4"/>
              <rect x="57" y="21" width="22" height="18" rx="2" fill="currentColor" opacity="0.35"/>
              <rect x="76" y="12" width="4" height="13" rx="2" fill="currentColor" opacity="0.65"/>
            </svg>
          </div>
        </div>

        {/* Section nav */}
        <div className="flex gap-2 flex-wrap">
          {NAV_TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeSection === tab.key;
            return (
              <button key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                  active
                    ? 'bg-brand-400/10 border-brand-400/30 text-brand-400'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-bright)]'
                )}>
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── FAQs ── */}
        {activeSection === 'faq' && (
          <div className="space-y-8">
            {filteredGroups.length === 0 ? (
              <Card>
                <div className="py-12 text-center">
                  <HelpCircle size={32} className="text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-muted)]">No FAQs matched "<span className="text-[var(--text-primary)]">{faqSearch}</span>"</p>
                  <button onClick={() => setFaqSearch('')} className="mt-3 text-xs text-brand-400 hover:underline">Clear search</button>
                </div>
              </Card>
            ) : (
              filteredGroups.map(g => (
                <Card key={g.topic}>
                  <FAQAccordion group={g} />
                </Card>
              ))
            )}
          </div>
        )}

        {/* ── Agent Guides ── */}
        {activeSection === 'agents' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Rocket size={14} className="text-brand-400" />
              <p className="text-xs text-[var(--text-muted)]">Click any agent to expand its step-by-step guide and pro tip.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AGENT_GUIDES.map(guide => (
                <AgentCard key={guide.label} guide={guide} />
              ))}
            </div>
          </div>
        )}

        {/* ── Contact Support ── */}
        {activeSection === 'contact' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* WhatsApp */}
              <Card>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.2)]">
                    <MessageCircle size={20} className="text-brand-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] mb-0.5">WhatsApp Support</h3>
                    <p className="text-xs text-[var(--text-muted)] mb-3">Fastest response — typically under 2 hours during business hours.</p>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Mon–Sat · 9 AM – 7 PM IST</p>
                    <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors">
                      +91 99999 99999 <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </Card>

              {/* Email */}
              <Card>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[rgba(96,165,250,0.12)] border border-[rgba(96,165,250,0.2)]">
                    <Mail size={20} className="text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] mb-0.5">Email Support</h3>
                    <p className="text-xs text-[var(--text-muted)] mb-3">For detailed queries, billing, and account issues. Response within 24 hours.</p>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">Mon–Fri · 10 AM – 6 PM IST</p>
                    <a href="mailto:support@agrodesk.in"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                      support@agrodesk.in <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </Card>

              {/* Onboarding call */}
              <Card>
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[rgba(167,139,250,0.12)] border border-[rgba(167,139,250,0.2)]">
                    <Phone size={20} className="text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] mb-0.5">Book an Onboarding Call</h3>
                    <p className="text-xs text-[var(--text-muted)] mb-3">30-minute guided session with our product team to set up your dealership.</p>
                    <p className="text-xs text-[var(--text-secondary)] mb-1">By appointment · Tue / Thu / Sat</p>
                    <a href="mailto:support@agrodesk.in?subject=Onboarding Call Request"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                      Request a call <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </Card>

              {/* Response times */}
              <Card>
                <h3 className="font-display font-semibold text-sm text-[var(--text-primary)] mb-4">Support Response Times</h3>
                <div className="space-y-3">
                  {[
                    { channel: 'WhatsApp', time: '< 2 hours', dot: '#4ade80' },
                    { channel: 'Email', time: '< 24 hours', dot: '#60a5fa' },
                    { channel: 'Onboarding Call', time: '48-hour scheduling', dot: '#a78bfa' },
                    { channel: 'Critical / Outage', time: '< 30 minutes', dot: '#fb923c' },
                  ].map(row => (
                    <div key={row.channel} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.dot }} />
                        <span className="text-sm text-[var(--text-secondary)]">{row.channel}</span>
                      </div>
                      <span className="text-xs font-medium text-[var(--text-primary)]">{row.time}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border)]">
                  <p className="text-[11px] text-[var(--text-muted)]">Business hours: Mon–Sat, 9 AM – 7 PM IST. Critical support is available 24×7.</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── Video Tutorials ── */}
        {activeSection === 'videos' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle size={14} className="text-brand-400" />
              <p className="text-xs text-[var(--text-muted)]">Video tutorials are coming soon. Subscribe to our channel to be notified.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {VIDEO_CARDS.map((vid, i) => (
                <div key={i} className="rounded-2xl border border-[var(--border)] overflow-hidden group cursor-pointer hover:border-brand-400/30 transition-all">
                  {/* Thumbnail */}
                  <div className="relative h-36 bg-[var(--surface)] flex items-center justify-center">
                    {/* Field texture */}
                    <div className="absolute inset-0 opacity-30"
                      style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 18px, rgba(34,197,94,0.08) 18px, rgba(34,197,94,0.08) 20px)' }} />
                    <div className="w-12 h-12 rounded-full bg-brand-400/15 border border-brand-400/30 flex items-center justify-center group-hover:bg-brand-400/25 transition-all">
                      <PlayCircle size={22} className="text-brand-400" />
                    </div>
                    <span className="absolute bottom-2 right-3 text-[10px] font-mono font-bold text-[var(--text-muted)] bg-[rgba(0,0,0,0.5)] px-2 py-0.5 rounded-md">{vid.duration}</span>
                    <span className="absolute top-2 left-3 text-[9px] font-bold tracking-widest uppercase text-brand-400 bg-brand-400/10 border border-brand-400/20 px-2 py-0.5 rounded-md">{vid.tag}</span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{vid.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Coming soon</p>
                  </div>
                </div>
              ))}
            </div>
            <Card>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center justify-center flex-shrink-0">
                  <PlayCircle size={18} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Subscribe for Early Access</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">Video tutorials are in production. WhatsApp us to join the early access list and get notified when they go live.</p>
                </div>
                <a href="https://wa.me/919999999999?text=I%20want%20early%20access%20to%20AgroDesk%20tutorials"
                  target="_blank" rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-400/10 border border-brand-400/25 text-xs font-semibold text-brand-400 hover:bg-brand-400/20 transition-all">
                  Notify me <ExternalLink size={11} />
                </a>
              </div>
            </Card>
          </div>
        )}

        {/* ── Quick Tips ── */}
        {activeSection === 'tips' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {QUICK_TIPS.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-[var(--border)] px-4 py-3.5 bg-[var(--surface)] hover:border-brand-400/20 transition-all">
                  <CheckCircle size={14} className="text-brand-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[var(--text-secondary)]">{tip}</p>
                </div>
              ))}
            </div>

            {/* Getting started checklist */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Rocket size={15} className="text-brand-400" />
                <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Getting Started Checklist</h3>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Add your dealership logo in Settings → Profile', done: false },
                  { label: 'Import or add your first 10 contacts in CRM → Contacts', done: false },
                  { label: 'Set your preferred language in the header', done: false },
                  { label: 'Preview the Sales Engine campaign with your contacts', done: false },
                  { label: 'Add a used tractor listing and launch a buyer campaign', done: false },
                  { label: 'Create a money recovery case for a pending payment', done: false },
                  { label: 'Ask the AI Salesman to help handle a customer objection', done: false },
                ].map((item, i) => (
                  <ChecklistItem key={i} label={item.label} />
                ))}
              </div>
            </Card>

            {/* Platform status */}
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-brand-400" />
                  <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">Platform Status</h3>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-400">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-slow" />
                  All systems operational
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">Last checked: just now. No incidents reported in the last 30 days.</p>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
};

/* Checklist item with local toggle */
const ChecklistItem: React.FC<{ label: string }> = ({ label }) => {
  const [checked, setChecked] = useState(false);
  return (
    <button onClick={() => setChecked(!checked)}
      className="w-full flex items-center gap-3 text-left group">
      <div className={cn(
        'w-4.5 h-4.5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all',
        checked ? 'bg-brand-400 border-brand-400' : 'border-[var(--border)] group-hover:border-brand-400/50'
      )}>
        {checked && <CheckCircle size={11} className="text-surface-900" />}
      </div>
      <span className={cn('text-sm', checked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-secondary)]')}>{label}</span>
    </button>
  );
};
