import { ParsedLeadData } from "@/types/leads";

/**
 * Deterministic parser for raw lead data
 * Handles table-like text with various spacing and line breaks
 * 
 * Parses ONLY these labels:
 * - Name / Full Name / Student Name
 * - Email
 * - Phone / Cell / Mobile
 * - Permit Number / Permit #
 * - Permit Issue Date / Issue Date
 * - Permit Expiration Date / Expiration Date
 * - Parent/Guardian Info → Name / Email / Phone
 * - Home Address / Address
 * - Student Pick-up Locations / Pickup Locations
 */

// Normalize text: handle line breaks, collapse spaces, clean up
function normalizeText(text: string): string {
  return text
    // Normalize all line breaks to \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace tabs with spaces
    .replace(/\t/g, ' ')
    // Collapse multiple spaces to single space (but preserve newlines)
    .replace(/[^\S\n]+/g, ' ')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove multiple consecutive empty lines
    .replace(/\n{3,}/g, '\n\n');
}

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

// Label patterns for each field (case insensitive)
const LABEL_PATTERNS: { key: keyof ParsedLeadData; patterns: RegExp[] }[] = [
  {
    key: 'full_name',
    patterns: [
      /^(?:student\s+)?(?:full\s+)?name\s*[:|\-]?\s*/i,
      /^name\s*[:|\-]?\s*/i,
    ]
  },
  {
    key: 'email',
    patterns: [
      /^(?:student\s+)?e[\-]?mail(?:\s+address)?\s*[:|\-]?\s*/i,
      /^email\s*[:|\-]?\s*/i,
    ]
  },
  {
    key: 'phone',
    patterns: [
      /^(?:student\s+)?(?:phone|cell|mobile)(?:\s+(?:number|#))?\s*[:|\-]?\s*/i,
      /^phone\s*[:|\-]?\s*/i,
    ]
  },
  {
    key: 'permit_number',
    patterns: [
      /^permit\s*(?:number|#|no\.?)?\s*[:|\-]?\s*/i,
      /^license\s*(?:number|#|no\.?)?\s*[:|\-]?\s*/i,
    ]
  },
  {
    key: 'permit_issue_date',
    patterns: [
      /^permit\s+issue\s+date\s*[:|\-]?\s*/i,
      /^issue\s+date\s*[:|\-]?\s*/i,
      /^date\s+issued\s*[:|\-]?\s*/i,
    ]
  },
  {
    key: 'permit_expiration_date',
    patterns: [
      /^permit\s+expir(?:ation|y)\s+date\s*[:|\-]?\s*/i,
      /^expir(?:ation|y)\s+date\s*[:|\-]?\s*/i,
      /^expir(?:es|y)\s*[:|\-]?\s*/i,
    ]
  },
  {
    key: 'guardian_name',
    patterns: [
      /^(?:parent|guardian)[\s\/]*(?:guardian)?\s*(?:info)?\s*(?:name)?\s*[:|\-]?\s*/i,
      /^(?:emergency\s+)?contact\s+name\s*[:|\-]?\s*/i,
    ]
  },
  {
    key: 'guardian_phone',
    patterns: [
      /^(?:parent|guardian)[\s\/]*(?:guardian)?\s*(?:phone|cell|mobile)(?:\s+(?:number|#))?\s*[:|\-]?\s*/i,
      /^(?:emergency\s+)?contact\s+(?:phone|number)\s*[:|\-]?\s*/i,
    ]
  },
  {
    key: 'guardian_email',
    patterns: [
      /^(?:parent|guardian)[\s\/]*(?:guardian)?\s*e[\-]?mail(?:\s+address)?\s*[:|\-]?\s*/i,
      /^(?:emergency\s+)?contact\s+e[\-]?mail\s*[:|\-]?\s*/i,
    ]
  },
  {
    key: 'home_address',
    patterns: [
      /^home\s+address\s*[:|\-]?\s*/i,
      /^(?:street\s+)?address\s*[:|\-]?\s*/i,
    ]
  },
  {
    key: 'pickup_locations',
    patterns: [
      /^(?:student\s+)?pick[\s\-]*up\s+location[s]?\s*[:|\-]?\s*/i,
      /^pickup\s+(?:location[s]?|address(?:es)?)\s*[:|\-]?\s*/i,
    ]
  },
];

/**
 * Try to extract value from a line that matches a label pattern
 * Returns the value if found, or null
 */
function extractValueFromLine(line: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      // Value is everything after the matched label
      const value = line.slice(match[0].length).trim();
      // Remove leading colon or dash if present
      return value.replace(/^[:|\-]\s*/, '').trim();
    }
  }
  return null;
}

/**
 * Check if a line is a label-only line (no value after label)
 */
function isLabelOnly(line: string, patterns: RegExp[]): boolean {
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const remaining = line.slice(match[0].length).trim();
      return remaining.length === 0 || remaining === ':' || remaining === '-';
    }
  }
  return false;
}

/**
 * Parse raw text into structured lead data
 * Handles table-like formats and various spacing
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

  // Normalize the input text
  const normalized = normalizeText(rawText);
  const lines = normalized.split('\n').filter(line => line.trim());

  // Track which fields have been found
  const found: Set<keyof ParsedLeadData> = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { key, patterns } of LABEL_PATTERNS) {
      // Skip if already found
      if (found.has(key)) continue;

      // Try to extract value from this line
      const value = extractValueFromLine(line, patterns);
      
      if (value !== null) {
        if (value.length > 0) {
          // Value is on the same line as label
          result[key] = value;
          found.add(key);
        } else if (isLabelOnly(line, patterns) && i + 1 < lines.length) {
          // Label only, value might be on next line
          const nextLine = lines[i + 1].trim();
          // Make sure next line isn't another label
          const isNextLineLabel = LABEL_PATTERNS.some(({ patterns: p }) =>
            extractValueFromLine(nextLine, p) !== null || isLabelOnly(nextLine, p)
          );
          if (!isNextLineLabel && nextLine) {
            result[key] = nextLine;
            found.add(key);
            i++; // Skip the next line since we consumed it
          }
        }
        break; // Move to next line after finding a match
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

/**
 * Sample raw data for testing the parser
 */
export const SAMPLE_RAW_DATA = `Student Name:        Isabella Johnson
Email:               isabella@yahoo.com
Phone:               (678) 704-1713
Permit Number:       DL123456789
Permit Issue Date:   09/11/2024
Permit Expiration Date: 09/11/2025

Parent/Guardian Info
Name:                Maria Johnson
Phone:               (678) 555-4321
Email:               maria.johnson@gmail.com

Home Address:        1234 Peachtree Lane, Atlanta, GA 30301

Student Pick-up Locations:
Westside High School
Atlanta Public Library
Home`;
