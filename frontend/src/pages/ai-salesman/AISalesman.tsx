import React, { useState, useRef } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Badge, MetricCard, TabBar } from '../../components/ui';
import { useAppStore } from '../../store';
import type { KBEntry } from '../../store';
import { Bot, MessageSquare, CheckCircle, Clock, Wand2, Zap, Users, Send, Phone, Globe, BookOpen, Tag, Calculator, HelpCircle, Wrench, Sprout, Search, Plus, Trash2, Pencil, X, FileUp, Save, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { MorphPanel } from '../../components/ui/MorphPanel';

// ── PDF text extraction (no external lib needed) ──────────────────────────────
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

const MOCK_CONVERSATIONS = [
  { id: 1, name: 'Dinesh Jadhav', channel: 'whatsapp', lastMsg: 'John Deere 5310 ची किंमत काय आहे?', time: '2m ago', status: 'active', unread: 2, lang: 'mr' },
  { id: 2, name: 'Suresh Kumar', channel: 'whatsapp', lastMsg: 'Can I get EMI details for 575 DI?', time: '15m ago', status: 'escalated', unread: 0, lang: 'hi' },
  { id: 3, name: 'Web Enquiry #4821', channel: 'web', lastMsg: 'Interested in Kubota tractor range', time: '1h ago', status: 'resolved', unread: 0, lang: 'en' },
  { id: 4, name: 'Ramesh Patil', channel: 'whatsapp', lastMsg: 'शोरूम कधी उघडते?', time: '2h ago', status: 'resolved', unread: 0, lang: 'mr' },
];

const MOCK_CHAT = [
  { role: 'customer', text: 'नमस्कार, John Deere 5310 ची किंमत सांगा', time: '10:30' },
  { role: 'ai', text: 'नमस्कार! John Deere 5310 ची सध्याची किंमत ₹8.5L पासून सुरू होते.\n\nआपल्या बजेटनुसार EMI ₹18,500/महिना (48 महिने) मिळू शकते.\n\nआपण आमच्या शोरूमला भेट द्यायला येणार का? मी आपल्यासाठी test drive बुक करतो.', time: '10:30' },
  { role: 'customer', text: 'EMI साठी काय documents लागतात?', time: '10:31' },
  { role: 'ai', text: 'John Deere Finance साठी लागणारे documents:\n\n📄 Aadhaar Card\n📄 PAN Card\n🌾 7/12 उतारा (जमीन)\n💰 Bank Statement (6 months)\n\nसर्व documents एकत्र असल्यास 3 दिवसात approval मिळते!\n\nआपण कधी येऊ शकता - या शनिवारी किंवा रविवारी?', time: '10:31' },
];

export const AISalesman: React.FC = () => {
  const [tab, setTab] = useState('conversations');
  const [selectedConv, setSelectedConv] = useState(MOCK_CONVERSATIONS[0]);
  const [inputMsg, setInputMsg] = useState('');
  const { openScriptModal, knowledgeBase, addKBEntry, updateKBEntry, deleteKBEntry } = useAppStore();
  const [chatMessages, setChatMessages] = useState(MOCK_CHAT);
  const [aiTyping, setAiTyping] = useState(false);

  // KB panel state
  const [kbCategory, setKbCategory] = useState<string | null>(null);
  const [kbSearch, setKbSearch] = useState('');
  const [kbNewText, setKbNewText] = useState('');
  const [kbEditId, setKbEditId] = useState<string | null>(null);
  const [kbEditText, setKbEditText] = useState('');
  const [kbUploading, setKbUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCategory = (title: string) => { setKbCategory(title); setKbSearch(''); setKbNewText(''); setKbEditId(null); };
  const closePanel = () => { setKbCategory(null); setKbEditId(null); setKbNewText(''); };

  const addEntry = () => {
    const text = kbNewText.trim();
    if (!text || !kbCategory) return;
    const entry: KBEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, text, source: 'manual', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    addKBEntry(kbCategory, entry);
    setKbNewText('');
  };

  const startEdit = (entry: KBEntry) => { setKbEditId(entry.id); setKbEditText(entry.text); };
  const saveEdit = () => { if (!kbCategory || !kbEditId) return; updateKBEntry(kbCategory, kbEditId, kbEditText.trim()); setKbEditId(null); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !kbCategory) return;
    setKbUploading(true);
    const text = await extractTextFromPDF(file);
    const entry: KBEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2,6)}`, text, source: 'pdf', filename: file.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    addKBEntry(kbCategory, entry);
    setKbUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeEntries = kbCategory
    ? (knowledgeBase[kbCategory] ?? []).filter(e => kbSearch === '' || e.text.toLowerCase().includes(kbSearch.toLowerCase()))
    : [];

  const sendMessage = async () => {
    const text = inputMsg.trim();
    if (!text) return;
    const userMsg = { role: 'customer', text, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
    setChatMessages(prev => [...prev, userMsg]);
    setInputMsg('');
    setAiTyping(true);
    try {
      const history = chatMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));
      const res = await api.ai.respond(text, history, selectedConv.lang);
      setChatMessages(prev => [...prev, { role: 'ai', text: res.reply || 'Processing your enquiry...', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Unable to respond right now. Please try again.', time: '' }]);
    }
    setAiTyping(false);
  };

  const channelIcon = (ch: string) => ch === 'whatsapp' ? <MessageSquare size={16} /> : ch === 'phone' ? <Phone size={16} /> : <Globe size={16} />;

  return (
    <div className="flex-1 overflow-auto">
      <Header title="AI Salesman" subtitle="Module E · Inbound enquiry handler & automated sales assistant" />
      <div className="p-6 space-y-5 page-enter">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Active Chats" value={MOCK_CONVERSATIONS.filter(c => c.status === 'active').length} icon={<MessageSquare size={16} />} accent="#4ade80" />
          <MetricCard label="Resolved Today" value="28" icon={<CheckCircle size={16} />} accent="#60a5fa" />
          <MetricCard label="Escalated" value={MOCK_CONVERSATIONS.filter(c => c.status === 'escalated').length} icon={<Clock size={16} />} accent="#fbbf24" />
          <MetricCard label="Avg Response" value="< 10s" icon={<Zap size={16} />} accent="#a78bfa" />
        </div>

        <TabBar tabs={[
          { id: 'conversations', label: 'Conversations', count: MOCK_CONVERSATIONS.length },
          { id: 'knowledge', label: 'Knowledge Base' },
          { id: 'config', label: 'Agent Config' },
        ]} active={tab} onChange={setTab} />

        {tab === 'conversations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[560px]">
            <Card className="p-0 overflow-hidden flex flex-col">
              <div className="p-3 border-b border-[var(--border)]">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Conversations</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {MOCK_CONVERSATIONS.map(conv => (
                  <div key={conv.id} onClick={() => setSelectedConv(conv)}
                    role="button" tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedConv(conv); } }}
                    className={`flex items-start gap-3 p-3 border-b border-[rgba(255,255,255,0.03)] cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 ${selectedConv.id === conv.id ? 'bg-[rgba(74,222,128,0.06)]' : 'hover:bg-[rgba(255,255,255,0.03)]'}`}>
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
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${conv.status === 'active' ? 'status-active' : conv.status === 'escalated' ? 'status-pending' : 'status-info'}`}>{conv.status}</span>
                        {conv.unread > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-400 text-surface-900 font-bold">{conv.unread}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-2 p-0 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[rgba(74,222,128,0.1)] flex items-center justify-center">{channelIcon(selectedConv.channel)}</div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedConv.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{selectedConv.channel} · AI responding</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={selectedConv.status === 'active' ? 'active' : 'pending'}>{selectedConv.status}</Badge>
                  <Button variant="secondary" size="sm" icon={<Users size={12} />}>Escalate</Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, i) => (
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
                ))}
                {aiTyping && <div className="flex justify-end">
                  <div className="px-4 py-3 rounded-2xl rounded-tr-none bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.15)]">
                    <div className="flex gap-1 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </div>}
              </div>
              <div className="p-4 border-t border-[var(--border)] flex items-end gap-2">
                <MorphPanel
                  label="AI Draft"
                  placeholder="Ask AI to draft a reply for this conversation…"
                  onSubmit={text => {
                    const aiMsg = { role: 'ai' as const, text: `AI Draft: ${text}`, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
                    setChatMessages(prev => [...prev, aiMsg]);
                  }}
                />
                <input value={inputMsg} onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type a message…"
                  className="ag-input flex-1 py-2 text-sm" />
                <Button size="sm" icon={<Send size={13} />} onClick={sendMessage} disabled={aiTyping}>Send</Button>
              </div>
            </Card>
          </div>
        )}

        {tab === 'knowledge' && (
          <div className="relative">
            {/* Category grid */}
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

            {/* Slide-in panel */}
            {kbCategory && (
              <div className="absolute top-0 right-0 w-full lg:w-[410px] h-[640px] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl overflow-hidden z-10">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    {(() => { const cat = KB_CATEGORIES.find(c => c.title === kbCategory); const Icon = cat?.icon ?? BookOpen; return <Icon size={16} className="text-brand-400" />; })()}
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[220px]">{kbCategory}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-400/10 text-brand-400 font-mono">
                      {(knowledgeBase[kbCategory] ?? []).length}
                    </span>
                  </div>
                  <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                    <X size={15} />
                  </button>
                </div>

                {/* Search */}
                <div className="px-4 py-2.5 border-b border-[var(--border)] flex-shrink-0">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input value={kbSearch} onChange={e => setKbSearch(e.target.value)} placeholder="Search entries..." className="ag-input w-full pl-8 py-1.5 text-xs" />
                  </div>
                </div>

                {/* Entry list */}
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
                            <span className="text-[9px] text-[var(--text-muted)]">
                              {new Date(entry.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEdit(entry)} className="p-1 rounded-md hover:bg-[rgba(74,222,128,0.12)] text-[var(--text-muted)] hover:text-brand-400 transition-all">
                                <Pencil size={11} />
                              </button>
                              <button onClick={() => deleteKBEntry(kbCategory, entry.id)} className="p-1 rounded-md hover:bg-[rgba(239,68,68,0.12)] text-[var(--text-muted)] hover:text-red-400 transition-all">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add new entry */}
                <div className="border-t border-[var(--border)] px-3 py-3 space-y-2 flex-shrink-0 bg-[var(--bg-mid)]">
                  <textarea value={kbNewText} onChange={e => setKbNewText(e.target.value)} placeholder="Type or paste new entry..." rows={2}
                    className="ag-input w-full text-xs resize-none"
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); addEntry(); } }} />
                  <div className="flex gap-2">
                    <Button size="sm" icon={<Plus size={12} />} onClick={addEntry} disabled={!kbNewText.trim()} className="flex-1">Add Entry</Button>
                    <label className="flex-shrink-0 cursor-pointer">
                      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={kbUploading} />
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-xl px-3 py-1.5 border transition-all duration-200 ${kbUploading ? 'opacity-50 cursor-not-allowed border-[var(--border)] text-[var(--text-muted)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]'}`}>
                        <FileUp size={12} />{kbUploading ? 'Reading…' : 'PDF'}
                      </span>
                    </label>
                  </div>
                  <p className="text-[9px] text-[var(--text-muted)]">⌘+Enter to add · PDF text is extracted automatically</p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'config' && (
          <div className="max-w-xl space-y-4">
            {[
              { label: 'Auto-respond to new enquiries', desc: 'AI responds within 10 seconds', on: true },
              { label: 'Escalate to human after 3 rounds', desc: 'Hand off complex queries', on: true },
              { label: 'Send brochure automatically', desc: 'PDF brochure on first enquiry', on: false },
              { label: 'Schedule showroom visit', desc: 'Book demo slots automatically', on: true },
              { label: 'Marathi as default language', desc: 'Switch to customer language if detected', on: true },
            ].map(s => (
              <Card key={s.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{s.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{s.desc}</p>
                </div>
                <div className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${s.on ? 'bg-brand-400' : 'bg-[rgba(255,255,255,0.1)]'}`}>
                  <div className="w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: s.on ? '22px' : '2px' }} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
