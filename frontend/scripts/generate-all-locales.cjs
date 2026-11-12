const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');
const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf-8'));

// Helper to translate deep objects with a language dictionary map
function translateTree(tree, dict) {
  if (typeof tree === 'string') {
    return dict[tree] || tree;
  }
  if (Array.isArray(tree)) {
    return tree.map(item => translateTree(item, dict));
  }
  const result = {};
  for (const k of Object.keys(tree)) {
    result[k] = translateTree(tree[k], dict);
  }
  return result;
}

// 1. Hindi (hi)
const hi = {
  ...translateTree(en, {}),
  app_name: 'पैसे बचाओ',
  tagline: 'पैसे ट्रैक करो, बचत बढ़ाओ',
  nav: { home: 'होम', activity: 'गतिविधि', add: 'जोड़ें', split: 'स्प्लिट', hub: 'हब', profile: 'प्रोफ़ाइल' },
  auth: {
    login: 'लॉग इन करें', register: 'खाता बनाएं', forgot_password: 'पासवर्ड भूल गए?', reset_password: 'पासवर्ड रीसेट करें',
    email: 'ईमेल पता', password: 'पासवर्ड', new_password: 'नया पासवर्ड', current_password: 'मौजूदा पासवर्ड',
    confirm_password: 'पासवर्ड की पुष्टि करें', name: 'आपका नाम', login_btn: 'लॉग इन', register_btn: 'नया खाता बनाएं',
    send_reset_link: 'रीसेट लिंक भेजें', reset_btn: 'नया पासवर्ड सेट करें', back_to_login: 'लॉग इन पर वापस जाएं',
    show_password: 'पासवर्ड दिखाएं', hide_password: 'पासवर्ड छुपाएं', no_account: 'खाता नहीं है?',
    have_account: 'पहले से खाता है?', logout: 'लॉग आउट', error_invalid: 'अमान्य ईमेल या पासवर्ड',
    error_exists: 'इस ईमेल से पहले से खाता मौजूद है', error_short_password: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए'
  },
  onboarding: {
    title: 'आइए आपका ट्रैकर सेटअप करें', step1_title: 'आपके बारे में', step2_title: 'आपकी पॉकेट मनी', step3_title: 'प्राथमिकताएं',
    monthly_income: 'मासिक पॉकेट मनी / आय', income_frequency: 'यह कितनी बार मिलती है?', income_source: 'पैसे कहां से आते हैं?',
    income_sources: { parents: 'माता-पिता', part_time_job: 'पार्ट-टाइम जॉब', scholarship: 'स्कॉलरशिप', freelance: 'फ्रीलांस', other: 'अन्य' },
    savings_goal: 'मासिक बचत लक्ष्य', currency: 'मुद्रा', language: 'भाषा', next: 'आगे बढ़ें', finish: 'ट्रैकिंग शुरू करें!', skip: 'अभी छोड़ें'
  },
  home: {
    greeting: 'नमस्ते, {{name}}! 👋', money_left: 'इस महीने बाकी पैसे', safe_per_day: '₹{{amount}} प्रतिदिन खर्च करना सुरक्षित',
    today: 'आज', this_week: 'इस सप्ताह', this_month: 'इस महीने', recent: 'हाल के खर्चे', see_all: 'सभी देखें',
    no_expenses: 'अभी तक कोई खर्च नहीं', no_expenses_desc: '+ बटन दबाकर पहला खर्च दर्ज करें!',
    pending_questions: '{{count}} सवाल बाकी', pending_questions_plural: '{{count}} सवाल बाकी', days_left: '{{count}} दिन शेष',
    quick_actions: 'त्वरित खर्चे', streak: 'दिनों की स्ट्रीक'
  },
  pulse: {
    title: 'मनी पल्स', subtitle: 'दैनिक खर्च की गति और सुरक्षित सीमा', safe_zone: 'सुरक्षित क्षेत्र', daily_safe: 'दैनिक सुरक्षित सीमा',
    overspent: 'ज्यादा खर्च का दिन', on_track: 'सही दिशा में', chai_tax: 'चाय और स्नैक टैक्स', chai_tax_desc: 'इस महीने ₹100 से कम के कुल खर्चे',
    projection: 'बचत अनुमान', goal_arrival: 'इस गति से आप {{date}} तक लक्ष्य पूरा कर लेंगे', day_detail: 'दिन का विवरण'
  },
  expense: {
    add_title: 'खर्च दर्ज करें', amount: 'राशि', amount_placeholder: '0', category: 'श्रेणी', payment_method: 'भुगतान का तरीका',
    note: 'नोट (वैकल्पिक)', note_placeholder: 'यह खर्च किसलिए था?', merchant: 'दुकानदार / स्थान', merchant_placeholder: 'टपरी, स्विगी, मेट्रो...',
    date: 'तारीख', tag: 'प्रकार', need: 'ज़रूरत (अनिवार्य)', want: 'शौक (ट्रीट)', savings: 'बचत', save: 'खर्च सहेजें',
    saved: 'खर्च सहेजा गया!', edit: 'खर्च संपादित करें', delete: 'हटाएं', delete_confirm: 'क्या यह खर्च हटाना चाहते हैं?',
    quick_add: 'अक्सर होने वाले खर्चे',
    categories: {
      food: 'खाना और भोजन', snacks_cafe: 'चाय और नाश्ता', travel: 'यात्रा और मेट्रो', shopping: 'खरीदारी',
      education: 'कॉलेज और किताबें', entertainment: 'घूमना और मस्ती', recharge_bills: 'रिचार्ज और बिल',
      health: 'स्वास्थ्य और दवाएं', friends_outings: 'दोस्तों के साथ पार्टी', subscriptions: 'सब्सक्रिप्शन',
      savings: 'बचत लक्ष्य', other: 'अन्य'
    },
    payment_methods: { upi: 'UPI / GPay / Paytm', cash: 'नकद', card: 'डेबिट / क्रेडिट कार्ड', wallet: 'वॉलेट' }
  },
  transactions: { title: 'गतिविधि', search: 'दुकानदार या नोट से खोजें', filter: 'फ़िल्टर', all: 'सभी', no_results: 'कोई खर्च नहीं मिला', no_results_desc: 'खोज शब्द बदल कर देखें', load_more: 'और देखें' },
  insights: { title: 'इनसाइट्स', by_category: 'श्रेणी अनुसार', trend: 'दैनिक पल्स', need_want: 'ज़रूरत बनाम शौक', top_merchants: 'शीर्ष स्थान', income_expense: 'आय बनाम व्यय', safe_zone_chart: 'दैनिक सुरक्षित क्षेत्र', this_month: 'इस महीने', last_month: 'पिछले महीने', custom: 'कस्टम अवधि', no_data: 'पर्याप्त डेटा नहीं', no_data_desc: 'अपनी बेसलाइन अनलॉक करने के लिए 14 दिन तक खर्च दर्ज करें', baseline_note: 'पिछले 4 हफ्तों का रोलिंग औसत' },
  splits: { title: 'बिल बांटें', new_group: 'नया ग्रुप', add_expense: 'बिल जोड़ें', group_name: 'ग्रुप का नाम', payer: 'किसने भुगतान किया?', amount: 'कुल बिल', split_type: 'बांटने का तरीका', equal: 'बराबर', exact: 'निश्चित राशि', percent: 'प्रतिशत', settle_up: 'हिसाब चुकता करें', pay_via_upi: 'UPI से भुगतान करें', no_splits: 'कोई ग्रुप स्प्लिट नहीं', no_splits_desc: 'हॉस्टल या ट्रिप का ग्रुप बनाकर बिल बांटना शुरू करें!' },
  hub: { title: 'कैंपस हब', subtitle: 'टूल्स, गुल्लक, स्ट्रीक और रिपोर्ट', jars: 'गोल जार (गुल्लक)', subscriptions: 'सब्सक्रिप्शन कैलेंडर', challenges: 'नो-स्पेंड चैलेंज', wrapped: 'साप्ताहिक रैप्ड', report_card: 'महीने का रिपोर्ट कार्ड', receipts: 'रसीद फ़ोल्डर', what_if: 'व्हाट-इफ़ कैलकुलेटर', themes: 'जेन-ज़ी थीम्स', language: 'भाषा', settings: 'सेटिंग्स और सुरक्षा', privacy: 'गोपनीयता और डेटा सुरक्षा' },
  jars: { title: 'गोल जार', subtitle: 'सपनों के लिए डिजिटल गुल्लक', new_jar: 'नया जार', target: 'लक्ष्य राशि', saved: 'अब तक की बचत', round_up: 'राउंड-अप खर्चे', round_up_desc: 'खर्चों को ₹10 तक राउंड अप करें और चिल्लर बचाएं', deposit: 'पैसे जोड़ें' },
  subs: { title: 'सब्सक्रिप्शन', subtitle: 'OTT, जिम और ऐप्स के रिन्यूअल ट्रैक करें', new_sub: 'सब्सक्रिप्शन जोड़ें', renewal_alert: '{{days}} दिनों में रिन्यूअल', billing_cycle: 'साइकिल', active: 'सक्रिय', paused: 'रुका हुआ' },
  wrapped: { title: 'साप्ताहिक रैप्ड', subtitle: 'इस हफ्ते आपकी पैसों की कहानी', view_recap: 'कहानी देखें', top_category: 'सबसे बड़ा खर्च', total_spent: 'कुल खर्च', safe_days: 'सुरक्षित दिन', mood_score: 'मनी मूड' },
  what_if: { title: 'व्हाट-इफ़ कैलकुलेटर', subtitle: 'छोटी आदतें बदलने से कैसे बड़ी बचत होती है', category: 'कम करने की श्रेणी', cut_percent: 'खर्च में कमी', yearly_savings: 'सालाना बचत प्रभाव' },
  budget: { title: 'बजट', add: 'बजट सेट करें', overall: 'मासिक सीमा', category_budget: 'श्रेणी सीमा', amount: 'बजट सीमा', period: 'अवधि', monthly: 'मासिक', weekly: 'साप्ताहिक', spent: '₹{{total}} में से ₹{{spent}} खर्च', remaining: '₹{{amount}} शेष', exceeded: 'बजट से ₹{{amount}} अधिक!', alert_50: '50% खर्च हो गया', alert_80: '80% खर्च — संभल कर चलें!', alert_100: 'बजट पार हो गया!', no_budgets: 'कोई सीमा तय नहीं', no_budgets_desc: 'पैसे सुरक्षित रखने के लिए बजट सीमाएं तय करें' },
  savings: { title: 'बचत लक्ष्य', add: 'नया लक्ष्य', name: 'आप किसलिए बचत कर रहे हैं?', target: 'लक्ष्य राशि', deadline: 'लक्ष्य की तारीख', contribute: 'लक्ष्य में जोड़ें', weekly_needed: 'समय पर पूरा करने के लिए ₹{{amount}}/सप्ताह बचाएं', progress: '{{percent}}% पूरा हुआ', no_goals: 'कोई बचत लक्ष्य नहीं', no_goals_desc: 'नया लक्ष्य तय करें (हेडफोन, ट्रिप, स्नीकर्स) और बचत शुरू करें!' },
  questions: { title: 'स्मार्ट सवाल', subtitle: '1 टैप में हाल के खर्च वर्गीकृत करें', no_questions: 'सब कुछ पूरा हो गया! 🎉', no_questions_desc: 'अभी कोई लंबित सवाल नहीं हैं' },
  advisor: { title: 'AI मनी एडवाइजर', placeholder: 'अपने खर्च, सुरक्षित सीमा के बारे में पूछें...', send: 'पूछें', disclaimer: 'केवल आपके डेटा पर आधारित सामान्य मार्गदर्शन, वित्तीय सलाह नहीं।', suggestions: ['मेरी पॉकेट मनी कहां गई?', 'क्या मैं अभी ₹800 खर्च कर सकता हूं?', 'ट्रिप के लिए बचत कैसे करें?', 'क्या मैं खाने पर ज्यादा खर्च कर रहा हूं?'] },
  profile: { title: 'मेरी प्रोफ़ाइल', edit: 'प्रोफ़ाइल संपादित करें', name: 'नाम', avatar: 'अवतार', pocket_money: 'पॉकेट मनी', frequency: 'आवृत्ति', arrival_day: 'आने का दिन', savings_goal: 'बचत लक्ष्य', theme: 'थीम', language: 'भाषा', currency: 'मुद्रा', change_email: 'ईमेल बदलें', current_password: 'मौजूदा पासवर्ड', new_email: 'नया ईमेल पता', export_csv: 'मेरा डेटा डाउनलोड करें (CSV)', delete_account: 'मेरा खाता और सारा डेटा हटाएं', delete_confirm_text: 'सभी डेटा स्थायी रूप से मिटाने के लिए DELETE टाइप करें', version: 'वर्जन 2.0 (जेन-ज़ी एडिशन)' },
  common: { save: 'सहेजें', cancel: 'रद्द करें', delete: 'हटाएं', edit: 'संपादित करें', loading: 'लोड हो रहा है...', error: 'कुछ गड़बड़ हुई', retry: 'पुनः प्रयास करें', no_data: 'यहाँ अभी कुछ नहीं है', today: 'आज', yesterday: 'कल', back: 'वापस', success: 'सफलतापूर्वक सहेजा गया', saved: 'सहेजा गया' },
  privacy: { title: 'गोपनीयता और डेटा सुरक्षा', intro: 'पैसे बचाओ पूर्ण डेटा गोपनीयता की गारंटी देता है:', points: ['केवल आपका अपना डेटा लोड होता है। सख्त SQL यूजर आइसोलेशन।', 'कोई साझा मॉडल नहीं, कोई क्रॉस-यूजर ट्रेनिंग नहीं।', 'कोई विज्ञापन नहीं, कोई डेटा बिक्री नहीं।', 'बैंक और SMS इम्पोर्ट 100% आपकी डिवाइस पर चलते हैं।', 'किसी भी समय अपना डेटा डाउनलोड या हमेशा के लिए डिलीट करें।'] }
};

// 2. Hinglish (hinglish)
const hinglish = {
  ...hi,
  app_name: 'Paise Bachao',
  tagline: 'Paise track karo, savings badhao',
  nav: { home: 'Home', activity: 'Activity', add: 'Add', split: 'Split', hub: 'Hub', profile: 'Profile' },
  auth: {
    login: 'Sign In karo', register: 'Account Banao', forgot_password: 'Password bhool gaye?', reset_password: 'Password Reset Karo',
    email: 'Email address', password: 'Password', new_password: 'Naya Password', current_password: 'Purana Password',
    confirm_password: 'Confirm Password', name: 'Aapka Naam', login_btn: 'Sign In', register_btn: 'Account Banao',
    send_reset_link: 'Reset Link Bhejo', reset_btn: 'Naya Password Set Karo', back_to_login: 'Sign In par wapas jao',
    show_password: 'Password dikhao', hide_password: 'Password chupao', no_account: 'Account nahi hai?',
    have_account: 'Pehle se account hai?', logout: 'Sign Out', error_invalid: 'Galat email ya password',
    error_exists: 'Is email par pehle se account hai', error_short_password: 'Password kam se kam 6 characters ka hona chahiye'
  },
  home: {
    greeting: 'Arre, {{name}}! 👋', money_left: 'Is mahine bache paise', safe_per_day: '₹{{amount}} daily safe to spend',
    today: 'Aaj', this_week: 'Is hafte', this_month: 'Is mahine', recent: 'Recent spends', see_all: 'Sab dekho',
    no_expenses: 'Aaj abhi tak koi kharcha nahi', no_expenses_desc: '+ button dabao aur pehla kharcha log karo!',
    pending_questions: '{{count}} pending sawaal', pending_questions_plural: '{{count}} pending sawaal', days_left: '{{count}} din bache hain',
    quick_actions: 'Quick Spends', streak: 'Day Streak'
  },
  pulse: {
    title: 'Money Pulse', subtitle: 'Roz ka kharch aur safe zone pace', safe_zone: 'Safe Zone', daily_safe: 'Daily Safe Limit',
    overspent: 'Zyada Kharcha Hua', on_track: 'Bilkul Track Par', chai_tax: 'Chai & Samosa Tax', chai_tax_desc: 'Is mahine ₹100 se kam ke total kharche',
    projection: 'Savings Projection', goal_arrival: 'Is pace se {{date}} tak goal pura ho jayega', day_detail: 'Day Breakdown'
  },
  expense: {
    ...hi.expense,
    add_title: 'Kharcha Log Karo', need: 'Need (Zaroori)', want: 'Want (Treat / Moj)', savings: 'Bachat', save: 'Save Karo',
    saved: 'Kharcha save ho gaya!', edit: 'Edit Karo', delete: 'Delete Karo', delete_confirm: 'Kya yeh spend entry delete karni hai?'
  },
  hub: {
    ...hi.hub,
    title: 'Campus Hub', subtitle: 'Tools, Jars, Streaks aur Reports'
  },
  profile: {
    ...hi.profile,
    title: 'Mera Profile', edit: 'Edit Profile', export_csv: 'Mera Data Download Karo (CSV)',
    delete_account: 'Mera Account & Saara Data Delete Karo', delete_confirm_text: 'Permanently delete karne ke liye DELETE type karo'
  }
};

// 3. Punjabi (pa)
const pa = {
  ...hi,
  app_name: 'ਪੈਸੇ ਬਚਾਓ',
  tagline: 'ਪੈਸੇ ਟ੍ਰੈਕ ਕਰੋ, ਬੱਚਤ ਵਧਾਓ',
  nav: { home: 'ਹੋਮ', activity: 'ਗਤੀਵਿਧੀ', add: 'ਜੋੜੋ', split: 'ਵੰਡੋ', hub: 'ਹੱਬ', profile: 'ਪ੍ਰੋਫਾਈਲ' },
  auth: {
    ...hi.auth,
    login: 'ਲਾਗ ਇਨ ਕਰੋ', register: 'ਖਾਤਾ ਬਣਾਓ', forgot_password: 'ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ?', reset_password: 'ਪਾਸਵਰਡ ਰੀਸੈੱਟ ਕਰੋ',
    email: 'ਈਮੇਲ ਪਤਾ', password: 'ਪਾਸਵਰਡ', name: 'ਤੁਹਾਡਾ ਨਾਮ', login_btn: 'ਲਾਗ ਇਨ', register_btn: 'ਖਾਤਾ ਬਣਾਓ',
    logout: 'ਲਾਗ ਆਊਟ'
  },
  home: {
    ...hi.home,
    greeting: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, {{name}}! 👋', money_left: 'ਇਸ ਮਹੀਨੇ ਬਾਕੀ ਪੈਸੇ', safe_per_day: '₹{{amount}} ਰੋਜ਼ਾਨਾ ਖਰਚਣਾ ਸੁਰੱਖਿਅਤ',
    today: 'ਅੱਜ', this_week: 'ਇਸ ਹਫ਼ਤੇ', this_month: 'ਇਸ ਮਹੀਨੇ'
  }
};

// 4. Bengali (bn)
const bn = {
  ...hi,
  app_name: 'পয়সা বাঁচাও',
  tagline: 'খরচ ট্র্যাক করো, সঞ্চয় বাড়াও',
  nav: { home: 'হোম', activity: 'অ্যাক্টিভিটি', add: 'যোগ করো', split: 'স্প্লিট', hub: 'হাব', profile: 'প্রোফাইল' },
  auth: {
    ...hi.auth,
    login: 'সাইন ইন করো', register: 'অ্যাকাউন্ট তৈরি করো', forgot_password: 'পাসওয়ার্ড ভুলে গেছেন?',
    email: 'ইমেইল ঠিকানা', password: 'পাসওয়ার্ড', name: 'তোমার নাম', login_btn: 'সাইন ইন', register_btn: 'অ্যাকাউন্ট খোলো',
    logout: 'সাইন আউট'
  },
  home: {
    ...hi.home,
    greeting: 'নমস্কার, {{name}}! 👋', money_left: 'এই মাসে বাকি টাকা', safe_per_day: 'প্রতিদিন ₹{{amount}} খরচ নিরাপদ',
    today: 'আজ', this_week: 'এই সপ্তাহে', this_month: 'এই মাসে'
  }
};

// 5. Tamil (ta)
const ta = {
  ...hi,
  app_name: 'பைசா பச்சாவ்',
  tagline: 'பணத்தைக் கண்காணிக்கவும், சேமிப்பை வளர்க்கவும்',
  nav: { home: 'முகப்பு', activity: 'செயல்பாடு', add: 'சேர்', split: 'பிரி', hub: 'ஹப்', profile: 'சுயவிவரம்' },
  auth: {
    ...hi.auth,
    login: 'உள்நுழைக', register: 'கணக்கை உருவாக்கு', forgot_password: 'கடவுச்சொல்லை மறந்துவிட்டீர்களா?',
    email: 'மின்னஞ்சல்', password: 'கடவுச்சொல்', name: 'உங்கள் பெயர்', login_btn: 'உள்நுழைக', logout: 'வெளியேறு'
  },
  home: {
    ...hi.home,
    greeting: 'வணக்கம், {{name}}! 👋', money_left: 'இந்த மாதம் மீதமுள்ள பணம்', safe_per_day: 'ஒரு நாளைக்கு ₹{{amount}} செலவிடுவது பாதுகாப்பானது',
    today: 'இன்று', this_week: 'இந்த வாரம்', this_month: 'இந்த மாதம்'
  }
};

// 6. Telugu (te)
const te = {
  ...hi,
  app_name: 'పైసా బచావో',
  tagline: 'ఖర్చులను ట్రాక్ చేయండి, పొదుపు పెంచుకోండి',
  nav: { home: 'హోమ్', activity: 'యాక్టివిటీ', add: 'జోడించు', split: 'స్ప్లిట్', hub: 'హబ్', profile: 'ప్రొఫైల్' },
  auth: {
    ...hi.auth,
    login: 'లాగిన్ అవ్వండి', register: 'ఖాతా తెరవండి', forgot_password: 'పాస్‌వర్డ్ మర్చిపోయారా?',
    email: 'ఈమెయిల్', password: 'పాస్‌వర్డ్', name: 'మీ పేరు', login_btn: 'లాగిన్', logout: 'లాగౌట్'
  },
  home: {
    ...hi.home,
    greeting: 'నమస్కారం, {{name}}! 👋', money_left: 'ఈ నెల మిగిలిన డబ్బు', safe_per_day: 'రోజుకు ₹{{amount}} ఖర్చు చేయడం సురక్షితం',
    today: 'ఈరోజు', this_week: 'ఈ వారం', this_month: 'ఈ నెల'
  }
};

// 7. Marathi (mr)
const mr = {
  ...hi,
  app_name: 'पैसे वाचवा',
  tagline: 'खर्च ट्रॅक करा, बचत वाढवा',
  nav: { home: 'होम', activity: 'हालचाली', add: 'जोडा', split: 'वाटणी', hub: 'हब', profile: 'प्रोफाइल' },
  auth: {
    ...hi.auth,
    login: 'लॉग इन करा', register: 'खाते तयार करा', forgot_password: 'पासवर्ड विसरलात?',
    email: 'ईमेल', password: 'पासवर्ड', name: 'तुमचे नाव', login_btn: 'लॉग इन', logout: 'लॉग आउट'
  },
  home: {
    ...hi.home,
    greeting: 'नमस्कार, {{name}}! 👋', money_left: 'या महिन्यात शिल्लक पैसे', safe_per_day: 'दररोज ₹{{amount}} खर्च करणे सुरक्षित',
    today: 'आज', this_week: 'या आठवड्यात', this_month: 'या महिन्यात'
  }
};

// 8. Gujarati (gu)
const gu = {
  ...hi,
  app_name: 'પૈસા બચાવો',
  tagline: 'ખર્ચ ટ્રેક કરો, બચત વધારો',
  nav: { home: 'હોમ', activity: 'ગતિવિધિ', add: 'ઉમેરો', split: 'ભાગ પાડો', hub: 'હબ', profile: 'પ્રોફાઇલ' },
  auth: {
    ...hi.auth,
    login: 'લૉગ ઇન કરો', register: 'ખાતું બનાવો', forgot_password: 'પાસવર્ડ ભૂલી ગયા?',
    email: 'ઇમેઇલ', password: 'પાસવર્ડ', name: 'તમારું નામ', login_btn: 'લૉગ ઇન', logout: 'લૉગ આઉટ'
  },
  home: {
    ...hi.home,
    greeting: 'નમસ્તે, {{name}}! 👋', money_left: 'આ મહિને બાકી રકમ', safe_per_day: 'રોજ ₹{{amount}} ખર્ચ કરવો સલામત છે',
    today: 'આજે', this_week: 'આ અઠવાડિયે', this_month: 'આ મહિને'
  }
};

// 9. Kannada (kn)
const kn = {
  ...hi,
  app_name: 'ಹಣ ಉಳಿಸಿ',
  tagline: 'ಖರ್ಚು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ, ಉಳಿತಾಯ ಹೆಚ್ಚಿಸಿ',
  nav: { home: 'ಮುಖಪುಟ', activity: 'ಚಟುವಟಿಕೆ', add: 'ಸೇರಿಸಿ', split: 'ಹಂಚಿಕೊಳ್ಳಿ', hub: 'ಹಬ್', profile: 'ಪ್ರೊಫೈಲ್' },
  auth: {
    ...hi.auth,
    login: 'ಲಾಗಿನ್ ಮಾಡಿ', register: 'ಖಾತೆ ರಚಿಸಿ', forgot_password: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?',
    email: 'ಇಮೇಲ್', password: 'ಪಾಸ್‌ವರ್ಡ್', name: 'ನಿಮ್ಮ ಹೆಸರು', login_btn: 'ಲಾಗಿನ್', logout: 'ಲಾಗ್‌ಔಟ್'
  },
  home: {
    ...hi.home,
    greeting: 'ನಮಸ್ಕಾರ, {{name}}! 👋', money_left: 'ಈ ತಿಂಗಳು ಉಳಿದ ಹಣ', safe_per_day: 'ದಿನಕ್ಕೆ ₹{{amount}} ಖರ್ಚು ಮಾಡುವುದು ಸುರಕ್ಷಿತ',
    today: 'ಇಂದು', this_week: 'ಈ ವಾರ', this_month: 'ಈ ತಿಂಗಳು'
  }
};

// 10. Malayalam (ml)
const ml = {
  ...hi,
  app_name: 'പണം ലാഭിക്കൂ',
  tagline: 'ചെലവുകൾ ട്രാക്ക് ചെയ്യൂ, സമ്പാദ്യം വളർത്തൂ',
  nav: { home: 'ഹോം', activity: 'പ്രവർത്തനങ്ങൾ', add: 'ചേർക്കുക', split: 'പങ്കിടുക', hub: 'ഹബ്', profile: 'പ്രൊഫൈൽ' },
  auth: {
    ...hi.auth,
    login: 'ലോഗിൻ ചെയ്യുക', register: 'അക്കൗണ്ട് നിർമ്മിക്കുക', forgot_password: 'പാസ്‌വേഡ് മറന്നോ?',
    email: 'ഇമെയിൽ', password: 'പാസ്‌വേഡ്', name: 'നിങ്ങളുടെ പേര്', login_btn: 'ലോഗിൻ', logout: 'ലോഗൗട്ട്'
  },
  home: {
    ...hi.home,
    greeting: 'നമസ്കാരം, {{name}}! 👋', money_left: 'ഈ മാസം ബാക്കിയുള്ള പണം', safe_per_day: 'ഒരു ദിവസം ₹{{amount}} ചെലവഴിക്കുന്നത് സുരക്ഷിതമാണ്',
    today: 'ഇന്ന്', this_week: 'ഈ ആഴ്ച', this_month: 'ഈ മാസം'
  }
};

// 11. Urdu (ur) - with right-to-left layout
const ur = {
  ...hi,
  app_name: 'پیسے بچاؤ',
  tagline: 'پیسے ٹریک کریں، بچت بڑھائیں',
  nav: { home: 'ہوم', activity: 'سرگرمی', add: 'شامل کریں', split: 'تقسیم', hub: 'حب', profile: 'پروفائل' },
  auth: {
    ...hi.auth,
    login: 'سائن ان کریں', register: 'اکاؤنٹ بنائیں', forgot_password: 'پاس ورڈ بھول گئے؟',
    email: 'ای میل پتہ', password: 'پاس ورڈ', name: 'آپ کا نام', login_btn: 'سائن ان', logout: 'سائن آؤٹ'
  },
  home: {
    ...hi.home,
    greeting: 'السلام علیکم, {{name}}! 👋', money_left: 'اس ماہ باقی رقم', safe_per_day: 'روزانہ ₹{{amount}} خرچ کرنا محفوظ ہے',
    today: 'آج', this_week: 'اس ہفتے', this_month: 'اس ماہ'
  }
};

const allLocales = {
  hi,
  hinglish,
  pa,
  bn,
  ta,
  te,
  mr,
  gu,
  kn,
  ml,
  ur
};

for (const [code, data] of Object.entries(allLocales)) {
  fs.writeFileSync(path.join(localesDir, `${code}.json`), JSON.stringify(data, null, 2));
  console.log(`Saved ${code}.json`);
}
console.log('All 12 languages generated successfully.');
