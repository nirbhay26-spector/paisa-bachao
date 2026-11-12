const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');
const requiredLanguages = ['en', 'hi', 'hinglish', 'pa', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'ur'];

console.log('🔍 Checking all 12 language files...');

// 1. Check all required files exist
for (const lang of requiredLanguages) {
  const file = path.join(localesDir, `${lang}.json`);
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing locale file: ${lang}.json`);
    process.exit(1);
  }
}

// 2. Load English reference keys
const enData = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf-8'));

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enKeys = getKeys(enData);
console.log(`Total reference keys in en.json: ${enKeys.length}`);

let hasMissing = false;

for (const lang of requiredLanguages) {
  if (lang === 'en') continue;
  const langData = JSON.parse(fs.readFileSync(path.join(localesDir, `${lang}.json`), 'utf-8'));
  const langKeys = new Set(getKeys(langData));

  const missing = enKeys.filter(k => !langKeys.has(k));
  if (missing.length > 0) {
    console.error(`❌ Language ${lang} is missing ${missing.length} keys:`);
    console.error(missing.slice(0, 10));
    hasMissing = true;
  } else {
    console.log(`✅ ${lang} has all ${enKeys.length} keys`);
  }
}

if (hasMissing) {
  console.error('Translation key verification failed.');
  process.exit(1);
}

console.log('🎉 All 12 languages verified with 100% complete key coverage!');

