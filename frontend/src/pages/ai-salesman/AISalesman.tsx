import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Badge, MetricCard, TabBar } from '../../components/ui';
import { useAppStore } from '../../store';
import type { KBEntry } from '../../store';
import {
  Bot, MessageSquare, CheckCircle, Zap, Users, Send, Phone, Globe,
  BookOpen, Tag, Calculator, HelpCircle, Wrench, Sprout, Search, Plus,
  Trash2, Pencil, X, FileUp, Save, ChevronRight, AlertTriangle,
  RefreshCw, Sparkles, UserCheck, Settings2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { MorphPanel } from '../../components/ui/MorphPanel';
import { useAppStore as useStore } from '../../store';

// ── PDF text extraction ───────────────────────────────────────────────────────
const extractTextFromPDF = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      const textBlocks = raw.match(/BT[\s\S]*?ET/g) ?? [];
      const text = textBlocks
        .join(' ')
        .replace(/\(([^)]+)\)/g, '$1')
        .replace(/[^\x20-\x7E\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      resolve(text || '(Could not extract text — please type or paste the content.)');
    };
    reader.readAsBinaryString(file);
  });

// ── KB Category config ────────────────────────────────────────────────────────
const KB_CATEGORIES = [
  { title: 'Tractor Catalog',         icon: BookOpen,    color: '#4ade80' },
  { title: 'Pricing & Offers',        icon: Tag,         color: '#60a5fa' },
  { title: 'EMI Calculator',          icon: Calculator,  color: '#fbbf24' },
  { title: 'FAQs',                    icon: HelpCircle,  color: '#a78bfa' },
  { title: 'Warranty & Service',      icon: Wrench,      color: '#34d399' },
  { title: 'Govt Schemes (PM-KISAN)', icon: Sprout,      color: '#fb923c' },
] as const;

type ConvStatus = 'active' | 'escalated' | 'resolved';

interface ChatMessage {
  role: 'customer' | 'ai' | 'system';
  text: string;
  time: string;
}

interface Conv {
  id: number;
  name: string;
  channel: 'whatsapp' | 'phone' | 'web';
  lastMsg: string;
  time: string;
  status: ConvStatus;
  unread: number;
  lang: string;
}

const INITIAL_CONVERSATIONS: Conv[] = [
  { id: 1, name: 'Dinesh Jadhav', channel: 'whatsapp', lastMsg: 'John Deere 5310 ची किंमत काय आहे?', time: '2m ago', status: 'active', unread: 2, lang: 'mr' },
  { id: 2, name: 'Suresh Kumar', channel: 'whatsapp', lastMsg: 'Can I get EMI details for 575 DI?', time: '15m ago', status: 'escalated', unread: 0, lang: 'hi' },
  { id: 3, name: 'Web Enquiry #4821', channel: 'web', lastMsg: 'Interested in Kubota tractor range', time: '1h ago', status: 'resolved', unread: 0, lang: 'en' },
  { id: 4, name: 'Ramesh Patil', channel: 'whatsapp', lastMsg: 'शोरूम कधी उघडते?', time: '2h ago', status: 'resolved', unread: 0, lang: 'mr' },
];

const INITIAL_CHAT_MAP: Record<number, ChatMessage[]> = {
  1: [
    { role: 'customer', text: 'नमस्कार, John Deere 5310 ची किंमत सांगा', time: '10:30' },
    { role: 'ai', text: 'नमस्कार! John Deere 5310 ची सध्याची किंमत ₹8.5L पासून सुरू होते.\n\nआपल्या बजेटनुसार EMI ₹18,500/महिना (48 महिने) मिळू शकते.\n\nआपण आमच्या शोरूमला भेट द्यायला येणार का? मी आपल्यासाठी test drive बुक करतो.', time: '10:30' },
    { role: 'customer', text: 'EMI साठी काय documents लागतात?', time: '10:31' },
    { role: 'ai', text: 'John Deere Finance साठी लागणारे documents:\n\n📄 Aadhaar Card\n📄 PAN Card\n🌾 7/12 उतारा (जमीन)\n💰 Bank Statement (6 months)\n\nसर्व documents एकत्र असल्यास 3 दिवसात approval मिळते!\n\nआपण कधी येऊ शकता - या शनिवारी किंवा रविवारी?', time: '10:31' },
  ],
  2: [
    { role: 'customer', text: 'Hi, I need EMI details for Mahindra 575 DI', time: '09:45' },
    { role: 'ai', text: 'Hello! For Mahindra 575 DI:\n\n💰 Price: ₹6.8L – ₹7.2L (ex-showroom)\n📅 EMI Options:\n• 36 months: ₹21,500/month\n• 48 months: ₹17,200/month\n• 60 months: ₹14,800/month\n\nDown payment starts at just 10%. Shall I schedule a visit for you?', time: '09:45' },
    { role: 'system', text: '⚠ Escalated to human agent — complex financing query', time: '09:50' },
  ],
  3: [
    { role: 'customer', text: 'I am looking for Kubota tractors. What models do you have?', time: '08:20' },
    { role: 'ai', text: 'Welcome! We stock the full Kubota range:\n\n🚜 MU4501 (45 HP) — ₹7.9L\n🚜 MU5501 (55 HP) — ₹9.2L\n🚜 L4508 (45 HP, 4WD) — ₹8.6L\n\nAll models available for test drive. Which HP range suits your farm size?', time: '08:21' },
    { role: 'customer', text: 'Thanks, will visit next week', time: '08:25' },
    { role: 'system', text: '✅ Resolved — customer visit scheduled', time: '08:26' },
  ],
  4: [
    { role: 'customer', text: 'शोरूम कधी उघडते?', time: '07:00' },
    { role: 'ai', text: 'आमचे शोरूम वेळापत्रक:\n\n🕘 सोमवार – शनिवार: सकाळी 9:00 – संध्याकाळी 6:30\n🕙 रविवार: सकाळी 10:00 – दुपारी 2:00\n\nआपण कधी येणार? मी आपल्यासाठी वेळ राखून ठेवतो!', time: '07:00' },
  ],
};

const DEFAULT_CONFIG = {
  autoRespond: true,
  escalateAfter3: true,
  sendBrochure: false,
  scheduleVisit: true,
  marathiDefault: true,
};

type FilterTab = 'all' | ConvStatus;

const TIME = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

// ── Toast ─────────────────────────────────────────────────────────────────────
interface Toast { id: number; msg: string; type: 'success' | 'error' | 'info' }

export const AISalesman: React.FC = () => {
  const { dealer } = useStore();
  const [tab, setTab] = useState('conversations');
  const [conversations, setConversations] = useState<Conv[]>(INITIAL_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<number>(1);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [chatMap, setChatMap] = useState<Record<number, ChatMessage[]>>(INITIAL_CHAT_MAP);
  const [inputMsg, setInputMsg] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // KB
  const { knowledgeBase, addKBEntry, updateKBEntry, deleteKBEntry } = useAppStore();
  const [kbCategory, setKbCategory] = useState<string | null>(null);
  const [kbSearch, setKbSearch] = useState('');
  const [kbNewText, setKbNewText] = useState('');
  const [kbEditId, setKbEditId] = useState<string | null>(null);
  const [kbEditText, setKbEditText] = useState('');
  const [kbUploading, setKbUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Config
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configSaved, setConfigSaved] = useState(false);

  const selectedConv = conversations.find(c => c.id === selectedId) ?? conversations[0];
  const chatMessages = chatMap[selectedId] ?? [];

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, aiTyping]);

  // Clear unread on select
  const selectConv = (conv: Conv) => {
    setSelectedId(conv.id);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
  };

  // Toast helpers
  const toast = useCallback((msg: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  // Send message
  const sendMessage = async () => {
    const text = inputMsg.trim();
    if (!text || aiTyping) return;
    const userMsg: ChatMessage = { role: 'customer', text, time: TIME() };
    setChatMap(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), userMsg] }));
    setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, lastMsg: text, time: 'just now' } : c));
    setInputMsg('');
    setAiTyping(true);
    try {
      const history = chatMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));
      const res = await api.ai.respond(text, history, selectedConv?.lang ?? 'en');
      const aiMsg: ChatMessage = { role: 'ai', text: res.reply || 'Processing your enquiry…', time: TIME() };
      setChatMap(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), aiMsg] }));
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, lastMsg: res.reply?.slice(0,60) ?? '', time: 'just now' } : c));
    } catch {
      const errMsg: ChatMessage = { role: 'ai', text: 'Unable to respond right now. Please try again.', time: TIME() };
      setChatMap(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), errMsg] }));
    }
    setAiTyping(false);
  };

  // Escalate
  const escalate = () => {
    if (selectedConv?.status === 'escalated') { toast('Already escalated to human agent', 'info'); return; }
    setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, status: 'escalated' } : c));
    const sysMsg: ChatMessage = { role: 'system', text: '⚠ Escalated to human agent — taking over this conversation', time: TIME() };
    setChatMap(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), sysMsg] }));
    toast('Conversation escalated to human agent');
  };

  // Resolve
  const resolve = () => {
    if (selectedConv?.status === 'resolved') { toast('Already resolved', 'info'); return; }
    setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, status: 'resolved' } : c));
    const sysMsg: ChatMessage = { role: 'system', text: '✅ Marked as resolved', time: TIME() };
    setChatMap(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), sysMsg] }));
    toast('Conversation resolved');
  };

  // AI Draft → fill input box
  const handleAIDraft = async (prompt: string) => {
    setAiTyping(true);
    try {
      const history = chatMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));
      const res = await api.ai.respond(
        `Draft a sales reply for: ${prompt}`,
        history,
        selectedConv?.lang ?? 'en'
      );
      setInputMsg(res.reply ?? '');
      inputRef.current?.focus();
      toast('AI draft ready — review and send', 'info');
    } catch {
      toast('AI draft failed', 'error');
    }
    setAiTyping(false);
  };

  // Refresh conv list
  const refreshConvs = async () => {
    if (!dealer?.id) return;
    try {
      const data = await api.conversations.list(dealer.id, { limit: 20 });
      if (data.conversations?.length) {
        toast(`Loaded ${data.conversations.length} conversations`, 'info');
      } else {
        toast('No new conversations', 'info');
      }
    } catch {
      toast('Could not fetch live conversations', 'info');
    }
  };

  // Filtered conversations
  const filteredConvs = filterTab === 'all' ? conversations : conversations.filter(c => c.status === filterTab);

  // Metrics
  const active = conversations.filter(c => c.status === 'active').length;
  const escalated = conversations.filter(c => c.status === 'escalated').length;
  const resolved = conversations.filter(c => c.status === 'resolved').length;

  // KB helpers
  const openCategory = (title: string) => { setKbCategory(title); setKbSearch(''); setKbNewText(''); setKbEditId(null); };
  const closePanel = () => { setKbCategory(null); setKbEditId(null); setKbNewText(''); };
  const addEntry = () => {
    const text = kbNewText.trim();
    if (!text || !kbCategory) return;
    const entry: KBEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, text, source: 'manual', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    addKBEntry(kbCategory, entry);
    setKbNewText('');
    toast('Entry added to knowledge base');
  };
  const startEdit = (entry: KBEntry) => { setKbEditId(entry.id); setKbEditText(entry.text); };
  const saveEdit = () => { if (!kbCategory || !kbEditId) return; updateKBEntry(kbCategory, kbEditId, kbEditText.trim()); setKbEditId(null); toast('Entry updated'); };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !kbCategory) return;
    setKbUploading(true);
    const text = await extractTextFromPDF(file);
    const entry: KBEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, text, source: 'pdf', filename: file.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    addKBEntry(kbCategory, entry);
    setKbUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast(`PDF "${file.name}" added`);
  };
  const activeEntries = kbCategory ? (knowledgeBase[kbCategory] ?? []).filter(e => kbSearch === '' || e.text.toLowerCase().includes(kbSearch.toLowerCase())) : [];

  // Config save
  const saveConfig = () => {
    setConfigSaved(true);
    toast('Agent config saved');
    setTimeout(() => setConfigSaved(false), 2000);
  };

  const channelIcon = (ch: string) => ch === 'whatsapp' ? <MessageSquare size={14} /> : ch === 'phone' ? <Phone size={14} /> : <Globe size={14} />;

  const statusColor: Record<ConvStatus, string> = {
    active: 'status-active',
    escalated: 'status-pending',
    resolved: 'status-info',
  };

  const CONFIG_ITEMS = [
    { key: 'autoRespond' as const, label: 'Auto-respond to new enquiries', desc: 'AI responds within 10 seconds' },
    { key: 'escalateAfter3' as const, label: 'Escalate to human after 3 rounds', desc: 'Hand off complex queries' },
    { key: 'sendBrochure' as const, label: 'Send brochure automatically', desc: 'PDF brochure on first enquiry' },
    { key: 'scheduleVisit' as const, label: 'Schedule showroom visit', desc: 'Book demo slots automatically' },
    { key: 'marathiDefault' as const, label: 'Marathi as default language', desc: 'Switch to customer language if detected' },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <Header title="AI Salesman" subtitle="Module E · Inbound enquiry handler & automated sales assistant" />

      {/* Toast stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl border pointer-events-auto transition-all ${
            t.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
            t.type === 'info'  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
            'bg-[rgba(74,222,128,0.1)] border-brand-400/30 text-brand-400'
          }`}>{t.msg}</div>
        ))}
      </div>

      <div className="p-6 space-y-5 page-enter">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Active Chats" value={active} icon={<MessageSquare size={16} />} accent="#4ade80" />
          <MetricCard label="Resolved Today" value={resolved} icon={<CheckCircle size={16} />} accent="#60a5fa" />
          <MetricCard label="Escalated" value={escalated} icon={<AlertTriangle size={16} />} accent="#fbbf24" />
          <MetricCard label="Avg Response" value="< 10s" icon={<Zap size={16} />} accent="#a78bfa" />
        </div>

        <TabBar tabs={[
          { id: 'conversations', label: 'Conversations', count: conversations.length },
          { id: 'knowledge', label: 'Knowledge Base' },
          { id: 'config', label: 'Agent Config' },
        ]} active={tab} onChange={setTab} />

        {/* ── CONVERSATIONS TAB ── */}
        {tab === 'conversations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
            {/* Left: conversation list */}
            <Card className="p-0 overflow-hidden flex flex-col">
              <div className="p-3 border-b border-[var(--border)] flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Conversations</p>
                <button onClick={refreshConvs} className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)] hover:text-brand-400 transition-all" title="Refresh">
                  <RefreshCw size={12} />
                </button>
              </div>
              {/* Filter mini-tabs */}
              <div className="flex border-b border-[var(--border)] px-2 pt-1.5 gap-0.5">
                {(['all', 'active', 'escalated', 'resolved'] as FilterTab[]).map(f => (
                  <button key={f} onClick={() => setFilterTab(f)}
                    className={`text-[10px] px-2 py-1 rounded-t-md font-medium capitalize transition-all ${filterTab === f ? 'bg-[rgba(74,222,128,0.12)] text-brand-400 border-b-2 border-brand-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredConvs.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <MessageSquare size={28} className="text-[var(--text-muted)] opacity-30" />
                    <p className="text-xs text-[var(--text-muted)]">No {filterTab} conversations</p>
                  </div>
                )}
                {filteredConvs.map(conv => (
                  <div key={conv.id} onClick={() => selectConv(conv)}
                    role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectConv(conv); } }}
                    className={`flex items-start gap-3 p-3 border-b border-[rgba(255,255,255,0.03)] cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 ${selectedId === conv.id ? 'bg-[rgba(74,222,128,0.06)]' : 'hover:bg-[rgba(255,255,255,0.03)]'}`}>
                    <div className="w-9 h-9 rounded-full bg-[rgba(74,222,128,0.1)] flex items-center justify-center text-sm font-bold text-brand-400 flex-shrink-0">
                      {channelIcon(conv.channel)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{conv.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{conv.time}</p>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{conv.lastMsg}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${statusColor[conv.status]}`}>{conv.status}</span>
                        {conv.unread > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-400 text-surface-900 font-bold">{conv.unread}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Right: chat view */}
            <Card className="lg:col-span-2 p-0 flex flex-col overflow-hidden">
              {/* Chat header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[rgba(74,222,128,0.1)] flex items-center justify-center">
                    {channelIcon(selectedConv?.channel ?? 'web')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedConv?.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{selectedConv?.channel} · {selectedConv?.status === 'active' ? 'AI responding' : selectedConv?.status}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={selectedConv?.status === 'active' ? 'active' : 'pending'}>{selectedConv?.status}</Badge>
                  {selectedConv?.status !== 'resolved' && (
                    <Button variant="ghost" size="sm" icon={<UserCheck size={12} />} onClick={resolve}>Resolve</Button>
                  )}
                  <Button variant="secondary" size="sm" icon={<Users size={12} />} onClick={escalate}
                    className={selectedConv?.status === 'escalated' ? 'opacity-50' : ''}>
                    Escalate
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, i) => {
                  if (msg.role === 'system') return (
                    <div key={i} className="flex justify-center">
                      <span className="text-[11px] px-3 py-1 rounded-full bg-[rgba(251,191,36,0.1)] text-yellow-400 border border-yellow-400/20">{msg.text}</span>
                    </div>
                  );
                  return (
                    <div key={i} className={`flex ${msg.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
                      <div className="max-w-[80%]">
                        {msg.role === 'ai' && (
                          <div className="flex items-center gap-1.5 mb-1 justify-end">
                            <span className="text-[10px] text-brand-400">AgroDesk AI</span>
                            <Bot size={10} className="text-brand-400" />
                          </div>
                        )}
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'customer' ? 'bg-[rgba(255,255,255,0.06)] text-[var(--text-primary)] rounded-tl-none' : 'bg-[rgba(74,222,128,0.12)] text-[var(--text-primary)] border border-[rgba(74,222,128,0.2)] rounded-tr-none'}`}>
                          {msg.text}
                        </div>
                        <p className={`text-[10px] text-[var(--text-muted)] mt-1 ${msg.role === 'ai' ? 'text-right' : ''}`}>{msg.time}</p>
                      </div>
                    </div>
                  );
                })}
                {aiTyping && (
                  <div className="flex justify-end">
                    <div className="px-4 py-3 rounded-2xl rounded-tr-none bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.15)]">
                      <div className="flex gap-1 items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input area */}
              <div className="p-4 border-t border-[var(--border)] space-y-2">
                <MorphPanel
                  label="AI Draft"
                  placeholder="Describe what to draft, e.g. 'EMI reply in Marathi'…"
                  onSubmit={handleAIDraft}
                />
                <div className="flex items-end gap-2">
                  <input
                    ref={inputRef}
                    value={inputMsg}
                    onChange={e => setInputMsg(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message or use AI Draft above…"
                    className="ag-input flex-1 py-2 text-sm"
                    disabled={aiTyping}
                  />
                  <Button size="sm" icon={<Send size={13} />} onClick={sendMessage} disabled={aiTyping || !inputMsg.trim()}>Send</Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── KNOWLEDGE BASE TAB ── */}
        {tab === 'knowledge' && (
          <div className="relative">
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 transition-all duration-300 ${kbCategory ? 'lg:w-[calc(100%-420px)]' : 'w-full'}`}>
              {KB_CATEGORIES.map(({ title, icon: Icon, color }) => {
                const count = (knowledgeBase[title] ?? []).length;
                const isOpen = kbCategory === title;
                return (
                  <button key={title} onClick={() => isOpen ? closePanel() : openCategory(title)}
                    className={`text-left w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 ${isOpen ? 'border-[var(--border-brand)] bg-[rgba(74,222,128,0.06)] shadow-[0_0_0_1px_rgba(74,222,128,0.2)]' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-brand)] hover:bg-[rgba(74,222,128,0.03)]'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                      <Icon size={20} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{count} {count === 1 ? 'entry' : 'entries'}</p>
                    </div>
                    <ChevronRight size={15} className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                );
              })}
            </div>

            {kbCategory && (
              <div className="absolute top-0 right-0 w-full lg:w-[410px] h-[640px] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden z-10">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    {(() => { const cat = KB_CATEGORIES.find(c => c.title === kbCategory); const Icon = cat?.icon ?? BookOpen; return <Icon size={16} className="text-brand-400" />; })()}
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[220px]">{kbCategory}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-400/10 text-brand-400 font-mono">{(knowledgeBase[kbCategory] ?? []).length}</span>
                  </div>
                  <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"><X size={15} /></button>
                </div>
                <div className="px-4 py-2.5 border-b border-[var(--border)] flex-shrink-0">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input value={kbSearch} onChange={e => setKbSearch(e.target.value)} placeholder="Search entries..." className="ag-input w-full pl-8 py-1.5 text-xs" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                  {activeEntries.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 gap-2">
                      <BookOpen size={28} className="text-[var(--text-muted)] opacity-40" />
                      <p className="text-xs text-[var(--text-muted)]">{kbSearch ? 'No entries match' : 'No entries yet — add one below'}</p>
                    </div>
                  )}
                  {activeEntries.map(entry => (
                    <div key={entry.id} className="rounded-xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-3 group">
                      {kbEditId === entry.id ? (
                        <div className="space-y-2">
                          <textarea value={kbEditText} onChange={e => setKbEditText(e.target.value)} rows={3} className="ag-input w-full text-xs resize-none" autoFocus />
                          <div className="flex gap-1.5">
                            <Button size="sm" icon={<Save size={11} />} onClick={saveEdit}>Save</Button>
                            <Button variant="ghost" size="sm" onClick={() => setKbEditId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {entry.source === 'pdf' && entry.filename && (
                            <div className="flex items-center gap-1 mb-1.5">
                              <FileUp size={10} className="text-[var(--text-muted)]" />
                              <span className="text-[9px] text-[var(--text-muted)] font-mono truncate max-w-[200px]">{entry.filename}</span>
                            </div>
                          )}
                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{entry.text}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[9px] text-[var(--text-muted)]">{new Date(entry.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(entry)} className="p-1 rounded-md hover:bg-[rgba(74,222,128,0.12)] text-[var(--text-muted)] hover:text-brand-400 transition-all"><Pencil size={11} /></button>
                              <button onClick={() => { deleteKBEntry(kbCategory, entry.id); toast('Entry deleted'); }} className="p-1 rounded-md hover:bg-[rgba(239,68,68,0.12)] text-[var(--text-muted)] hover:text-red-400 transition-all"><Trash2 size={11} /></button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-[var(--border)] px-3 py-3 space-y-2 flex-shrink-0 bg-[var(--bg-mid)]">
                  <textarea value={kbNewText} onChange={e => setKbNewText(e.target.value)} placeholder="Type or paste new entry..." rows={2}
                    className="ag-input w-full text-xs resize-none"
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); addEntry(); } }} />
                  <div className="flex gap-2">
                    <Button size="sm" icon={<Plus size={12} />} onClick={addEntry} disabled={!kbNewText.trim()} className="flex-1">Add Entry</Button>
                    <label htmlFor="kb-pdf-input" className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium rounded-xl px-3 py-1.5 border transition-all duration-200 ${kbUploading ? 'opacity-50 cursor-not-allowed border-[var(--border)] text-[var(--text-muted)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] cursor-pointer'}`}>
                      <FileUp size={12} />{kbUploading ? 'Reading…' : 'PDF'}
                    </label>
                    <input id="kb-pdf-input" type="file" accept=".pdf" className="hidden" onChange={e => { handleFileUpload(e); e.target.value = ''; }} disabled={kbUploading} />
                  </div>
                  <p className="text-[9px] text-[var(--text-muted)]">⌘+Enter to add · PDF text extracted automatically</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AGENT CONFIG TAB ── */}
        {tab === 'config' && (
          <div className="max-w-xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 size={15} className="text-brand-400" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">AI Agent Settings</p>
            </div>
            {CONFIG_ITEMS.map(item => (
              <Card key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{item.desc}</p>
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${config[item.key] ? 'bg-brand-400' : 'bg-[rgba(255,255,255,0.1)]'}`}
                  role="switch" aria-checked={config[item.key]}>
                  <div className="w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: config[item.key] ? '22px' : '2px' }} />
                </button>
              </Card>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <Button icon={<Save size={13} />} onClick={saveConfig}>{configSaved ? 'Saved ✓' : 'Save Config'}</Button>
              <Button variant="ghost" onClick={() => { setConfig(DEFAULT_CONFIG); toast('Reset to defaults', 'info'); }}>Reset Defaults</Button>
            </div>
            <Card className="mt-4 border-dashed">
              <div className="flex items-start gap-3">
                <Sparkles size={16} className="text-brand-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Knowledge Base Connected</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    The AI uses your Knowledge Base entries in real-time. Add more entries under the Knowledge Base tab to improve response accuracy.
                  </p>
                  <p className="text-xs text-brand-400 mt-1.5">
                    {Object.values(knowledgeBase).flat().length} total entries across {KB_CATEGORIES.length} categories
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
