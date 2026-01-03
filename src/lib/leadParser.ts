import { ParsedLeadData } from "@/types/leads";

/**
 * Deterministic parser for raw lead data
 * Parses ONLY these labels:
 * - Name
 * - Email
 * - Phone
 * - Permit Number
 * - Permit Issue Date
 * - Permit Expiration Date
 * - Parent/Guardian Info → Name / Email / Phone
 * - Home Address
 * - Student Pick-up Locations
 */

// Define field patterns with their labels
const FIELD_PATTERNS: { key: keyof ParsedLeadData; labels: RegExp[] }[] = [
  { 
    key: 'full_name', 
    labels: [
      /^(?:student\s*)?name\s*:?\s*$/i,
      /^full\s*name\s*:?\s*$/i,
      /^name\s*:?\s*$/i,
    ] 
  },
  { 
    key: 'email', 
    labels: [
      /^(?:student\s*)?email\s*(?:address)?\s*:?\s*$/i,
      /^e-?mail\s*:?\s*$/i,
    ] 
  },
  { 
    key: 'phone', 
    labels: [
      /^(?:student\s*)?phone\s*(?:number)?\s*:?\s*$/i,
      /^(?:student\s*)?cell\s*(?:phone)?\s*:?\s*$/i,
      /^mobile\s*:?\s*$/i,
    ] 
  },
  { 
    key: 'permit_number', 
    labels: [
      /^permit\s*(?:number|#|no\.?)?\s*:?\s*$/i,
      /^license\s*(?:number|#|no\.?)?\s*:?\s*$/i,
      /^permit\s*:?\s*$/i,
    ] 
  },
  { 
    key: 'permit_issue_date', 
    labels: [
      /^permit\s*issue\s*date\s*:?\s*$/i,
      /^issue\s*date\s*:?\s*$/i,
      /^date\s*issued\s*:?\s*$/i,
    ] 
  },
  { 
    key: 'permit_expiration_date', 
    labels: [
      /^permit\s*expir(?:ation|y)\s*date\s*:?\s*$/i,
      /^expir(?:ation|y)\s*date\s*:?\s*$/i,
      /^expir(?:es|y)\s*:?\s*$/i,
    ] 
  },
  { 
    key: 'guardian_name', 
    labels: [
      /^(?:parent|guardian)\s*(?:\/\s*guardian\s*)?name\s*:?\s*$/i,
      /^parent\s*:?\s*$/i,
      /^guardian\s*:?\s*$/i,
    ] 
  },
  { 
    key: 'guardian_phone', 
    labels: [
      /^(?:parent|guardian)\s*(?:\/\s*guardian\s*)?phone\s*(?:number)?\s*:?\s*$/i,
      /^(?:parent|guardian)\s*cell\s*:?\s*$/i,
    ] 
  },
  { 
    key: 'guardian_email', 
    labels: [
      /^(?:parent|guardian)\s*(?:\/\s*guardian\s*)?email\s*(?:address)?\s*:?\s*$/i,
    ] 
  },
  { 
    key: 'home_address', 
    labels: [
      /^home\s*address\s*:?\s*$/i,
      /^address\s*:?\s*$/i,
      /^street\s*address\s*:?\s*$/i,
    ] 
  },
  { 
    key: 'pickup_locations', 
    labels: [
      /^(?:student\s*)?pick\s*-?\s*up\s*location(?:s)?\s*:?\s*$/i,
      /^pickup\s*(?:location(?:s)?|address(?:es)?)\s*:?\s*$/i,
    ] 
  },
];

/**
 * Normalize phone number to consistent format
 */
function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX if 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // Handle 11 digits (with country code)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return phone.trim();
}

/**
 * Parse date from various formats (MM/DD/YYYY, MM-DD-YYYY, etc.)
 * Returns ISO date string or empty string
 */
function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // Try MM/DD/YYYY or MM-DD-YYYY
  const slashMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slashMatch) {
    let [, month, day, year] = slashMatch;
    // Handle 2-digit year
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    }
    const m = month.padStart(2, '0');
    const d = day.padStart(2, '0');
    return `${year}-${m}-${d}`;
  }
  
  return '';
}

/**
 * Check if a line matches any label pattern for a field
 */
function matchesLabel(line: string, patterns: RegExp[]): boolean {
  const trimmed = line.trim();
  return patterns.some(pattern => pattern.test(trimmed));
}

/**
 * Check if a line contains inline value (Label: Value format)
 */
function extractInlineValue(line: string): string | null {
  const colonIndex = line.indexOf(':');
  if (colonIndex !== -1) {
    const value = line.slice(colonIndex + 1).trim();
    if (value) return value;
  }
  return null;
}

/**
 * Parse raw text into structured lead data
 */
export function parseLeadData(rawText: string): ParsedLeadData {
  const result: ParsedLeadData = {
    full_name: '',
    email: '',
    phone: '',
    permit_number: '',
    permit_issue_date: '',
    permit_expiration_date: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    home_address: '',
    pickup_locations: '',
  };

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const { key, labels } of FIELD_PATTERNS) {
      // Check if current line matches a label
      if (matchesLabel(line, labels)) {
        // First, try to extract inline value (Label: Value)
        const inlineValue = extractInlineValue(line);
        if (inlineValue && !result[key]) {
          result[key] = inlineValue;
        } else {
          // Otherwise, get value from next non-empty line
          if (i + 1 < lines.length && !result[key]) {
            const nextLine = lines[i + 1];
            // Make sure next line isn't another label
            const isNextLineLabel = FIELD_PATTERNS.some(fp => 
              matchesLabel(nextLine, fp.labels)
            );
            if (!isNextLineLabel) {
              result[key] = nextLine;
            }
          }
        }
        break;
      }
      
      // Also check for inline format on any line (Label: Value)
      for (const pattern of labels) {
        const labelMatch = line.match(new RegExp(pattern.source.replace(/$/, ''), 'i'));
        if (labelMatch && !result[key]) {
          const value = extractInlineValue(line);
          if (value) {
            result[key] = value;
          }
        }
      }
    }
  }
  
  // Post-process: normalize phone numbers
  if (result.phone) {
    result.phone = normalizePhone(result.phone);
  }
  if (result.guardian_phone) {
    result.guardian_phone = normalizePhone(result.guardian_phone);
  }
  
  // Post-process: parse dates
  if (result.permit_issue_date) {
    result.permit_issue_date = parseDate(result.permit_issue_date);
  }
  if (result.permit_expiration_date) {
    result.permit_expiration_date = parseDate(result.permit_expiration_date);
  }
  
  return result;
}

/**
 * Get list of missing required fields
 */
export function getMissingFields(data: ParsedLeadData): string[] {
  const required: (keyof ParsedLeadData)[] = ['full_name', 'phone'];
  const missing: string[] = [];
  
  for (const field of required) {
    if (!data[field]) {
      missing.push(field.replace(/_/g, ' '));
    }
  }
  
  return missing;
}
