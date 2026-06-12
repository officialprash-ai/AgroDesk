import React, { useState } from 'react';
import { Modal, Button, Select } from '../ui';
import { useAppStore } from '../../store';
import { Sparkles, Copy, RefreshCw, Check, Mic } from 'lucide-react';
import { LANGUAGES } from '../../lib/utils';

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

export const AIScriptModal: React.FC = () => {
  const { scriptModal, closeScriptModal } = useAppStore();
  const [lang, setLang] = useState('mr');
  const [scriptType, setScriptType] = useState(scriptModal.type || 'cold_call_new');
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateScript = async () => {
    setLoading(true);
    setScript('');
    try {
      const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${BASE}/api/ai/script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          {loading ? 'Generating Script...' : 'Generate with AI'}
        </Button>

        {script && (
          <div className="relative">
            <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)] min-h-[200px]">
              <pre className="text-sm text-[var(--text-primary)] whitespace-pre-wrap font-body leading-relaxed">{script}</pre>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="secondary" size="sm" icon={copied ? <Check size={13} /> : <Copy size={13} />} onClick={copyScript}>
                {copied ? 'Copied!' : 'Copy Script'}
              </Button>
              <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={generateScript}>
                Regenerate
              </Button>
              <Button variant="ghost" size="sm" icon={<Mic size={13} />}>
                Preview Voice
              </Button>
            </div>
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
