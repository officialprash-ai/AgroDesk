/**
 * AgroDesk UI translations.
 *
 * Deliberately dependency-free — a dictionary plus a `useT()` hook, driven by
 * the language selector in the header. No i18next/react-intl to add weight to
 * an already-large bundle.
 *
 * Defaults to ENGLISH: AgroDesk sells across India, so the interface must not
 * assume Marathi. Missing keys fall back English → the key itself, so a partial
 * translation degrades gracefully instead of rendering blanks.
 *
 * IMPORTANT — two different "languages" exist in this product:
 *   - UI language      (this file)              → what the DEALER sees.
 *   - Content language (dealers.language)       → what the FARMER hears/reads:
 *                                                 call scripts, WhatsApp, TTS.
 * They are intentionally separate. A dealer in Pune may want an English console
 * while still calling farmers in Marathi.
 *
 * Adding a page: add its keys to `en` first (source of truth), then translate.
 * Untranslated keys automatically show English rather than breaking.
 */

import { useAppStore } from '../store';

export type Lang = 'en' | 'mr' | 'hi' | 'gu' | 'pa' | 'ta' | 'te' | 'kn' | 'bn';

export const DEFAULT_LANG: Lang = 'en';

type Dict = Record<string, string>;

// ─── English — source of truth ────────────────────────────────────────────────
const en: Dict = {
  // Navigation
  'nav.overview': 'Overview',
  'nav.dashboard': 'Dashboard',
  'nav.analytics': 'Analytics',
  'nav.crm': 'CRM',
  'nav.contacts': 'Contacts',
  'nav.pipeline': 'Pipeline',
  'nav.agents': 'Agents',
  'nav.salesEngine': 'Sales Engine',
  'nav.usedTractor': 'Used Tractor',
  'nav.moneyRecovery': 'Money Recovery',
  'nav.coldCalling': 'Cold Calling',
  'nav.aiSalesman': 'AI Salesman',
  'nav.aiAccountant': 'AI Accountant',
  'nav.supportIntake': 'Support Intake',
  'nav.system': 'System',
  'nav.settings': 'Settings',
  'nav.help': 'Help & Support',
  'nav.collapse': 'Collapse',
  'nav.signOut': 'Sign Out',

  // Common actions
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.search': 'Search',
  'common.loading': 'Loading…',
  'common.all': 'All',
  'common.new': 'New',
  'common.inProgress': 'In progress',
  'common.done': 'Done',
  'common.saved': 'Saved',
  'common.saveFailed': 'Could not save',
  'common.updateFailed': 'Could not update',

  // Support Intake
  'support.title': 'Support Requests',
  'support.subtitle': 'Every call and WhatsApp request is logged here',
  'support.tab.service': 'Service / Repair',
  'support.tab.other': 'Other',
  'support.tab.settings': 'Settings',
  'support.addNew': 'New entry',
  'support.empty.title': 'No requests',
  'support.empty.message': 'New service or repair requests will appear here.',
  'support.callBack': 'Call back',
  'support.notConnected': 'Call was not connected',
  'support.markedDone': 'Marked as done',
  'support.added': 'Entry added',
  'support.addFailed': 'Could not add entry',
  'support.newRequests': 'new requests',
  'support.callsNotConnected': 'calls not connected',
  'support.type.SERVICE': 'Service',
  'support.type.REPAIR': 'Repair',
  'support.type.OTHER': 'Other',
  'support.type.UNSURE': 'Unclear',

  // Support — routing settings
  'support.routing.intro':
    'Service and repair requests go to the mechanic, other work to the technician. If neither is set, they go to the dealer.',
  'support.routing.mechanic': 'Mechanic phone',
  'support.routing.mechanicHint': 'For service and repairs',
  'support.routing.technician': 'Technician phone',
  'support.routing.technicianHint': 'For RTO, insurance, documents, spare parts',
  'support.routing.dealer': 'Dealer phone',
  'support.routing.dealerHint': 'Backup — used when no one else is set',
  'support.routing.officeStart': 'Office opens',
  'support.routing.officeEnd': 'Office closes',
  'support.routing.officeHint': 'IST, 24-hour',
  'support.routing.afterHoursHint': 'Calls are not transferred after this time',
  'support.routing.saved': 'Routing saved',

  // Support — manual entry
  'support.form.phone': 'Phone number',
  'support.form.name': 'Customer name (optional)',
  'support.form.work': 'What is the work?',
};

// ─── Translations (fall back to English per-key) ──────────────────────────────
const mr: Dict = {
  'nav.overview': 'आढावा', 'nav.dashboard': 'डॅशबोर्ड', 'nav.analytics': 'विश्लेषण',
  'nav.crm': 'सीआरएम', 'nav.contacts': 'संपर्क', 'nav.pipeline': 'पाइपलाइन',
  'nav.agents': 'एजंट', 'nav.salesEngine': 'सेल्स इंजिन', 'nav.usedTractor': 'जुने ट्रॅक्टर',
  'nav.moneyRecovery': 'पैसे वसुली', 'nav.coldCalling': 'कोल्ड कॉलिंग',
  'nav.aiSalesman': 'एआय सेल्समन', 'nav.aiAccountant': 'एआय अकाउंटंट',
  'nav.supportIntake': 'सपोर्ट विनंत्या', 'nav.system': 'सिस्टीम', 'nav.settings': 'सेटिंग्ज',
  'nav.help': 'मदत', 'nav.collapse': 'लहान करा', 'nav.signOut': 'साइन आउट',
  'common.save': 'जतन करा', 'common.cancel': 'रद्द', 'common.search': 'शोधा',
  'common.loading': 'लोड होत आहे…', 'common.all': 'सर्व', 'common.new': 'नवीन',
  'common.inProgress': 'सुरू', 'common.done': 'पूर्ण', 'common.saved': 'जतन झाले',
  'common.saveFailed': 'जतन करता आले नाही', 'common.updateFailed': 'अपडेट करता आले नाही',
  'support.title': 'सपोर्ट विनंत्या',
  'support.subtitle': 'प्रत्येक कॉल आणि WhatsApp विनंती इथे नोंदवली जाते',
  'support.tab.service': 'सेवा / दुरुस्ती', 'support.tab.other': 'इतर', 'support.tab.settings': 'सेटिंग्ज',
  'support.addNew': 'नवीन नोंद', 'support.empty.title': 'विनंत्या नाहीत',
  'support.empty.message': 'इथे नवीन सेवा किंवा दुरुस्ती विनंत्या दिसतील.',
  'support.callBack': 'परत कॉल', 'support.notConnected': 'कॉल जोडला गेला नाही',
  'support.markedDone': 'पूर्ण म्हणून चिन्हांकित', 'support.added': 'नोंद जोडली',
  'support.addFailed': 'नोंद जोडता आली नाही',
  'support.newRequests': 'नवीन विनंत्या', 'support.callsNotConnected': 'कॉल जोडला गेला नाही',
  'support.type.SERVICE': 'सर्विस', 'support.type.REPAIR': 'दुरुस्ती',
  'support.type.OTHER': 'इतर', 'support.type.UNSURE': 'अनिश्चित',
  'support.routing.intro': 'सेवा / दुरुस्ती विनंत्या मेकॅनिककडे जातात, इतर कामे टेक्निशियनकडे. कोणी नसेल तर डीलरकडे.',
  'support.routing.mechanic': 'मेकॅनिक फोन', 'support.routing.mechanicHint': 'सर्विस व दुरुस्तीसाठी',
  'support.routing.technician': 'टेक्निशियन फोन', 'support.routing.technicianHint': 'RTO, विमा, कागदपत्रे, पार्ट्ससाठी',
  'support.routing.dealer': 'डीलर फोन', 'support.routing.dealerHint': 'बॅकअप — इतर कोणी नसल्यास इथे जाईल',
  'support.routing.officeStart': 'ऑफिस सुरू', 'support.routing.officeEnd': 'ऑफिस बंद',
  'support.routing.officeHint': 'IST, 24-तास', 'support.routing.afterHoursHint': 'यानंतर कॉल जोडला जात नाही',
  'support.routing.saved': 'राउटिंग जतन झाले',
  'support.form.phone': 'फोन नंबर', 'support.form.name': 'ग्राहकाचे नाव (ऐच्छिक)', 'support.form.work': 'काय काम आहे?',
};

const hi: Dict = {
  'nav.overview': 'अवलोकन', 'nav.dashboard': 'डैशबोर्ड', 'nav.analytics': 'विश्लेषण',
  'nav.crm': 'सीआरएम', 'nav.contacts': 'संपर्क', 'nav.pipeline': 'पाइपलाइन',
  'nav.agents': 'एजेंट', 'nav.salesEngine': 'सेल्स इंजन', 'nav.usedTractor': 'पुराने ट्रैक्टर',
  'nav.moneyRecovery': 'पैसा वसूली', 'nav.coldCalling': 'कोल्ड कॉलिंग',
  'nav.aiSalesman': 'एआई सेल्समैन', 'nav.aiAccountant': 'एआई अकाउंटेंट',
  'nav.supportIntake': 'सपोर्ट अनुरोध', 'nav.system': 'सिस्टम', 'nav.settings': 'सेटिंग्स',
  'nav.help': 'सहायता', 'nav.collapse': 'छोटा करें', 'nav.signOut': 'साइन आउट',
  'common.save': 'सहेजें', 'common.cancel': 'रद्द', 'common.search': 'खोजें',
  'common.loading': 'लोड हो रहा है…', 'common.all': 'सभी', 'common.new': 'नया',
  'common.inProgress': 'चालू', 'common.done': 'पूर्ण', 'common.saved': 'सहेजा गया',
  'common.saveFailed': 'सहेजा नहीं जा सका', 'common.updateFailed': 'अपडेट नहीं हो सका',
  'support.title': 'सपोर्ट अनुरोध',
  'support.subtitle': 'हर कॉल और WhatsApp अनुरोध यहाँ दर्ज होता है',
  'support.tab.service': 'सर्विस / मरम्मत', 'support.tab.other': 'अन्य', 'support.tab.settings': 'सेटिंग्स',
  'support.addNew': 'नई प्रविष्टि', 'support.empty.title': 'कोई अनुरोध नहीं',
  'support.empty.message': 'यहाँ नई सर्विस या मरम्मत के अनुरोध दिखेंगे.',
  'support.callBack': 'वापस कॉल', 'support.notConnected': 'कॉल नहीं जुड़ा',
  'support.markedDone': 'पूर्ण चिह्नित', 'support.added': 'प्रविष्टि जोड़ी गई',
  'support.addFailed': 'प्रविष्टि नहीं जुड़ी',
  'support.newRequests': 'नए अनुरोध', 'support.callsNotConnected': 'कॉल नहीं जुड़े',
  'support.type.SERVICE': 'सर्विस', 'support.type.REPAIR': 'मरम्मत',
  'support.type.OTHER': 'अन्य', 'support.type.UNSURE': 'अस्पष्ट',
  'support.routing.intro': 'सर्विस और मरम्मत के अनुरोध मैकेनिक को, अन्य काम टेक्नीशियन को. कोई न हो तो डीलर को.',
  'support.routing.mechanic': 'मैकेनिक फोन', 'support.routing.mechanicHint': 'सर्विस और मरम्मत के लिए',
  'support.routing.technician': 'टेक्नीशियन फोन', 'support.routing.technicianHint': 'RTO, बीमा, कागजात, स्पेयर पार्ट्स',
  'support.routing.dealer': 'डीलर फोन', 'support.routing.dealerHint': 'बैकअप — कोई और न हो तो यहाँ जाएगा',
  'support.routing.officeStart': 'ऑफिस खुलता है', 'support.routing.officeEnd': 'ऑफिस बंद',
  'support.routing.officeHint': 'IST, 24-घंटे', 'support.routing.afterHoursHint': 'इसके बाद कॉल ट्रांसफर नहीं होता',
  'support.routing.saved': 'रूटिंग सहेजी गई',
  'support.form.phone': 'फोन नंबर', 'support.form.name': 'ग्राहक का नाम (वैकल्पिक)', 'support.form.work': 'क्या काम है?',
};

const gu: Dict = {
  'nav.dashboard': 'ડેશબોર્ડ', 'nav.contacts': 'સંપર્કો', 'nav.settings': 'સેટિંગ્સ',
  'nav.supportIntake': 'સપોર્ટ વિનંતીઓ', 'nav.moneyRecovery': 'નાણાં વસૂલાત',
  'common.save': 'સાચવો', 'common.cancel': 'રદ કરો', 'common.loading': 'લોડ થઈ રહ્યું છે…',
  'common.all': 'બધા', 'common.new': 'નવું', 'common.inProgress': 'ચાલુ', 'common.done': 'પૂર્ણ',
  'support.title': 'સપોર્ટ વિનંતીઓ',
  'support.subtitle': 'દરેક કૉલ અને WhatsApp વિનંતી અહીં નોંધાય છે',
  'support.tab.service': 'સર્વિસ / સમારકામ', 'support.tab.other': 'અન્ય', 'support.tab.settings': 'સેટિંગ્સ',
  'support.addNew': 'નવી નોંધ', 'support.empty.title': 'કોઈ વિનંતી નથી',
  'support.empty.message': 'અહીં નવી સર્વિસ કે સમારકામની વિનંતીઓ દેખાશે.',
  'support.callBack': 'પાછો કૉલ', 'support.notConnected': 'કૉલ જોડાયો નથી',
  'support.newRequests': 'નવી વિનંતીઓ', 'support.callsNotConnected': 'કૉલ જોડાયા નથી',
  'support.type.SERVICE': 'સર્વિસ', 'support.type.REPAIR': 'સમારકામ',
  'support.type.OTHER': 'અન્ય', 'support.type.UNSURE': 'અસ્પષ્ટ',
};

const pa: Dict = {
  'nav.dashboard': 'ਡੈਸ਼ਬੋਰਡ', 'nav.contacts': 'ਸੰਪਰਕ', 'nav.settings': 'ਸੈਟਿੰਗਾਂ',
  'nav.supportIntake': 'ਸਪੋਰਟ ਬੇਨਤੀਆਂ', 'nav.moneyRecovery': 'ਪੈਸੇ ਦੀ ਵਸੂਲੀ',
  'common.save': 'ਸੰਭਾਲੋ', 'common.cancel': 'ਰੱਦ ਕਰੋ', 'common.loading': 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…',
  'common.all': 'ਸਾਰੇ', 'common.new': 'ਨਵਾਂ', 'common.inProgress': 'ਚਾਲੂ', 'common.done': 'ਪੂਰਾ',
  'support.title': 'ਸਪੋਰਟ ਬੇਨਤੀਆਂ',
  'support.subtitle': 'ਹਰ ਕਾਲ ਅਤੇ WhatsApp ਬੇਨਤੀ ਇੱਥੇ ਦਰਜ ਹੁੰਦੀ ਹੈ',
  'support.tab.service': 'ਸਰਵਿਸ / ਮੁਰੰਮਤ', 'support.tab.other': 'ਹੋਰ', 'support.tab.settings': 'ਸੈਟਿੰਗਾਂ',
  'support.addNew': 'ਨਵੀਂ ਐਂਟਰੀ', 'support.empty.title': 'ਕੋਈ ਬੇਨਤੀ ਨਹੀਂ',
  'support.empty.message': 'ਇੱਥੇ ਨਵੀਆਂ ਸਰਵਿਸ ਜਾਂ ਮੁਰੰਮਤ ਬੇਨਤੀਆਂ ਦਿਖਣਗੀਆਂ.',
  'support.callBack': 'ਵਾਪਸ ਕਾਲ', 'support.notConnected': 'ਕਾਲ ਨਹੀਂ ਜੁੜੀ',
  'support.newRequests': 'ਨਵੀਆਂ ਬੇਨਤੀਆਂ', 'support.callsNotConnected': 'ਕਾਲਾਂ ਨਹੀਂ ਜੁੜੀਆਂ',
  'support.type.SERVICE': 'ਸਰਵਿਸ', 'support.type.REPAIR': 'ਮੁਰੰਮਤ',
  'support.type.OTHER': 'ਹੋਰ', 'support.type.UNSURE': 'ਅਸਪਸ਼ਟ',
};

const ta: Dict = {
  'nav.dashboard': 'டாஷ்போர்டு', 'nav.contacts': 'தொடர்புகள்', 'nav.settings': 'அமைப்புகள்',
  'nav.supportIntake': 'ஆதரவு கோரிக்கைகள்', 'nav.moneyRecovery': 'பண வசூல்',
  'common.save': 'சேமி', 'common.cancel': 'ரத்து', 'common.loading': 'ஏற்றுகிறது…',
  'common.all': 'அனைத்தும்', 'common.new': 'புதிய', 'common.inProgress': 'நடப்பில்', 'common.done': 'முடிந்தது',
  'support.title': 'ஆதரவு கோரிக்கைகள்',
  'support.subtitle': 'ஒவ்வொரு அழைப்பும் WhatsApp கோரிக்கையும் இங்கே பதிவாகும்',
  'support.tab.service': 'சர்வீஸ் / பழுதுபார்ப்பு', 'support.tab.other': 'மற்றவை', 'support.tab.settings': 'அமைப்புகள்',
  'support.addNew': 'புதிய பதிவு', 'support.empty.title': 'கோரிக்கைகள் இல்லை',
  'support.empty.message': 'புதிய சர்வீஸ் அல்லது பழுதுபார்ப்பு கோரிக்கைகள் இங்கே தோன்றும்.',
  'support.callBack': 'திரும்ப அழை', 'support.notConnected': 'அழைப்பு இணைக்கப்படவில்லை',
  'support.newRequests': 'புதிய கோரிக்கைகள்', 'support.callsNotConnected': 'அழைப்புகள் இணைக்கப்படவில்லை',
  'support.type.SERVICE': 'சர்வீஸ்', 'support.type.REPAIR': 'பழுதுபார்ப்பு',
  'support.type.OTHER': 'மற்றவை', 'support.type.UNSURE': 'தெளிவில்லை',
};

const te: Dict = {
  'nav.dashboard': 'డాష్‌బోర్డ్', 'nav.contacts': 'పరిచయాలు', 'nav.settings': 'సెట్టింగ్‌లు',
  'nav.supportIntake': 'సపోర్ట్ అభ్యర్థనలు', 'nav.moneyRecovery': 'డబ్బు వసూలు',
  'common.save': 'సేవ్', 'common.cancel': 'రద్దు', 'common.loading': 'లోడ్ అవుతోంది…',
  'common.all': 'అన్నీ', 'common.new': 'కొత్త', 'common.inProgress': 'జరుగుతోంది', 'common.done': 'పూర్తి',
  'support.title': 'సపోర్ట్ అభ్యర్థనలు',
  'support.subtitle': 'ప్రతి కాల్ మరియు WhatsApp అభ్యర్థన ఇక్కడ నమోదవుతుంది',
  'support.tab.service': 'సర్వీస్ / మరమ్మతు', 'support.tab.other': 'ఇతర', 'support.tab.settings': 'సెట్టింగ్‌లు',
  'support.addNew': 'కొత్త నమోదు', 'support.empty.title': 'అభ్యర్థనలు లేవు',
  'support.empty.message': 'కొత్త సర్వీస్ లేదా మరమ్మతు అభ్యర్థనలు ఇక్కడ కనిపిస్తాయి.',
  'support.callBack': 'తిరిగి కాల్', 'support.notConnected': 'కాల్ కలవలేదు',
  'support.newRequests': 'కొత్త అభ్యర్థనలు', 'support.callsNotConnected': 'కాల్స్ కలవలేదు',
  'support.type.SERVICE': 'సర్వీస్', 'support.type.REPAIR': 'మరమ్మతు',
  'support.type.OTHER': 'ఇతర', 'support.type.UNSURE': 'అస్పష్టం',
};

const kn: Dict = {
  'nav.dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'nav.contacts': 'ಸಂಪರ್ಕಗಳು', 'nav.settings': 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
  'nav.supportIntake': 'ಸಪೋರ್ಟ್ ವಿನಂತಿಗಳು', 'nav.moneyRecovery': 'ಹಣ ವಸೂಲಾತಿ',
  'common.save': 'ಉಳಿಸಿ', 'common.cancel': 'ರದ್ದು', 'common.loading': 'ಲೋಡ್ ಆಗುತ್ತಿದೆ…',
  'common.all': 'ಎಲ್ಲಾ', 'common.new': 'ಹೊಸ', 'common.inProgress': 'ನಡೆಯುತ್ತಿದೆ', 'common.done': 'ಮುಗಿದಿದೆ',
  'support.title': 'ಸಪೋರ್ಟ್ ವಿನಂತಿಗಳು',
  'support.subtitle': 'ಪ್ರತಿ ಕರೆ ಮತ್ತು WhatsApp ವಿನಂತಿ ಇಲ್ಲಿ ದಾಖಲಾಗುತ್ತದೆ',
  'support.tab.service': 'ಸರ್ವಿಸ್ / ದುರಸ್ತಿ', 'support.tab.other': 'ಇತರೆ', 'support.tab.settings': 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
  'support.addNew': 'ಹೊಸ ನಮೂದು', 'support.empty.title': 'ವಿನಂತಿಗಳಿಲ್ಲ',
  'support.empty.message': 'ಹೊಸ ಸರ್ವಿಸ್ ಅಥವಾ ದುರಸ್ತಿ ವಿನಂತಿಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ.',
  'support.callBack': 'ಮರಳಿ ಕರೆ', 'support.notConnected': 'ಕರೆ ಸಂಪರ್ಕವಾಗಿಲ್ಲ',
  'support.newRequests': 'ಹೊಸ ವಿನಂತಿಗಳು', 'support.callsNotConnected': 'ಕರೆಗಳು ಸಂಪರ್ಕವಾಗಿಲ್ಲ',
  'support.type.SERVICE': 'ಸರ್ವಿಸ್', 'support.type.REPAIR': 'ದುರಸ್ತಿ',
  'support.type.OTHER': 'ಇತರೆ', 'support.type.UNSURE': 'ಅಸ್ಪಷ್ಟ',
};

const bn: Dict = {
  'nav.dashboard': 'ড্যাশবোর্ড', 'nav.contacts': 'যোগাযোগ', 'nav.settings': 'সেটিংস',
  'nav.supportIntake': 'সাপোর্ট অনুরোধ', 'nav.moneyRecovery': 'টাকা আদায়',
  'common.save': 'সংরক্ষণ', 'common.cancel': 'বাতিল', 'common.loading': 'লোড হচ্ছে…',
  'common.all': 'সব', 'common.new': 'নতুন', 'common.inProgress': 'চলছে', 'common.done': 'সম্পন্ন',
  'support.title': 'সাপোর্ট অনুরোধ',
  'support.subtitle': 'প্রতিটি কল এবং WhatsApp অনুরোধ এখানে নথিভুক্ত হয়',
  'support.tab.service': 'সার্ভিস / মেরামত', 'support.tab.other': 'অন্যান্য', 'support.tab.settings': 'সেটিংস',
  'support.addNew': 'নতুন এন্ট্রি', 'support.empty.title': 'কোনো অনুরোধ নেই',
  'support.empty.message': 'নতুন সার্ভিস বা মেরামতের অনুরোধ এখানে দেখা যাবে.',
  'support.callBack': 'ফিরতি কল', 'support.notConnected': 'কল সংযুক্ত হয়নি',
  'support.newRequests': 'নতুন অনুরোধ', 'support.callsNotConnected': 'কল সংযুক্ত হয়নি',
  'support.type.SERVICE': 'সার্ভিস', 'support.type.REPAIR': 'মেরামত',
  'support.type.OTHER': 'অন্যান্য', 'support.type.UNSURE': 'অস্পষ্ট',
};

const DICTS: Record<Lang, Dict> = { en, mr, hi, gu, pa, ta, te, kn, bn };

/** Translate a key for an explicit language. Falls back English → key. */
export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[lang] ?? DICTS[DEFAULT_LANG];
  let out = dict[key] ?? DICTS[DEFAULT_LANG][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/**
 * Hook: returns a `t(key, vars?)` bound to the currently selected UI language.
 * Components re-render automatically when the header selector changes it.
 */
export function useT() {
  const uiLanguage = useAppStore((s) => s.uiLanguage);
  const lang = (uiLanguage ?? DEFAULT_LANG) as Lang;
  return (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

/** Current UI language code (for non-component code paths). */
export function useLang(): Lang {
  return (useAppStore((s) => s.uiLanguage) ?? DEFAULT_LANG) as Lang;
}
