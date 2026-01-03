import { ParsedLeadData } from "@/types/leads";

/**
 * Deterministic parser for raw lead data
 * Handles table-like text with various spacing and line breaks
 * 
 * Uses section-based parsing for Parent/Guardian, Home Address, and Pickup Locations
 */

// ============= NORMALIZATION =============

/**
 * Normalize text: handle line breaks, tabs, spaces
 * Converts tabs to newlines for table-like pastes
 */
function normalizeText(text: string): string {
  return text
    // Normalize all line breaks to \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace tabs with newlines (table pastes become line-separated)
    .replace(/\t/g, '\n')
    // Collapse multiple spaces to single space (preserve newlines)
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
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return phone.trim();
}

/**
 * Parse date from various formats (MM/DD/YYYY, MM-DD-YYYY, etc.)
 */
function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (match) {
    let [, month, day, year] = match;
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return '';
}

// ============= REGEX PATTERNS =============

const PHONE_REGEX = /\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Section headers that END the parent/guardian block
const PARENT_SECTION_END_HEADERS = [
  /how did you hear/i,
  /note:/i,
  /danger zone/i,
  /home address/i,
  /(?:student\s+)?pick[\s-]*up\s+location/i,
  /pickup location/i,
  /^address$/i,
  /drive deadline/i,
  /certificate/i,
];

// Section headers that END the home address block
const ADDRESS_SECTION_END_HEADERS = [
  /(?:student\s+)?pick[\s-]*up\s+location/i,
  /pickup location/i,
  /note:/i,
  /danger zone/i,
  /how did you hear/i,
];

// Section headers that END the pickup locations block
const PICKUP_SECTION_END_HEADERS = [
  /note:/i,
  /danger zone/i,
  /how did you hear/i,
];

// ============= SECTION DETECTION =============

/**
 * Find the start index of a section by header patterns
 */
function findSectionStart(lines: string[], patterns: RegExp[]): number {
  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    for (const pattern of patterns) {
      if (pattern.test(lineLower) || pattern.test(lines[i])) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Find the end index of a section by end-header patterns
 */
function findSectionEnd(lines: string[], startIdx: number, endPatterns: RegExp[]): number {
  for (let i = startIdx + 1; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    for (const pattern of endPatterns) {
      if (pattern.test(lineLower) || pattern.test(lines[i])) {
        return i;
      }
    }
  }
  return lines.length;
}

// ============= VALUE EXTRACTION =============

/**
 * Extract value after a label on the same line or next line
 */
function extractLabelValue(lines: string[], startIdx: number, labelPatterns: RegExp[]): { value: string; nextIdx: number } {
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    
    for (const pattern of labelPatterns) {
      const match = line.match(pattern);
      if (match) {
        const valueAfterLabel = line.slice(match[0].length).trim().replace(/^[:|\-]\s*/, '').trim();
        
        if (valueAfterLabel && valueAfterLabel.length > 0) {
          return { value: valueAfterLabel, nextIdx: i + 1 };
        }
        
        // Value might be on next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          // Skip "Edit" alone
          if (nextLine.toLowerCase() === 'edit') {
            if (i + 2 < lines.length) {
              return { value: lines[i + 2].trim(), nextIdx: i + 3 };
            }
          } else if (nextLine && !isLabelLine(nextLine)) {
            return { value: nextLine, nextIdx: i + 2 };
          }
        }
        return { value: '', nextIdx: i + 1 };
      }
    }
  }
  return { value: '', nextIdx: startIdx };
}

/**
 * Check if a line looks like a label line
 */
function isLabelLine(line: string): boolean {
  const labelPatterns = [
    /^(?:student\s+)?(?:full\s+)?name\s*[:|\-]?\s*$/i,
    /^email\s*[:|\-]?\s*$/i,
    /^phone\s*[:|\-]?\s*$/i,
    /^permit/i,
    /^parent/i,
    /^guardian/i,
    /^home address/i,
    /^address/i,
    /^pick[\s-]*up/i,
    /^how did you/i,
    /^note:/i,
    /^danger zone/i,
    /^birthday/i,
    /^status/i,
    /^certificate/i,
  ];
  return labelPatterns.some(p => p.test(line.toLowerCase()));
}

/**
 * Check if text looks like an address (contains number and comma, or is multi-word)
 */
function looksLikeAddress(text: string): boolean {
  return (text.includes(',') && /\d/.test(text)) || 
         (text.split(/\s+/).length >= 3 && /\d/.test(text));
}

// ============= PARENT/GUARDIAN EXTRACTION =============

interface ParentData {
  name: string;
  email: string;
  phone: string;
}

/**
 * Extract parent/guardian info from a dedicated section
 */
function extractParentFromSection(lines: string[], sectionStart: number, sectionEnd: number): ParentData {
  const result: ParentData = { name: '', email: '', phone: '' };
  const sectionLines = lines.slice(sectionStart, sectionEnd);
  
  // Look for Name within the section
  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    const lineLower = line.toLowerCase();
    
    // Name extraction
    if (!result.name) {
      const nameMatch = line.match(/^name\s*[:|\-]?\s*(.+)/i);
      if (nameMatch && nameMatch[1].trim()) {
        result.name = nameMatch[1].trim();
      } else if (lineLower === 'name' || lineLower === 'name:') {
        // Name is on next line
        if (i + 1 < sectionLines.length) {
          const nextLine = sectionLines[i + 1].trim();
          if (nextLine && !isLabelLine(nextLine)) {
            result.name = nextLine;
          }
        }
      }
    }
    
    // Email extraction
    if (!result.email) {
      const emailMatch = line.match(/^email\s*[:|\-]?\s*(.+)/i);
      if (emailMatch && emailMatch[1].trim()) {
        const email = emailMatch[1].trim().match(EMAIL_REGEX);
        if (email) result.email = email[0];
      } else if (lineLower === 'email' || lineLower === 'email:') {
        if (i + 1 < sectionLines.length) {
          const nextLine = sectionLines[i + 1].trim();
          const emailMatch = nextLine.match(EMAIL_REGEX);
          if (emailMatch) result.email = emailMatch[0];
        }
      } else {
        // Check if line contains an email
        const emailInLine = line.match(EMAIL_REGEX);
        if (emailInLine && !result.email) {
          result.email = emailInLine[0];
        }
      }
    }
    
    // Phone extraction
    if (!result.phone) {
      const phoneMatch = line.match(/^phone\s*[:|\-]?\s*(.+)/i);
      if (phoneMatch && phoneMatch[1].trim()) {
        const phone = phoneMatch[1].trim().match(PHONE_REGEX);
        if (phone) result.phone = normalizePhone(phone[0]);
      } else if (lineLower === 'phone' || lineLower === 'phone:') {
        if (i + 1 < sectionLines.length) {
          const nextLine = sectionLines[i + 1].trim();
          const phoneMatch = nextLine.match(PHONE_REGEX);
          if (phoneMatch) result.phone = normalizePhone(phoneMatch[0]);
        }
      } else {
        // Check if line contains a phone
        const phoneInLine = line.match(PHONE_REGEX);
        if (phoneInLine && !result.phone) {
          result.phone = normalizePhone(phoneInLine[0]);
        }
      }
    }
  }
  
  return result;
}

/**
 * Fallback: extract parent info from the END of the raw text
 * Uses the LAST email, LAST phone after student's info
 */
function extractParentFallback(rawText: string, studentEmail: string, studentPhone: string): ParentData {
  const result: ParentData = { name: '', email: '', phone: '' };
  
  // Find all emails and phones
  const allEmails = rawText.match(EMAIL_REGEX) || [];
  const allPhones = rawText.match(PHONE_REGEX) || [];
  
  // Get last email that's not the student's email
  for (let i = allEmails.length - 1; i >= 0; i--) {
    if (allEmails[i].toLowerCase() !== studentEmail.toLowerCase()) {
      result.email = allEmails[i];
      break;
    }
  }
  
  // Get last phone that's not the student's phone
  const normalizedStudentPhone = studentPhone.replace(/\D/g, '');
  for (let i = allPhones.length - 1; i >= 0; i--) {
    const normalizedPhone = allPhones[i].replace(/\D/g, '');
    if (normalizedPhone !== normalizedStudentPhone) {
      result.phone = normalizePhone(allPhones[i]);
      break;
    }
  }
  
  return result;
}

// ============= HOME ADDRESS EXTRACTION =============

function extractHomeAddress(lines: string[]): string {
  const headerPatterns = [/^home\s+address/i];
  const startIdx = findSectionStart(lines, headerPatterns);
  
  if (startIdx === -1) return '';
  
  const headerLine = lines[startIdx];
  
  // Check if address is on the same line (after "Home Address" or "Home Address Edit")
  const afterLabel = headerLine.replace(/^home\s+address\s*/i, '').replace(/^edit\s*/i, '').trim();
  
  if (afterLabel && looksLikeAddress(afterLabel)) {
    return afterLabel;
  }
  
  // Address is on next line(s)
  const endIdx = findSectionEnd(lines, startIdx, ADDRESS_SECTION_END_HEADERS);
  
  for (let i = startIdx + 1; i < endIdx; i++) {
    const line = lines[i].trim();
    
    // Skip "Edit" alone
    if (line.toLowerCase() === 'edit') continue;
    
    // Skip empty lines
    if (!line) continue;
    
    // Found the address
    if (line && !isLabelLine(line)) {
      return line;
    }
  }
  
  return '';
}

// ============= PICKUP LOCATIONS EXTRACTION =============

function extractPickupLocations(lines: string[]): string {
  const headerPatterns = [
    /^(?:student\s+)?pick[\s-]*up\s+location/i,
    /^pickup\s+location/i,
  ];
  const startIdx = findSectionStart(lines, headerPatterns);
  
  if (startIdx === -1) return '';
  
  const headerLine = lines[startIdx];
  
  // Check if location is on the same line
  const afterLabel = headerLine
    .replace(/^(?:student\s+)?pick[\s-]*up\s+location[s]?\s*/i, '')
    .replace(/^edit\s*/i, '')
    .trim();
  
  if (afterLabel && looksLikeAddress(afterLabel)) {
    return afterLabel;
  }
  
  // Collect all location lines until end section
  const endIdx = findSectionEnd(lines, startIdx, PICKUP_SECTION_END_HEADERS);
  const locations: string[] = [];
  
  for (let i = startIdx + 1; i < endIdx; i++) {
    const line = lines[i].trim();
    
    // Skip "Edit" alone
    if (line.toLowerCase() === 'edit') continue;
    
    // Skip empty lines
    if (!line) continue;
    
    // Skip label-like lines
    if (isLabelLine(line)) continue;
    
    locations.push(line);
  }
  
  return locations.join('\n');
}

// ============= BASIC FIELD EXTRACTION =============

function extractBasicField(lines: string[], labelPatterns: RegExp[]): string {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const pattern of labelPatterns) {
      const match = line.match(pattern);
      if (match) {
        const value = line.slice(match[0].length).trim().replace(/^[:|\-]\s*/, '').trim();
        
        if (value) return value;
        
        // Check next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine && !isLabelLine(nextLine)) {
            return nextLine;
          }
        }
      }
    }
  }
  return '';
}

// ============= MAIN PARSER =============

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

  if (!rawText || !rawText.trim()) return result;

  // Normalize the input
  const normalized = normalizeText(rawText);
  const lines = normalized.split('\n').filter(line => line.trim());

  // ===== Extract basic student fields =====
  result.full_name = extractBasicField(lines, [
    /^(?:student\s+)?(?:full\s+)?name\s*[:|\-]?\s*/i,
    /^name\s*[:|\-]?\s*/i,
  ]);

  result.email = extractBasicField(lines, [
    /^(?:student\s+)?e[\-]?mail(?:\s+address)?\s*[:|\-]?\s*/i,
    /^email\s*[:|\-]?\s*/i,
  ]);

  result.phone = extractBasicField(lines, [
    /^(?:student\s+)?(?:phone|cell|mobile)(?:\s+(?:number|#))?\s*[:|\-]?\s*/i,
    /^phone\s*[:|\-]?\s*/i,
  ]);

  result.permit_number = extractBasicField(lines, [
    /^permit\s*(?:number|#|no\.?)?\s*[:|\-]?\s*/i,
    /^license\s*(?:number|#|no\.?)?\s*[:|\-]?\s*/i,
  ]);

  result.permit_issue_date = extractBasicField(lines, [
    /^permit\s+issue\s+date\s*[:|\-]?\s*/i,
    /^issue\s+date\s*[:|\-]?\s*/i,
  ]);

  result.permit_expiration_date = extractBasicField(lines, [
    /^permit\s+expir(?:ation|y)\s+date\s*[:|\-]?\s*/i,
    /^expir(?:ation|y)\s+date\s*[:|\-]?\s*/i,
  ]);

  // ===== Extract Parent/Guardian Info (section-based) =====
  const parentHeaderPatterns = [
    /^parent[\s\/]*guardian[\s\/]*info/i,
    /^parent[\s\/]+guardian/i,
    /^parent\/guardian/i,
    /^parent guardian/i,
    /^emergency\s+contact/i,
  ];
  
  const parentSectionStart = findSectionStart(lines, parentHeaderPatterns);
  
  if (parentSectionStart !== -1) {
    const parentSectionEnd = findSectionEnd(lines, parentSectionStart, PARENT_SECTION_END_HEADERS);
    const parentData = extractParentFromSection(lines, parentSectionStart, parentSectionEnd);
    
    result.guardian_name = parentData.name;
    result.guardian_email = parentData.email;
    result.guardian_phone = parentData.phone;
  }
  
  // Fallback: if parent info is incomplete, try to get from end of text
  if (!result.guardian_email || !result.guardian_phone) {
    const fallback = extractParentFallback(rawText, result.email, result.phone);
    
    if (!result.guardian_email && fallback.email) {
      result.guardian_email = fallback.email;
    }
    if (!result.guardian_phone && fallback.phone) {
      result.guardian_phone = fallback.phone;
    }
  }

  // ===== Extract Home Address (section-based) =====
  result.home_address = extractHomeAddress(lines);

  // ===== Extract Pickup Locations (section-based) =====
  result.pickup_locations = extractPickupLocations(lines);

  // ===== Post-process =====
  if (result.phone) {
    result.phone = normalizePhone(result.phone);
  }
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
 * Required: Full Name + (Phone OR Email)
 */
export function getMissingFields(data: ParsedLeadData): string[] {
  const missing: string[] = [];

  if (!data.full_name) {
    missing.push('full name');
  }
  
  if (!data.phone && !data.email) {
    missing.push('phone or email');
  }

  return missing;
}

/**
 * Sample raw data for testing the parser (matches user's test case)
 */
export const SAMPLE_RAW_DATA = `Sectors 30039
Name Isabella Roberson
Username isabella.roberson09
Status Active
Upcoming Session 01/07/2026 10:00 AM #1
Total Balance Owed None
Email isabella.roberson09@yahoo.com
Phone (678) 704-1713
Birthday 08/19/2009 16 years old
Certificate N/A
Certificate Issue Date N/A
Drive Deadline
Permit Number 072117696
Permit Issue Date 09/11/2024
Permit Expiration Date 09/11/2026
Parent/Guardian Info
Name maria roberson
Email mdiaz_nco@yahoo.com
Phone (404) 789-6319
How did you hear about us?
There are no customer sources for this student.
Note: This will generate a new password for the Student.
Danger Zone
Home Address Edit
2725 Tradd Ct, Snellville, GA, 30039
Student Pick-up Locations Edit
2725 Tradd Ct, Snellville, GA 30039`;

/**
 * Test function to verify parser works correctly
 * Returns true if all expected fields match
 */
export function testParser(): { passed: boolean; results: Record<string, { expected: string; actual: string; match: boolean }> } {
  const parsed = parseLeadData(SAMPLE_RAW_DATA);
  
  const expected = {
    full_name: 'Isabella Roberson',
    email: 'isabella.roberson09@yahoo.com',
    phone: '(678) 704-1713',
    permit_number: '072117696',
    permit_issue_date: '2024-09-11',
    permit_expiration_date: '2026-09-11',
    guardian_name: 'maria roberson',
    guardian_email: 'mdiaz_nco@yahoo.com',
    guardian_phone: '(404) 789-6319',
    home_address: '2725 Tradd Ct, Snellville, GA, 30039',
    pickup_locations: '2725 Tradd Ct, Snellville, GA 30039',
  };

  const results: Record<string, { expected: string; actual: string; match: boolean }> = {};
  let allPassed = true;

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = parsed[key as keyof ParsedLeadData] || '';
    const match = actualValue.toLowerCase().trim() === expectedValue.toLowerCase().trim();
    results[key] = { expected: expectedValue, actual: actualValue, match };
    if (!match) allPassed = false;
  }

  return { passed: allPassed, results };
}
