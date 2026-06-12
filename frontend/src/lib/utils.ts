import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const LANGUAGES = [
  { code: 'mr', label: 'मराठी', english: 'Marathi' },
  { code: 'hi', label: 'हिन्दी', english: 'Hindi' },
  { code: 'en', label: 'English', english: 'English' },
  { code: 'gu', label: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
  { code: 'ta', label: 'தமிழ்', english: 'Tamil' },
  { code: 'te', label: 'తెలుగు', english: 'Telugu' },
  { code: 'kn', label: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'bn', label: 'বাংলা', english: 'Bengali' },
];

export const BILL_CATEGORIES = [
  { key: 'tractor_purchase', label: 'Tractor Purchase Bills', icon: '🚜', color: '#4ade80' },
  { key: 'tractor_sales', label: 'Tractor Sales Bills', icon: '📋', color: '#60a5fa' },
  { key: 'spare_purchase', label: 'Spare Parts Purchase', icon: '⚙️', color: '#fbbf24' },
  { key: 'spare_sales', label: 'Spare Parts Sales', icon: '🔧', color: '#a78bfa' },
  { key: 'cash_voucher', label: 'Cash Vouchers', icon: '💵', color: '#f87171' },
  { key: 'other', label: 'Other Bills', icon: '📁', color: '#6b7280' },
];

export const TRACTOR_MAKES = ['Mahindra', 'John Deere', 'TAFE', 'Sonalika', 'Kubota', 'Eicher', 'New Holland', 'VST', 'Force', 'Captain', 'Farmtrac'];

export function getLeadStatusColor(status: string): string {
  const map: Record<string, string> = {
    new: 'status-info', contacted: 'status-purple', qualified: 'status-active',
    proposal: 'status-pending', negotiation: 'status-pending', won: 'status-active', lost: 'status-overdue',
  };
  return map[status] || 'status-info';
}

export function getUrgencyColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#fbbf24';
  return '#4ade80';
}
