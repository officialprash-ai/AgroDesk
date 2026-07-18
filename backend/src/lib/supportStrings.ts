/**
 * Support Intake — localized customer- and staff-facing copy.
 *
 * Every string a customer hears or reads follows the DEALER's configured
 * language (`dealers.language`), not a hardcoded default. AgroDesk is
 * Maharashtra-first but sells across India, so a Tamil dealer's farmer must
 * never receive Marathi.
 *
 * Language codes match lib/sarvam.ts LANG_MAP, so the same code drives both the
 * text reply and the TTS voice used to speak it.
 *
 * Scope rule (unchanged): the AI never quotes a price, a date, or a cost. The
 * only promise made is "our person will call you" — in the dealer's language.
 *
 * NOTE: these translations are a solid starting point but have not been
 * reviewed by native speakers. Worth a pass from your regional dealers before
 * onboarding outside Maharashtra.
 */

export type SupportLang = 'mr' | 'hi' | 'en' | 'gu' | 'pa' | 'ta' | 'te' | 'kn' | 'bn';

export interface SupportCopy {
  /** WhatsApp auto-reply after a request is logged. */
  ack: string;
  /** TRAI recording-consent announcement (spoken first, non-negotiable). */
  consent: string;
  /** Greeting when the caller matches a known Contact. `{name}` placeholder. */
  greetKnown: string;
  /** Greeting for an unknown caller — also asks for name + tractor. */
  greetUnknown: string;
  /** Read the captured note back. `{note}` placeholder. */
  confirm: string;
  /** Said just before bridging the call to staff. */
  bridging: string;
  /** Closing when no transfer happens (after hours / no target / demo). */
  closingNoTransfer: string;
  /** Staff didn't pick up. */
  staffUnavailable: string;
  thanks: string;
  /** Placeholder note when only media arrived. */
  photoOnly: string;
  /** Placeholder note when a call produced no transcript. */
  voiceNoText: string;
  /** Staff alert labels. */
  newRequest: string;
  customer: string;
  phone: string;
  details: string;
  view: string;
  /** Bucket labels shown to staff. */
  types: { SERVICE: string; REPAIR: string; OTHER: string; UNSURE: string };
}

const COPY: Record<SupportLang, SupportCopy> = {
  en: {
    ack: 'Noted. Our team member will call you.',
    consent: 'This call is being recorded for service quality. ',
    greetKnown: 'Hello {name}. How can we help? Please tell us.',
    greetUnknown: 'Hello. Please tell us your name, your tractor, and what you need.',
    confirm: '{note}, is that correct? ',
    bridging: 'Connecting you now, one moment.',
    closingNoTransfer: 'Noted. Our team member will call you. Thank you.',
    staffUnavailable: 'Sorry, our team member is not available right now. They will call you shortly.',
    thanks: 'Thank you.',
    photoOnly: '(photo only)',
    voiceNoText: '(voice call — no transcript available)',
    newRequest: 'New request',
    customer: 'Customer',
    phone: 'Phone',
    details: 'Details',
    view: 'View',
    types: { SERVICE: 'Service', REPAIR: 'Repair', OTHER: 'Other', UNSURE: 'Unclear' },
  },

  mr: {
    ack: 'नोंद झाली. आमचा माणूस फोन करेल.',
    consent: 'ही कॉल सेवेच्या दर्जासाठी रेकॉर्ड केली जात आहे. ',
    greetKnown: 'नमस्कार {name}. काय काम होतं? कृपया सांगा.',
    greetUnknown: 'नमस्कार. तुमचं नाव, ट्रॅक्टर आणि काय काम आहे ते कृपया सांगा.',
    confirm: '{note}, बरोबर? ',
    bridging: 'जोडून देतो, एक मिनिट.',
    closingNoTransfer: 'नोंद झाली. आमचा माणूस तुम्हाला फोन करेल. धन्यवाद.',
    staffUnavailable: 'माफ करा, आमचा माणूस आत्ता उपलब्ध नाही. तो तुम्हाला लवकरच फोन करेल.',
    thanks: 'धन्यवाद.',
    photoOnly: '(फक्त फोटो पाठवला)',
    voiceNoText: '(व्हॉइस कॉल — मजकूर उपलब्ध नाही)',
    newRequest: 'नवीन विनंती',
    customer: 'ग्राहक',
    phone: 'फोन',
    details: 'तपशील',
    view: 'पहा',
    types: { SERVICE: 'सर्विस', REPAIR: 'दुरुस्ती', OTHER: 'इतर काम', UNSURE: 'अनिश्चित' },
  },

  hi: {
    ack: 'दर्ज हो गया. हमारा आदमी फोन करेगा.',
    consent: 'यह कॉल सेवा गुणवत्ता के लिए रिकॉर्ड की जा रही है. ',
    greetKnown: 'नमस्ते {name}. क्या काम था? कृपया बताइए.',
    greetUnknown: 'नमस्ते. कृपया अपना नाम, ट्रैक्टर और काम बताइए.',
    confirm: '{note}, सही है? ',
    bridging: 'जोड़ रहे हैं, एक मिनट.',
    closingNoTransfer: 'दर्ज हो गया. हमारा आदमी आपको फोन करेगा. धन्यवाद.',
    staffUnavailable: 'माफ कीजिए, हमारा आदमी अभी उपलब्ध नहीं है. वह जल्दी ही आपको फोन करेगा.',
    thanks: 'धन्यवाद.',
    photoOnly: '(सिर्फ फोटो भेजी)',
    voiceNoText: '(वॉइस कॉल — टेक्स्ट उपलब्ध नहीं)',
    newRequest: 'नया अनुरोध',
    customer: 'ग्राहक',
    phone: 'फोन',
    details: 'विवरण',
    view: 'देखें',
    types: { SERVICE: 'सर्विस', REPAIR: 'मरम्मत', OTHER: 'अन्य', UNSURE: 'अस्पष्ट' },
  },

  gu: {
    ack: 'નોંધ થઈ ગઈ. અમારો માણસ ફોન કરશે.',
    consent: 'આ કૉલ સેવાની ગુણવત્તા માટે રેકોર્ડ થઈ રહ્યો છે. ',
    greetKnown: 'નમસ્તે {name}. શું કામ હતું? કૃપા કરીને જણાવો.',
    greetUnknown: 'નમસ્તે. કૃપા કરીને તમારું નામ, ટ્રેક્ટર અને કામ જણાવો.',
    confirm: '{note}, બરાબર? ',
    bridging: 'જોડી આપું છું, એક મિનિટ.',
    closingNoTransfer: 'નોંધ થઈ ગઈ. અમારો માણસ તમને ફોન કરશે. આભાર.',
    staffUnavailable: 'માફ કરશો, અમારો માણસ અત્યારે ઉપલબ્ધ નથી. તે તમને જલદી ફોન કરશે.',
    thanks: 'આભાર.',
    photoOnly: '(ફક્ત ફોટો મોકલ્યો)',
    voiceNoText: '(વૉઇસ કૉલ — લખાણ ઉપલબ્ધ નથી)',
    newRequest: 'નવી વિનંતી',
    customer: 'ગ્રાહક',
    phone: 'ફોન',
    details: 'વિગત',
    view: 'જુઓ',
    types: { SERVICE: 'સર્વિસ', REPAIR: 'સમારકામ', OTHER: 'અન્ય', UNSURE: 'અસ્પષ્ટ' },
  },

  pa: {
    ack: 'ਦਰਜ ਹੋ ਗਿਆ. ਸਾਡਾ ਬੰਦਾ ਫ਼ੋਨ ਕਰੇਗਾ.',
    consent: 'ਇਹ ਕਾਲ ਸੇਵਾ ਦੀ ਗੁਣਵੱਤਾ ਲਈ ਰਿਕਾਰਡ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ. ',
    greetKnown: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ {name}. ਕੀ ਕੰਮ ਸੀ? ਕਿਰਪਾ ਕਰਕੇ ਦੱਸੋ.',
    greetUnknown: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ. ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਨਾਮ, ਟਰੈਕਟਰ ਅਤੇ ਕੰਮ ਦੱਸੋ.',
    confirm: '{note}, ਠੀਕ ਹੈ? ',
    bridging: 'ਜੋੜ ਰਹੇ ਹਾਂ, ਇੱਕ ਮਿੰਟ.',
    closingNoTransfer: 'ਦਰਜ ਹੋ ਗਿਆ. ਸਾਡਾ ਬੰਦਾ ਤੁਹਾਨੂੰ ਫ਼ੋਨ ਕਰੇਗਾ. ਧੰਨਵਾਦ.',
    staffUnavailable: 'ਮਾਫ਼ ਕਰਨਾ, ਸਾਡਾ ਬੰਦਾ ਹੁਣ ਉਪਲਬਧ ਨਹੀਂ ਹੈ. ਉਹ ਤੁਹਾਨੂੰ ਜਲਦੀ ਫ਼ੋਨ ਕਰੇਗਾ.',
    thanks: 'ਧੰਨਵਾਦ.',
    photoOnly: '(ਸਿਰਫ਼ ਫ਼ੋਟੋ ਭੇਜੀ)',
    voiceNoText: '(ਵੌਇਸ ਕਾਲ — ਲਿਖਤ ਉਪਲਬਧ ਨਹੀਂ)',
    newRequest: 'ਨਵੀਂ ਬੇਨਤੀ',
    customer: 'ਗਾਹਕ',
    phone: 'ਫ਼ੋਨ',
    details: 'ਵੇਰਵਾ',
    view: 'ਵੇਖੋ',
    types: { SERVICE: 'ਸਰਵਿਸ', REPAIR: 'ਮੁਰੰਮਤ', OTHER: 'ਹੋਰ', UNSURE: 'ਅਸਪਸ਼ਟ' },
  },

  ta: {
    ack: 'பதிவு செய்யப்பட்டது. எங்கள் ஆள் அழைப்பார்.',
    consent: 'இந்த அழைப்பு சேவைத் தரத்திற்காக பதிவு செய்யப்படுகிறது. ',
    greetKnown: 'வணக்கம் {name}. என்ன வேலை? தயவுசெய்து சொல்லுங்கள்.',
    greetUnknown: 'வணக்கம். உங்கள் பெயர், டிராக்டர் மற்றும் என்ன வேலை என்று சொல்லுங்கள்.',
    confirm: '{note}, சரியா? ',
    bridging: 'இணைக்கிறேன், ஒரு நிமிடம்.',
    closingNoTransfer: 'பதிவு செய்யப்பட்டது. எங்கள் ஆள் உங்களை அழைப்பார். நன்றி.',
    staffUnavailable: 'மன்னிக்கவும், எங்கள் ஆள் இப்போது கிடைக்கவில்லை. விரைவில் அழைப்பார்.',
    thanks: 'நன்றி.',
    photoOnly: '(புகைப்படம் மட்டும்)',
    voiceNoText: '(குரல் அழைப்பு — உரை கிடைக்கவில்லை)',
    newRequest: 'புதிய கோரிக்கை',
    customer: 'வாடிக்கையாளர்',
    phone: 'தொலைபேசி',
    details: 'விவரம்',
    view: 'பார்க்க',
    types: { SERVICE: 'சர்வீஸ்', REPAIR: 'பழுதுபார்ப்பு', OTHER: 'மற்றவை', UNSURE: 'தெளிவில்லை' },
  },

  te: {
    ack: 'నమోదైంది. మా వ్యక్తి ఫోన్ చేస్తారు.',
    consent: 'సేవా నాణ్యత కోసం ఈ కాల్ రికార్డ్ చేయబడుతోంది. ',
    greetKnown: 'నమస్కారం {name}. ఏమి పని? దయచేసి చెప్పండి.',
    greetUnknown: 'నమస్కారం. దయచేసి మీ పేరు, ట్రాక్టర్ మరియు పని చెప్పండి.',
    confirm: '{note}, సరియేనా? ',
    bridging: 'కలుపుతున్నాను, ఒక నిమిషం.',
    closingNoTransfer: 'నమోదైంది. మా వ్యక్తి మీకు ఫోన్ చేస్తారు. ధన్యవాదాలు.',
    staffUnavailable: 'క్షమించండి, మా వ్యక్తి ప్రస్తుతం అందుబాటులో లేరు. త్వరలో ఫోన్ చేస్తారు.',
    thanks: 'ధన్యవాదాలు.',
    photoOnly: '(ఫోటో మాత్రమే)',
    voiceNoText: '(వాయిస్ కాల్ — టెక్స్ట్ అందుబాటులో లేదు)',
    newRequest: 'కొత్త అభ్యర్థన',
    customer: 'కస్టమర్',
    phone: 'ఫోన్',
    details: 'వివరాలు',
    view: 'చూడండి',
    types: { SERVICE: 'సర్వీస్', REPAIR: 'మరమ్మతు', OTHER: 'ఇతర', UNSURE: 'అస్పష్టం' },
  },

  kn: {
    ack: 'ದಾಖಲಾಗಿದೆ. ನಮ್ಮ ವ್ಯಕ್ತಿ ಕರೆ ಮಾಡುತ್ತಾರೆ.',
    consent: 'ಸೇವಾ ಗುಣಮಟ್ಟಕ್ಕಾಗಿ ಈ ಕರೆಯನ್ನು ರೆಕಾರ್ಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ. ',
    greetKnown: 'ನಮಸ್ಕಾರ {name}. ಏನು ಕೆಲಸ? ದಯವಿಟ್ಟು ಹೇಳಿ.',
    greetUnknown: 'ನಮಸ್ಕಾರ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರು, ಟ್ರಾಕ್ಟರ್ ಮತ್ತು ಕೆಲಸ ಹೇಳಿ.',
    confirm: '{note}, ಸರಿಯೇ? ',
    bridging: 'ಸಂಪರ್ಕಿಸುತ್ತಿದ್ದೇನೆ, ಒಂದು ನಿಮಿಷ.',
    closingNoTransfer: 'ದಾಖಲಾಗಿದೆ. ನಮ್ಮ ವ್ಯಕ್ತಿ ನಿಮಗೆ ಕರೆ ಮಾಡುತ್ತಾರೆ. ಧನ್ಯವಾದ.',
    staffUnavailable: 'ಕ್ಷಮಿಸಿ, ನಮ್ಮ ವ್ಯಕ್ತಿ ಈಗ ಲಭ್ಯವಿಲ್ಲ. ಶೀಘ್ರದಲ್ಲೇ ಕರೆ ಮಾಡುತ್ತಾರೆ.',
    thanks: 'ಧನ್ಯವಾದ.',
    photoOnly: '(ಫೋಟೋ ಮಾತ್ರ)',
    voiceNoText: '(ಧ್ವನಿ ಕರೆ — ಪಠ್ಯ ಲಭ್ಯವಿಲ್ಲ)',
    newRequest: 'ಹೊಸ ವಿನಂತಿ',
    customer: 'ಗ್ರಾಹಕ',
    phone: 'ಫೋನ್',
    details: 'ವಿವರ',
    view: 'ನೋಡಿ',
    types: { SERVICE: 'ಸರ್ವಿಸ್', REPAIR: 'ದುರಸ್ತಿ', OTHER: 'ಇತರೆ', UNSURE: 'ಅಸ್ಪಷ್ಟ' },
  },

  bn: {
    ack: 'নথিভুক্ত হয়েছে. আমাদের লোক ফোন করবে.',
    consent: 'সেবার মান উন্নয়নের জন্য এই কলটি রেকর্ড করা হচ্ছে. ',
    greetKnown: 'নমস্কার {name}. কী কাজ ছিল? অনুগ্রহ করে বলুন.',
    greetUnknown: 'নমস্কার. অনুগ্রহ করে আপনার নাম, ট্রাক্টর এবং কাজ বলুন.',
    confirm: '{note}, ঠিক আছে? ',
    bridging: 'সংযোগ করছি, এক মিনিট.',
    closingNoTransfer: 'নথিভুক্ত হয়েছে. আমাদের লোক আপনাকে ফোন করবে. ধন্যবাদ.',
    staffUnavailable: 'দুঃখিত, আমাদের লোক এখন উপলব্ধ নেই. শীঘ্রই ফোন করবেন.',
    thanks: 'ধন্যবাদ.',
    photoOnly: '(শুধু ছবি পাঠানো হয়েছে)',
    voiceNoText: '(ভয়েস কল — টেক্সট উপলব্ধ নেই)',
    newRequest: 'নতুন অনুরোধ',
    customer: 'গ্রাহক',
    phone: 'ফোন',
    details: 'বিবরণ',
    view: 'দেখুন',
    types: { SERVICE: 'সার্ভিস', REPAIR: 'মেরামত', OTHER: 'অন্যান্য', UNSURE: 'অস্পষ্ট' },
  },
};

/** Resolve copy for a dealer's language, falling back to Marathi then English. */
export function supportCopy(language?: string | null): SupportCopy {
  const key = (language ?? '').toLowerCase() as SupportLang;
  return COPY[key] ?? COPY.mr ?? COPY.en;
}

/** Substitute {placeholders}. */
export function fill(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), template);
}
