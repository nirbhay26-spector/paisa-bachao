// Indian bank SMS parser — extracts transaction data from common bank SMS formats
// Supports: SBI, HDFC, ICICI, Axis, Kotak, Paytm, PhonePe, GPay UPI

const SMS_PATTERNS = [
  // SBI
  {
    bank: 'SBI',
    pattern: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:debited|withdrawn)\s*(?:from\s*(?:A\/c|a\/c|account)\s*[Xx*]*(\d{4}))?.*?(?:to\s*(?:VPA\s*)?(.+?))?(?:\s*(?:UPI\s*Ref|Ref)\s*(?:No\.?)?\s*(\d+))?/i,
    type: 'debit'
  },
  {
    bank: 'SBI',
    pattern: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*credited\s*(?:to\s*(?:A\/c|a\/c)\s*[Xx*]*(\d{4}))?/i,
    type: 'credit'
  },
  // HDFC
  {
    bank: 'HDFC',
    pattern: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:has been|was)\s*debited\s*(?:from\s*(?:A\/c|a\/c)\s*[Xx*]*(\d{4}))?.*?(?:(?:to|at|Info:)\s*(.+?))?(?:\s*(?:UPI\s*Ref|Ref)\s*(?:No\.?)?\s*(\d+))?/i,
    type: 'debit'
  },
  {
    bank: 'HDFC',
    pattern: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:has been|was)\s*credited/i,
    type: 'credit'
  },
  // ICICI
  {
    bank: 'ICICI',
    pattern: /(?:Amt Debited|Debited):?\s*(?:INR|Rs\.?)\s*([\d,]+\.?\d*).*?(?:A\/c\s*[Xx*]*(\d{4}))?.*?(?:(?:Info|to|at):?\s*(.+?))?(?:\s*Ref\s*(?:No\.?)?\s*(\d+))?/i,
    type: 'debit'
  },
  {
    bank: 'ICICI',
    pattern: /(?:Amt Credited|Credited):?\s*(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i,
    type: 'credit'
  },
  // Axis
  {
    bank: 'Axis',
    pattern: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:debited|spent).*?(?:A\/c\s*[Xx*]*(\d{4}))?.*?(?:(?:at|to|Info)\s*(.+?))?(?:\s*Ref\s*(\d+))?/i,
    type: 'debit'
  },
  // Kotak
  {
    bank: 'Kotak',
    pattern: /(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:debited|spent).*?(?:A\/c\s*[Xx*]*(\d{4}))?.*?(?:(?:to|at)\s*(.+?))?/i,
    type: 'debit'
  },
  // UPI generic patterns
  {
    bank: 'UPI',
    pattern: /(?:paid|sent)\s*(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:to\s*(.+?))?(?:\s*(?:UPI|Ref)\s*(?:No\.?)?\s*(\d+))?/i,
    type: 'debit'
  },
  {
    bank: 'UPI',
    pattern: /(?:received|got)\s*(?:Rs\.?|INR)\s*([\d,]+\.?\d*)\s*(?:from\s*(.+?))?/i,
    type: 'credit'
  },
  // Paytm
  {
    bank: 'Paytm',
    pattern: /(?:Paid|Debited)\s*(?:Rs\.?)\s*([\d,]+\.?\d*)\s*(?:to\s*(.+?))?(?:\s*(?:from|on)\s*Paytm)?/i,
    type: 'debit'
  },
  // PhonePe
  {
    bank: 'PhonePe',
    pattern: /(?:Paid|Sent)\s*(?:Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:to\s*(.+?))?(?:\s*on\s*PhonePe)?/i,
    type: 'debit'
  },
  // Generic fallback: catch "Rs.XXX" or "INR XXX" with debit/credit keywords
  {
    bank: 'Unknown',
    pattern: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*.*?(?:debit|spent|withdrawn|purchase)/i,
    type: 'debit'
  },
  {
    bank: 'Unknown',
    pattern: /(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)\s*.*?(?:credit|received|refund|cashback)/i,
    type: 'credit'
  }
];

// Extract date from SMS text if present
function extractDate(text) {
  // Common date formats in Indian bank SMS
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,         // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{2,4})/i,
    /on\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
  ];

  for (const p of patterns) {
    const match = text.match(p);
    if (match) {
      try {
        // Try to parse — return ISO string
        const d = new Date(match[0].replace(/on\s*/i, ''));
        if (!isNaN(d)) return d.toISOString();
      } catch (_) {}
    }
  }
  return null;
}

function parseBankSMS(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/\s+/g, ' ').trim();

  for (const { bank, pattern, type } of SMS_PATTERNS) {
    const match = cleaned.match(pattern);
    if (match) {
      const amount = parseFloat((match[1] || '').replace(/,/g, ''));
      if (isNaN(amount) || amount <= 0) continue;

      const merchant = (match[3] || match[2] || '').trim().replace(/[.;,]$/, '').trim() || null;
      const refNumber = match[4] || match[3] || null;
      const date = extractDate(cleaned);

      return {
        amount,
        merchant,
        date: date || new Date().toISOString(),
        refNumber: typeof refNumber === 'string' && /^\d+$/.test(refNumber) ? refNumber : null,
        bankName: bank,
        type,
        originalText: text.trim()
      };
    }
  }
  return null;
}

module.exports = { parseBankSMS };

