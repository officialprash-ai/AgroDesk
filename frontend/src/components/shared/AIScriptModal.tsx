import React, { useState } from 'react';
import { Modal, Button, Select } from '../ui';
import { useAppStore } from '../../store';
import { Sparkles, Copy, RefreshCw, Check, Mic, Pencil, Save, X, Phone, MessageSquare } from 'lucide-react';
import { LANGUAGES } from '../../lib/utils';
import { api } from '../../lib/api';

const SCRIPT_TYPES = [
  { value: 'cold_call_new', label: 'Cold Call – New Tractor' },
  { value: 'cold_call_used', label: 'Cold Call – Used Tractor' },
  { value: 'follow_up', label: 'Follow-up Call' },
  { value: 'recovery_gentle', label: 'Recovery – Gentle Reminder' },
  { value: 'recovery_firm', label: 'Recovery – Firm Reminder' },
  { value: 'recovery_legal', label: 'Recovery – Legal Notice Tone' },
  { value: 'whatsapp_intro', label: 'WhatsApp Introduction' },
  { value: 'whatsapp_offer', label: 'WhatsApp Offer Message' },
  { value: 'inbound_response', label: 'Inbound Enquiry Response' },
];

// A dealer-created DB row has a Prisma cuid id (starts with 'c', 25 chars, no
// leading digits-only). CSV-parsed rows not yet saved to CRM use `Date.now()+i`
// as a placeholder id — those can't be dispatched as real jobs yet.
function isRealId(id: unknown): id is string {
  return typeof id === 'string' && !/^\d+$/.test(id);
}

export const AIScriptModal: React.FC = () => {
  const { scriptModal, closeScriptModal, dealer } = useAppStore();
  const [lang, setLang] = useState('mr');
  const [scriptType, setScriptType] = useState(scriptModal.type || 'cold_call_new');
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState('');
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [dispatching, setDispatching] = useState<'voice' | 'whatsapp' | null>(null);
  const [dispatchMsg, setDispatchMsg] = useState<string | null>(null);

  const ctx = scriptModal.context ?? {};
  const contact = (ctx as any).contact;
  const recoveryCase = (ctx as any).case;
  const contactId = isRealId(contact?.id) ? contact.id as string : null;
  const caseId = isRealId(recoveryCase?.id) ? recoveryCase.id as string : null;
  const canDispatch = Boolean(contactId || caseId);

  const dispatchJob = async (channel: 'voice' | 'whatsapp') => {
    const text = editing ? editDraft : script;
    if (!text || !dealer?.id) return;
    setDispatching(channel);
    setDispatchMsg(null);
    try {
      const payload: Record<string, unknown> = contactId
        ? { contact_id: contactId, script: text, message: text }
        : { case_id: caseId, script: text, message: text };
      await api.jobs.create({
        agent_type: channel === 'voice' ? 'voice_call' : 'whatsapp',
        payload,
        dealer_id: dealer.id,
      });
      setDispatchMsg(channel === 'voice' ? 'Call queued — AI will dial shortly.' : 'WhatsApp message queued for delivery.');
    } catch (e: any) {
      setDispatchMsg(e?.message ?? 'Failed to queue — check provider setup in Settings.');
    }
    setDispatching(null);
  };

  const generateScript = async () => {
    setLoading(true);
    setScript('');
    setEditing(false);
    try {
      const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const raw = localStorage.getItem('agrodesk-auth');
      const token = raw ? JSON.parse(raw)?.state?.token : null;
      const res = await fetch(`${BASE}/api/ai/script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ type: scriptType, language: lang, context: scriptModal.context }),
      });
      const data = await res.json();
      setScript(data.script || getFallbackScript(scriptType, lang));
    } catch {
      setScript(getFallbackScript(scriptType, lang));
    }
    setLoading(false);
  };

  const copyScript = () => {
    const text = editing ? editDraft : script;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEdit = () => {
    setEditDraft(script);
    setEditing(true);
  };

  const saveEdit = () => {
    setScript(editDraft);
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditDraft('');
  };

  const handleVoicePreview = async () => {
    const text = editing ? editDraft : script;
    if (!text || !window.speechSynthesis) return;
    setVoiceLoading(true);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/\[.*?\]/g, ''));
    utterance.rate = 0.9;
    utterance.onend = () => setVoiceLoading(false);
    utterance.onerror = () => setVoiceLoading(false);
    window.speechSynthesis.speak(utterance);
    setVoiceLoading(false);
  };

  return (
    <Modal open={scriptModal.open} onClose={closeScriptModal} title="AI Script Generator" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Script Type" value={scriptType} onChange={e => setScriptType(e.target.value)}
            options={SCRIPT_TYPES} />
          <Select label="Language" value={lang} onChange={e => setLang(e.target.value)}
            options={LANGUAGES.map(l => ({ value: l.code, label: `${l.label} (${l.english})` }))} />
        </div>

        <Button onClick={generateScript} loading={loading} icon={<Sparkles size={14} />} className="w-full justify-center">
          {loading ? 'Generating Script...' : script ? 'Regenerate Script' : 'Generate with AI'}
        </Button>

        {script && (
          <div className="relative">
            {/* Script header */}
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-[var(--text-muted)]">
                {editing ? 'Editing script — make your changes below' : 'AI-generated script · edit as needed'}
              </p>
              {!editing ? (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors px-2 py-1 rounded-lg hover:bg-[rgba(74,222,128,0.08)]"
                >
                  <Pencil size={11} /> Edit
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={saveEdit}
                    className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors px-2 py-1 rounded-lg hover:bg-[rgba(74,222,128,0.08)]"
                  >
                    <Save size={11} /> Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-2 py-1 rounded-lg hover:bg-[rgba(255,255,255,0.05)]"
                  >
                    <X size={11} /> Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Script body */}
            {editing ? (
              <textarea
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                rows={12}
                className="w-full ag-input text-sm leading-relaxed font-body resize-none"
                placeholder="Edit your script here…"
                autoFocus
              />
            ) : (
              <div
                className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)] min-h-[200px] cursor-text"
                onClick={startEdit}
                title="Click to edit"
              >
                <pre className="text-sm text-[var(--text-primary)] whitespace-pre-wrap font-body leading-relaxed">{script}</pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button variant="secondary" size="sm" icon={copied ? <Check size={13} /> : <Copy size={13} />} onClick={copyScript}>
                {copied ? 'Copied!' : 'Copy Script'}
              </Button>
              <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={generateScript} loading={loading}>
                Regenerate
              </Button>
              <Button variant="ghost" size="sm" icon={<Mic size={13} />} onClick={handleVoicePreview} loading={voiceLoading}>
                {voiceLoading ? 'Speaking…' : 'Preview Voice'}
              </Button>
              {editing && (
                <Button size="sm" icon={<Save size={13} />} onClick={saveEdit} className="ml-auto">
                  Save Changes
                </Button>
              )}
            </div>

            {/* Real dispatch — actually places the call / sends the WhatsApp message */}
            {canDispatch ? (
              <div className="mt-3 p-3 rounded-xl bg-[rgba(74,222,128,0.05)] border border-[var(--border)] space-y-2">
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  Send this to {contact?.name ?? recoveryCase?.customer_name ?? 'the contact'} now:
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" icon={<Phone size={12} />} onClick={() => dispatchJob('voice')} loading={dispatching === 'voice'} disabled={dispatching !== null}>
                    Call Now (AI Voice)
                  </Button>
                  <Button size="sm" variant="secondary" icon={<MessageSquare size={12} />} onClick={() => dispatchJob('whatsapp')} loading={dispatching === 'whatsapp'} disabled={dispatching !== null}>
                    Send WhatsApp Now
                  </Button>
                </div>
                {dispatchMsg && <p className="text-xs text-brand-400">{dispatchMsg}</p>}
              </div>
            ) : (
              <p className="text-[10px] text-[var(--text-muted)] mt-2">
                Add this person to your CRM contacts to enable one-click real call/WhatsApp dispatch.
              </p>
            )}

            {/* Word count */}
            <p className="text-[10px] text-[var(--text-muted)] mt-2">
              {(editing ? editDraft : script).split(/\s+/).filter(Boolean).length} words ·
              {' '}{Math.ceil((editing ? editDraft : script).split(/\s+/).filter(Boolean).length / 130)} min read aloud
            </p>
          </div>
        )}

        {!script && !loading && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="p-3 rounded-xl bg-[rgba(74,222,128,0.08)] border border-[var(--border)] mb-3">
              <Sparkles size={20} className="text-brand-400" />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">Select type & language, then generate</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">AI creates scripts in Marathi, Hindi, English & 6 more Indian languages</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

function getFallbackScript(type: string, lang: string): string {
  const scripts: Record<string, Record<string, string>> = {
    cold_call_new: {
      mr: `नमस्कार! मी [तुमचे नाव] बोलतोय, [डीलरशिप नाव] कडून.

आपण नवीन ट्रॅक्टर घेण्याचा विचार करत आहात का?
आम्ही सध्या Mahindra 575 DI वर खूप चांगली ऑफर देत आहोत.

[थांबा, उत्तराची वाट पहा]

PM-KISAN च्या पैशातून EMI सुरू करता येईल.
फक्त ₹5,000 बुकिंगमध्ये आजच आपले नाव नोंदवा.

आपण कधी यायला जमेल - शनिवारी किंवा रविवारी?`,
      hi: `नमस्ते! मैं [आपका नाम] बोल रहा हूँ, [डीलरशिप नाम] से।

क्या आप नया ट्रैक्टर लेने का सोच रहे हैं?
हम अभी Mahindra 575 DI पर बहुत अच्छा ऑफर दे रहे हैं।

[रुकें, जवाब का इंतजार करें]

PM-KISAN की राशि से EMI शुरू कर सकते हैं।
सिर्फ ₹5,000 बुकिंग में आज ही नाम दर्ज करें।

आप कब आ सकते हैं - शनिवार या रविवार?`,
      en: `Hello! I'm calling from [Dealership Name].

Are you considering buying a new tractor?
We have an excellent offer on Mahindra 575 DI right now.

[Pause for response]

You can start EMI using your PM-KISAN funds.
Book today with just ₹5,000 and secure your tractor.

When can you visit - Saturday or Sunday?`,
    },
    recovery_gentle: {
      mr: `नमस्कार [ग्राहकाचे नाव]जी!

मी [डीलरशिप नाव] कडून बोलतोय.
आपल्या खात्यावर ₹[रक्कम] थकबाकी आहे,
देय तारीख [तारीख] होती.

हे आपल्या लक्षात नसेल, म्हणून कळवत आहे.
आपण कधी भरू शकता?`,
      hi: `नमस्ते [ग्राहक नाम] जी!

मैं [डीलरशिप नाम] से बोल रहा हूँ।
आपके खाते पर ₹[राशि] बकाया है,
देय तिथि [तारीख] थी।

शायद आपका ध्यान नहीं गया होगा।
आप कब भुगतान कर सकते हैं?`,
      en: `Hello [Customer Name]!

I'm calling from [Dealership Name].
You have an outstanding amount of ₹[Amount],
which was due on [Date].

Just a friendly reminder in case it slipped your mind.
When would you be able to clear this?`,
    },
  };
  const typeScripts = scripts[type] || scripts['cold_call_new'];
  return typeScripts[lang] || typeScripts['en'];
}