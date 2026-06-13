import React, { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Badge, MetricCard, TabBar } from '../../components/ui';
import { useAppStore } from '../../store';
import { Bot, MessageSquare, CheckCircle, Clock, ArrowRight, Sparkles, Zap, Users, Send } from 'lucide-react';
import { api } from '../../lib/api';

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
  const { openScriptModal } = useAppStore();
  const [chatMessages, setChatMessages] = useState(MOCK_CHAT);
  const [aiTyping, setAiTyping] = useState(false);

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
      const aiMsg = { role: 'ai', text: res.reply || 'Processing your enquiry...', time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Unable to respond right now. Please try again.', time: '' }]);
    }
    setAiTyping(false);
  };

  const channelIcon = (ch: string) => ch === 'whatsapp' ? '💬' : ch === 'phone' ? '📞' : '🌐';

  return (
    <div className="flex-1 overflow-auto">
      <Header title="AI Salesman" subtitle="Module E · Inbound enquiry handler & automated sales assistant" />
      <div className="p-6 space-y-5 page-enter">

        {/* Metrics */}
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
            {/* Conversation List */}
            <Card className="p-0 overflow-hidden flex flex-col">
              <div className="p-3 border-b border-[var(--border)]">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Conversations</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {MOCK_CONVERSATIONS.map(conv => (
                  <div key={conv.id} onClick={() => setSelectedConv(conv)}
                    className={`flex items-start gap-3 p-3 border-b border-[rgba(255,255,255,0.03)] cursor-pointer transition-all ${selectedConv.id === conv.id ? 'bg-[rgba(74,222,128,0.06)]' : 'hover:bg-[rgba(255,255,255,0.03)]'}`}>
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

            {/* Chat Window */}
            <Card className="lg:col-span-2 p-0 flex flex-col overflow-hidden">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[rgba(74,222,128,0.1)] flex items-center justify-center text-sm">{channelIcon(selectedConv.channel)}</div>
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

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] ${msg.role === 'customer' ? '' : ''}`}>
                      {msg.role === 'ai' && (
                        <div className="flex items-center gap-1.5 mb-1 justify-end">
                          <span className="text-[10px] text-brand-400">AgroDesk AI</span>
                          <Bot size={10} className="text-brand-400" />
                        </div>
                      )}
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'customer'
                          ? 'bg-[rgba(255,255,255,0.06)] text-[var(--text-primary)] rounded-tl-none'
                          : 'bg-[rgba(74,222,128,0.12)] text-[var(--text-primary)] border border-[rgba(74,222,128,0.2)] rounded-tr-none'
                      }`}>
                        {msg.text}
                      </div>
                      <p className={`text-[10px] text-[var(--text-muted)] mt-1 ${msg.role === 'ai' ? 'text-right' : ''}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
                {/* Typing indicator */}
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

              {/* Input */}
              <div className="p-4 border-t border-[var(--border)] flex gap-2">
                <input value={inputMsg} onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type a message or let AI handle it..."
                  className="ag-input flex-1 py-2.5 text-sm" />
                <Button size="sm" icon={<Sparkles size={13} />} onClick={() => openScriptModal('inbound_response', { conv: selectedConv })}>
                  AI Draft
                </Button>
<Button size="sm" icon={<Send size={13} />} onClick={sendMessage} disabled={aiTyping}>Send</Button>
              </div>
            </Card>
          </div>
        )}

        {tab === 'knowledge' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { title: 'Tractor Catalog', items: 24, lastUpdated: '2 days ago', icon: '📋' },
              { title: 'Pricing & Offers', items: 12, lastUpdated: '1 day ago', icon: '💰' },
              { title: 'EMI Calculator', items: 8, lastUpdated: '5 days ago', icon: '🧮' },
              { title: 'FAQs', items: 45, lastUpdated: '1 week ago', icon: '❓' },
              { title: 'Warranty & Service', items: 18, lastUpdated: '3 days ago', icon: '🔧' },
              { title: 'Govt Schemes (PM-KISAN)', items: 6, lastUpdated: 'Today', icon: '🌾' },
            ].map(k => (
              <Card key={k.title} hover className="flex items-center gap-4">
                <div className="text-2xl">{k.icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{k.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{k.items} items · Updated {k.lastUpdated}</p>
                </div>
                <Button variant="ghost" size="sm"><ArrowRight size={13} /></Button>
              </Card>
            ))}
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
                  <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${s.on ? 'left-5.5' : 'left-0.5'}`} style={{ left: s.on ? '22px' : '2px' }} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
