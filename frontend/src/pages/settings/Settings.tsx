import React, { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, Button, Input, Select, TabBar, Badge, Modal } from '../../components/ui';
import { useAppStore } from '../../store';
import { authApi } from '../../lib/api';
import { LANGUAGES } from '../../lib/utils';
import {
  Building, Zap, Phone, MessageSquare, Database, CheckCircle,
  Upload, X, Image, Lock, ExternalLink, Eye, EyeOff, AlertCircle,
  Copy, Check, Info, Wifi, WifiOff,
} from 'lucide-react';

// ── Integration config types ───────────────────────────────────────────────────
type IntegrationKey = 'whatsapp' | 'meta_ads' | 'tally' | 'msg91';

interface IntegrationConfig {
  name: string;
  provider: string;
  status: 'connected' | 'disconnected';
  icon: React.ElementType;
  color: string;
  desc: string;
  platformOnly?: boolean;
  configKey?: IntegrationKey;
}

const INTEGRATIONS: IntegrationConfig[] = [
  { name: 'WhatsApp Business API', provider: 'AiSensy / Interakt', status: 'connected',    icon: MessageSquare, color: '#4ade80', desc: 'BSP connected · 1,000 msgs/day tier', configKey: 'whatsapp' },
  { name: 'Exotel Voice',          provider: 'Exotel India',        status: 'connected',    icon: Phone,         color: '#60a5fa', desc: 'Outbound calling · 200 calls/min',  platformOnly: true },
  { name: 'Sarvam AI',             provider: 'Sarvam.ai',           status: 'connected',    icon: Zap,           color: '#a78bfa', desc: 'Marathi STT/TTS · 22 Indian languages', platformOnly: true },
  { name: 'Meta Ads',              provider: 'Meta Marketing API',  status: 'disconnected', icon: Zap,           color: '#fbbf24', desc: 'Connect for automated ad campaigns', configKey: 'meta_ads' },
  { name: 'TallyPrime',            provider: 'Desktop Connector',   status: 'disconnected', icon: Database,      color: '#f87171', desc: 'Requires Tally Connector on PC',    configKey: 'tally' },
  { name: 'MSG91 SMS',             provider: 'MSG91 (DLT Registered)', status: 'connected', icon: MessageSquare, color: '#34d399', desc: 'Transactional + Promotional · DLT active', configKey: 'msg91' },
];

// ── WhatsApp Config Modal ─────────────────────────────────────────────────────
const WhatsAppModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [form, setForm] = useState({ api_key: '', phone_number_id: '', waba_id: '', webhook_verify_token: 'agrodesk_' + Math.random().toString(36).slice(2, 9) });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const webhookUrl = `${import.meta.env.VITE_API_URL ?? 'https://your-api.railway.app'}/api/webhook/whatsapp`;

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1500);
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title="Configure WhatsApp Business API" size="md">
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.2)] flex gap-2">
          <Info size={13} className="text-brand-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-secondary)]">Use your BSP (AiSensy / Interakt / official Meta) credentials. Get these from your WhatsApp Business Manager.</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Input label="API Key / Access Token" type={showKey ? 'text' : 'password'} value={form.api_key}
              onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} placeholder="EAAxxxxxxxx..." />
            <button onClick={() => setShowKey(s => !s)}
              className="absolute right-3 top-8 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Input label="Phone Number ID" value={form.phone_number_id}
            onChange={e => setForm(f => ({ ...f, phone_number_id: e.target.value }))} placeholder="1234567890" />
          <Input label="WhatsApp Business Account ID (WABA ID)" value={form.waba_id}
            onChange={e => setForm(f => ({ ...f, waba_id: e.target.value }))} placeholder="0987654321" />
        </div>

        <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)] space-y-2">
          <p className="text-xs font-semibold text-[var(--text-primary)]">Webhook URL (set in Meta Business Manager)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] text-brand-400 font-mono break-all">{webhookUrl}</code>
            <button onClick={copyWebhook} className="flex-shrink-0 text-[var(--text-muted)] hover:text-brand-400 transition-colors">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">Verify Token: <span className="font-mono text-[var(--text-secondary)]">{form.webhook_verify_token}</span></p>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} icon={saved ? <Check size={13} /> : undefined}>
            {saved ? 'Saved!' : 'Save & Connect'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Meta Ads Config Modal ─────────────────────────────────────────────────────
const MetaAdsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [form, setForm] = useState({ access_token: '', ad_account_id: '', pixel_id: '', page_id: '' });
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!form.access_token || !form.ad_account_id) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1500);
  };

  return (
    <Modal open={open} onClose={onClose} title="Connect Meta Ads" size="md">
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.2)] flex gap-2">
          <Info size={13} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-secondary)]">Create a System User in Meta Business Manager and generate a permanent access token with <code className="text-yellow-400">ads_management</code> permission.</p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Input label="Access Token (permanent)" type={showToken ? 'text' : 'password'} value={form.access_token}
              onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))} placeholder="EAAxxxxxxxx..." />
            <button onClick={() => setShowToken(s => !s)}
              className="absolute right-3 top-8 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Input label="Ad Account ID" value={form.ad_account_id}
            onChange={e => setForm(f => ({ ...f, ad_account_id: e.target.value }))} placeholder="act_123456789" />
          <Input label="Facebook Page ID" value={form.page_id}
            onChange={e => setForm(f => ({ ...f, page_id: e.target.value }))} placeholder="1234567890" />
          <Input label="Meta Pixel ID (optional)" value={form.pixel_id}
            onChange={e => setForm(f => ({ ...f, pixel_id: e.target.value }))} placeholder="987654321" />
        </div>

        <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener"
          className="flex items-center gap-1.5 text-xs text-brand-400 hover:underline">
          <ExternalLink size={11} /> Open Meta Business Manager →
        </a>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!form.access_token || !form.ad_account_id}
            icon={saved ? <Check size={13} /> : undefined}>
            {saved ? 'Connected!' : 'Connect Meta Ads'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── TallyPrime Config Modal ───────────────────────────────────────────────────
const TallyModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [form, setForm] = useState({ host: 'localhost', port: '9000', company_name: '' });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult('idle');
    await new Promise(r => setTimeout(r, 1200));
    setTesting(false);
    // Simulate: if port is default 9000 and company filled → ok
    setTestResult(form.company_name ? 'ok' : 'fail');
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1500);
  };

  return (
    <Modal open={open} onClose={onClose} title="Connect TallyPrime" size="md">
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-[rgba(248,113,113,0.06)] border border-[rgba(248,113,113,0.2)] flex gap-2">
          <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[var(--text-secondary)] space-y-1">
            <p className="font-medium text-[var(--text-primary)]">Desktop Connector required</p>
            <p>Install the <strong>AgroDesk Tally Connector</strong> on the PC running TallyPrime. It creates a local REST bridge on the port below.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input label="Host / IP" value={form.host}
              onChange={e => setForm(f => ({ ...f, host: e.target.value }))} placeholder="localhost or 192.168.1.x" />
          </div>
          <Input label="Port" value={form.port}
            onChange={e => setForm(f => ({ ...f, port: e.target.value }))} placeholder="9000" />
        </div>
        <Input label="Company Name (in Tally)" value={form.company_name}
          onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Shree Agro Dealership" />

        {testResult === 'ok' && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.2)]">
            <Wifi size={13} className="text-brand-400" />
            <span className="text-xs text-brand-400 font-medium">Connected to Tally successfully</span>
          </div>
        )}
        {testResult === 'fail' && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)]">
            <WifiOff size={13} className="text-red-400" />
            <span className="text-xs text-red-400">Could not connect. Check connector is running and company name is correct.</span>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" onClick={handleTest} loading={testing}>
            Test Connection
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={testResult !== 'ok'}
            icon={saved ? <Check size={13} /> : undefined}>
            {saved ? 'Connected!' : 'Save & Connect'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── MSG91 SMS Config Modal ────────────────────────────────────────────────────
const MSG91Modal: React.FC<{ open: boolean; onClose: () => void; isEdit?: boolean }> = ({ open, onClose, isEdit }) => {
  const [form, setForm] = useState({
    auth_key: '',
    sender_id: 'AGRODS',
    template_id_transact: '',
    template_id_promo: '',
    dlt_entity_id: '',
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!form.auth_key || !form.sender_id) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 900));
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1500);
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'MSG91 SMS Settings' : 'Connect MSG91 SMS'} size="md">
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="relative">
            <Input label="Auth Key" type={showKey ? 'text' : 'password'} value={form.auth_key}
              onChange={e => setForm(f => ({ ...f, auth_key: e.target.value }))} placeholder="xxxxxx-xxxx-xxxx-xxxx" />
            <button onClick={() => setShowKey(s => !s)}
              className="absolute right-3 top-8 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <Input label="Sender ID (6 chars, DLT approved)" value={form.sender_id}
            onChange={e => setForm(f => ({ ...f, sender_id: e.target.value.toUpperCase().slice(0, 6) }))}
            placeholder="AGRODS" />
          <Input label="DLT Entity ID" value={form.dlt_entity_id}
            onChange={e => setForm(f => ({ ...f, dlt_entity_id: e.target.value }))} placeholder="1234567890123456789" />
        </div>

        <div className="border-t border-[var(--border)] pt-3 space-y-3">
          <p className="text-xs font-semibold text-[var(--text-primary)]">DLT Template IDs</p>
          <Input label="Transactional Template ID" value={form.template_id_transact}
            onChange={e => setForm(f => ({ ...f, template_id_transact: e.target.value }))} placeholder="1234567890123456789" />
          <Input label="Promotional Template ID" value={form.template_id_promo}
            onChange={e => setForm(f => ({ ...f, template_id_promo: e.target.value }))} placeholder="1234567890123456789" />
        </div>

        <a href="https://msg91.com/login" target="_blank" rel="noopener"
          className="flex items-center gap-1.5 text-xs text-brand-400 hover:underline">
          <ExternalLink size={11} /> Open MSG91 Dashboard →
        </a>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!form.auth_key || !form.sender_id}
            icon={saved ? <Check size={13} /> : undefined}>
            {saved ? 'Saved!' : isEdit ? 'Save Changes' : 'Connect MSG91'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ── Platform-Only Badge ───────────────────────────────────────────────────────
const PlatformLockBadge: React.FC = () => (
  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[var(--border)] text-[var(--text-muted)]">
    <Lock size={11} />
    <span className="text-[10px] font-medium">Platform managed</span>
  </div>
);

// ── Main Settings Page ────────────────────────────────────────────────────────
export const Settings: React.FC = () => {
  const { dealer, setAuth, token, dealerLogo, setDealerLogo } = useAppStore();
  const [tab, setTab] = useState('profile');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [logoError, setLogoError] = useState('');

  // Integration modal state
  const [openModal, setOpenModal] = useState<IntegrationKey | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    if (!file.type.startsWith('image/')) { setLogoError('Please upload an image file (JPG, PNG, SVG, WebP)'); return; }
    if (file.size > 2 * 1024 * 1024) { setLogoError('Image must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setDealerLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const [form, setForm] = useState({
    name: dealer?.name ?? '',
    city: dealer?.city ?? '',
    district: dealer?.district ?? '',
    gst_number: '',
    phone: dealer?.phone ?? '',
    email: '',
    language: dealer?.language ?? 'mr',
  });

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    setSaveSuccess(false);
    try {
      const res = await authApi.updateProfile(form);
      if (token) setAuth(token, res.dealer);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Profile save failed:', e);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Settings" subtitle="Dealer profile, integrations & agent configuration" />
      <div className="p-6 space-y-5 page-enter">

        <TabBar tabs={[
          { id: 'profile', label: 'Profile' },
          { id: 'integrations', label: 'Integrations' },
          { id: 'agents', label: 'Agent Config' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'billing', label: 'Billing' },
        ]} active={tab} onChange={setTab} />

        {/* ── Profile ── */}
        {tab === 'profile' && (
          <div className="max-w-xl space-y-4">
            <Card>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Image size={14} className="text-brand-400" />Dealership Logo
              </h3>
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center flex-shrink-0 overflow-hidden bg-[rgba(255,255,255,0.03)] relative group">
                  {dealerLogo ? (
                    <>
                      <img src={dealerLogo} alt="Dealership logo" className="w-full h-full object-contain p-1" />
                      <button onClick={() => setDealerLogo(null)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                        <X size={16} className="text-white" />
                      </button>
                    </>
                  ) : (
                    <Image size={24} className="text-[var(--text-muted)]" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-[var(--text-secondary)]">Upload your dealership logo. It will appear in the sidebar and on printed documents.</p>
                  <p className="text-[10px] text-[var(--text-muted)]">JPG, PNG, SVG, WebP · Max 2 MB · Recommended: 200×200px</p>
                  <div className="flex gap-2 items-center">
                    <label htmlFor="logo-file-input" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition-all cursor-pointer">
                      <Upload size={12} />
                      {dealerLogo ? 'Change Logo' : 'Upload Logo'}
                    </label>
                    {dealerLogo && (
                      <Button size="sm" variant="secondary" onClick={() => setDealerLogo(null)}>Remove</Button>
                    )}
                  </div>
                  {logoError && <p className="text-xs text-red-400">{logoError}</p>}
                  <input id="logo-file-input" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2"><Building size={14} className="text-brand-400" />Dealership Information</h3>
              <div className="space-y-3">
                <Input label="Dealership Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  <Input label="District" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
                </div>
                <Select label="State" options={[{ value: 'MH', label: 'Maharashtra' }, { value: 'GJ', label: 'Gujarat' }, { value: 'PB', label: 'Punjab' }]} />
                <Input label="GST Number" placeholder="27XXXXX1234Z1" value={form.gst_number} onChange={e => setForm(f => ({ ...f, gst_number: e.target.value }))} />
                <Input label="Primary Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                <Input label="Email" type="email" placeholder="dealer@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                <Select label="Default Language for AI" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} options={LANGUAGES.map(l => ({ value: l.code, label: `${l.label} (${l.english})` }))} />
              </div>
              <div className="flex items-center gap-3 mt-4">
                <Button onClick={handleSaveProfile} loading={saveLoading}>Save Profile</Button>
                {saveSuccess && <span className="text-xs text-brand-400 flex items-center gap-1"><CheckCircle size={12} /> Saved!</span>}
              </div>
            </Card>
          </div>
        )}

        {/* ── Integrations ── */}
        {tab === 'integrations' && (
          <div className="max-w-2xl space-y-3">
            {/* Platform note */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--border)]">
              <Lock size={12} className="text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-muted)]">
                <span className="text-[var(--text-secondary)] font-medium">Exotel Voice</span> and <span className="text-[var(--text-secondary)] font-medium">Sarvam AI</span> are configured in the AgroDesk Ops Portal — contact your account manager to update these.
              </p>
            </div>

            {INTEGRATIONS.map(int => {
              const Icon = int.icon;
              const isPlatform = !!int.platformOnly;
              return (
                <Card key={int.name} className={`flex items-center gap-4 ${isPlatform ? 'opacity-70' : ''}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${int.color}15` }}>
                    <Icon size={18} style={{ color: isPlatform ? '#6b7280' : int.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{int.name}</p>
                      <Badge variant={int.status === 'connected' ? 'active' : 'overdue'}>{int.status}</Badge>
                      {isPlatform && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[var(--text-muted)] border border-[var(--border)]">
                          ops portal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{int.provider}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">{int.desc}</p>
                  </div>
                  {isPlatform ? (
                    <PlatformLockBadge />
                  ) : (
                    <Button
                      variant={int.status === 'connected' ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => int.configKey && setOpenModal(int.configKey)}
                    >
                      {int.status === 'connected' ? 'Configure' : 'Connect'}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Agent Config ── */}
        {tab === 'agents' && (
          <div className="max-w-xl space-y-4">
            {[
              { module: 'A', name: 'Sales Engine',      settings: ['Auto-post to Facebook Page', 'WhatsApp broadcast opt-in only', 'AI scripts in Marathi default'], on: [true, true, true] },
              { module: 'B', name: 'Used Tractor Agent', settings: ['Auto-urgency scoring', 'Buyer matching alerts', 'AI listing descriptions'], on: [true, true, true] },
              { module: 'C', name: 'Money Recovery',    settings: ['Auto-escalate after 7 days', 'Legal stage needs approval', 'WhatsApp payment links'], on: [true, true, false] },
              { module: 'D', name: 'Cold Calling Agent', settings: ['DLT scrub before calling', 'TRAI quiet hours (9AM–9PM)', 'Auto-add interested to CRM'], on: [true, true, true] },
              { module: 'E', name: 'AI Salesman',       settings: ['Auto-respond in 10s', 'Escalate after 3 rounds', 'Send brochure on first enquiry'], on: [true, true, false] },
              { module: 'F', name: 'AI Accountant',     settings: ['Monthly reminder on 1st', 'Daily nudge until submitted', 'Auto OCR on upload'], on: [true, true, true] },
            ].map(agent => {
              const [toggles, setToggles] = React.useState(agent.on);
              return (
                <Card key={agent.module}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-[rgba(74,222,128,0.1)] text-brand-400 border border-[rgba(74,222,128,0.2)]">{agent.module}</span>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{agent.name}</h3>
                  </div>
                  <div className="space-y-2">
                    {agent.settings.map((s, i) => (
                      <div key={s} className="flex items-center justify-between">
                        <span className="text-xs text-[var(--text-secondary)]">{s}</span>
                        <button
                          onClick={() => setToggles(prev => prev.map((v, j) => j === i ? !v : v))}
                          className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${toggles[i] ? 'bg-brand-400' : 'bg-[rgba(255,255,255,0.1)]'}`}
                        >
                          <div className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: toggles[i] ? '18px' : '2px' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Notifications ── */}
        {tab === 'notifications' && (
          <div className="max-w-xl space-y-4">
            <Card>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Notification Channels</h3>
              <div className="space-y-3">
                {[
                  'New interested lead from cold call',
                  'Payment received (recovery)',
                  'Bill upload reminder (accountant)',
                  'Tally sync completed',
                  'Campaign completed',
                  'Tractor enquiry received',
                ].map(n => (
                  <div key={n} className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)]">{n}</span>
                    <div className="flex gap-2">
                      {['WA', 'SMS', 'App'].map(ch => (
                        <label key={ch} className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] cursor-pointer">
                          <input type="checkbox" className="accent-brand-400" defaultChecked={ch !== 'SMS'} />
                          {ch}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-4">Save Preferences</Button>
            </Card>
          </div>
        )}

        {/* ── Billing ── */}
        {tab === 'billing' && (
          <div className="max-w-2xl space-y-4">
            <Card className="bg-[rgba(74,222,128,0.04)] border-brand-400/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-brand-400 font-semibold uppercase tracking-wider mb-1">Current Plan</p>
                  <h3 className="font-display font-bold text-2xl text-[var(--text-primary)]">{dealer?.plan ?? 'Growth'}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">₹6,999/month · Billed monthly</p>
                </div>
                <Badge variant="active">Active</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[['2,000', 'AI Calls/mo'], ['5,000', 'WhatsApp msgs'], ['All 6', 'Agent modules']].map(([v, l]) => (
                  <div key={l} className="text-center p-2 rounded-lg bg-[rgba(255,255,255,0.03)]">
                    <p className="text-base font-bold text-brand-400">{v}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{l}</p>
                  </div>
                ))}
              </div>
            </Card>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'Starter', price: '₹2,999', features: ['500 AI calls', '1,000 WhatsApp', 'CRM + 3 modules'] },
                { name: 'Growth',  price: '₹6,999', features: ['2,000 AI calls', '5,000 WhatsApp', 'All 6 modules'], current: true },
                { name: 'Pro',     price: '₹14,999', features: ['Unlimited calls', 'Unlimited WA', 'Custom AI models', 'Tally sync'] },
              ].map(plan => (
                <Card key={plan.name} className={plan.current ? 'border-brand-400/30 bg-[rgba(74,222,128,0.04)]' : ''}>
                  <p className="font-display font-bold text-base text-[var(--text-primary)]">{plan.name}</p>
                  <p className="text-xl font-bold text-brand-400 my-1">{plan.price}<span className="text-xs text-[var(--text-muted)]">/mo</span></p>
                  <div className="space-y-1.5 my-3">
                    {plan.features.map(f => (
                      <p key={f} className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                        <CheckCircle size={10} className="text-brand-400 flex-shrink-0" />{f}
                      </p>
                    ))}
                  </div>
                  <Button variant={plan.current ? 'secondary' : 'outline'} size="sm" className="w-full justify-center">
                    {plan.current ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Integration Modals ── */}
      <WhatsAppModal open={openModal === 'whatsapp'} onClose={() => setOpenModal(null)} />
      <MetaAdsModal  open={openModal === 'meta_ads'} onClose={() => setOpenModal(null)} />
      <TallyModal    open={openModal === 'tally'}    onClose={() => setOpenModal(null)} />
      <MSG91Modal    open={openModal === 'msg91'}    onClose={() => setOpenModal(null)} isEdit />
    </div>
  );
};
