/**
 * OCR-based Lead Parser for DrivingKlass
 * Uses Tesseract.js for client-side OCR with deterministic regex parsing
 * NO AI/LLM - pure OCR + regex + rule-based logic
 */

import Tesseract from 'tesseract.js';

export interface OcrParsedLead {
  student_name: string;
  student_email: string;
  student_phone: string;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string;
  raw_ocr_text: string;
  confidence: number;
  debug: {
    lines: string[];
    studentBlockStart: number;
    studentBlockEnd: number;
    guardianBlockStart: number;
    guardianBlockEnd: number;
    emailsFound: string[];
    phonesFound: string[];
  };
}

// Regex patterns (case-insensitive)
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /(\+?1[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;

// Words that indicate a line is NOT a person's name
const NON_NAME_WORDS = [
  'guardian', 'parent', 'student', 'email', 'phone', 'address',
  'permit', 'license', 'overview', 'notes', 'edit', 'save',
  'cancel', 'search', 'loading', 'results', 'active', 'inactive'
];

/**
 * Normalize phone number to (###) ###-#### format
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
 * Check if a line looks like a person's name
 * - Contains letters and spaces
 * - Not a badge or label
 * - Not containing emails or phones
 */
function looksLikeName(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  
  // Too short or too long
  if (trimmed.length < 3 || trimmed.length > 50) return false;
  
  // Contains email or phone
  if (EMAIL_REGEX.test(line) || PHONE_REGEX.test(line)) {
    EMAIL_REGEX.lastIndex = 0;
    PHONE_REGEX.lastIndex = 0;
    return false;
  }
  
  // Contains non-name words
  if (NON_NAME_WORDS.some(word => trimmed.includes(word))) return false;
  
  // Should have at least 2 words (first/last name)
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) return false;
  
  // Should be mostly letters
  const letterCount = (trimmed.match(/[a-z]/gi) || []).length;
  const ratio = letterCount / trimmed.replace(/\s/g, '').length;
  
  return ratio > 0.7;
}

/**
 * Find the guardian section start index
 */
function findGuardianStart(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    if (/\bguardian\b/i.test(lines[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * Parse lead data from OCR text using deterministic rules
 * 
 * Rules:
 * A) Student block = FIRST contact block (name, email, phone in sequence)
 * B) Guardian block = After "Guardian" keyword
 * C) Email: contains @
 * D) Phone: 10-11 digits in phone format
 */
export function parseLeadFromOcr(text: string): OcrParsedLead {
  // Normalize text
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '\n')
    .replace(/[^\S\n]+/g, ' ');
  
  // Split into non-empty trimmed lines
  const lines = normalized
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  // Extract all emails and phones
  const allEmails = text.match(EMAIL_REGEX) || [];
  const allPhones = (text.match(PHONE_REGEX) || []).map(normalizePhone);
  
  // Reset regex lastIndex
  EMAIL_REGEX.lastIndex = 0;
  PHONE_REGEX.lastIndex = 0;
  
  const result: OcrParsedLead = {
    student_name: '',
    student_email: '',
    student_phone: '',
    guardian_name: '',
    guardian_email: '',
    guardian_phone: '',
    raw_ocr_text: text,
    confidence: 0,
    debug: {
      lines,
      studentBlockStart: -1,
      studentBlockEnd: -1,
      guardianBlockStart: -1,
      guardianBlockEnd: -1,
      emailsFound: allEmails,
      phonesFound: allPhones,
    }
  };
  
  // Find guardian section
  const guardianStart = findGuardianStart(lines);
  result.debug.guardianBlockStart = guardianStart;
  
  // Student block ends where guardian begins (or end of text)
  const studentBlockEnd = guardianStart > 0 ? guardianStart : lines.length;
  result.debug.studentBlockEnd = studentBlockEnd;
  
  // --- STUDENT BLOCK PARSING ---
  // Find first name-like line in student block
  let studentNameLineIdx = -1;
  for (let i = 0; i < studentBlockEnd; i++) {
    if (looksLikeName(lines[i])) {
      studentNameLineIdx = i;
      result.student_name = lines[i];
      result.debug.studentBlockStart = i;
      break;
    }
  }
  
  // Find first email after student name
  if (studentNameLineIdx >= 0) {
    for (let i = studentNameLineIdx + 1; i < studentBlockEnd; i++) {
      const emailMatch = lines[i].match(EMAIL_REGEX);
      if (emailMatch) {
        result.student_email = emailMatch[0];
        
        // Find first phone after student email
        for (let j = i; j < studentBlockEnd; j++) {
          const phoneMatch = lines[j].match(PHONE_REGEX);
          if (phoneMatch) {
            result.student_phone = normalizePhone(phoneMatch[0]);
            break;
          }
        }
        break;
      }
    }
  }
  
  // Fallback: if no name found but we have email, use first line
  if (!result.student_name && allEmails.length > 0) {
    for (let i = 0; i < studentBlockEnd; i++) {
      if (lines[i] && !EMAIL_REGEX.test(lines[i]) && !PHONE_REGEX.test(lines[i])) {
        result.student_name = lines[i];
        result.debug.studentBlockStart = i;
        break;
      }
    }
    result.student_email = allEmails[0];
  }
  
  // Fallback: get first email/phone if still missing
  if (!result.student_email && allEmails.length > 0) {
    result.student_email = allEmails[0];
  }
  if (!result.student_phone && allPhones.length > 0) {
    result.student_phone = allPhones[0];
  }
  
  // --- GUARDIAN BLOCK PARSING ---
  if (guardianStart >= 0) {
    result.debug.guardianBlockEnd = lines.length;
    
    // Guardian name = first name-like line after "Guardian"
    for (let i = guardianStart + 1; i < lines.length; i++) {
      if (looksLikeName(lines[i])) {
        result.guardian_name = lines[i];
        
        // Find first email after guardian name
        for (let j = i + 1; j < lines.length; j++) {
          const emailMatch = lines[j].match(EMAIL_REGEX);
          if (emailMatch && emailMatch[0] !== result.student_email) {
            result.guardian_email = emailMatch[0];
            
            // Find first phone after guardian email
            for (let k = j; k < lines.length; k++) {
              const phoneMatch = lines[k].match(PHONE_REGEX);
              if (phoneMatch) {
                const normalizedPhone = normalizePhone(phoneMatch[0]);
                if (normalizedPhone !== result.student_phone) {
                  result.guardian_phone = normalizedPhone;
                  break;
                }
              }
            }
            break;
          }
        }
        break;
      }
    }
    
    // Fallback: if guardian section found but no name, try to get different email/phone
    if (!result.guardian_email && allEmails.length > 1) {
      result.guardian_email = allEmails.find(e => e !== result.student_email) || '';
    }
    if (!result.guardian_phone && allPhones.length > 1) {
      result.guardian_phone = allPhones.find(p => p !== result.student_phone) || '';
    }
  }
  
  // Calculate confidence score
  let score = 0;
  if (result.student_name) score += 25;
  if (result.student_email) score += 25;
  if (result.student_phone) score += 25;
  if (result.guardian_name || result.guardian_email || result.guardian_phone) score += 25;
  result.confidence = score;
  
  return result;
}

/**
 * Run OCR on an image file using Tesseract.js
 * Returns raw text extracted from the image
 */
export async function runOcr(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<{ text: string; confidence: number }> {
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });
  
  try {
    const { data } = await worker.recognize(imageFile);
    
    await worker.terminate();
    
    return {
      text: data.text,
      confidence: data.confidence
    };
  } catch (error) {
    await worker.terminate();
    throw error;
  }
}

/**
 * Full pipeline: Image -> OCR -> Parse
 */
export async function extractLeadFromScreenshot(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<OcrParsedLead> {
  const { text, confidence } = await runOcr(imageFile, onProgress);
  const parsed = parseLeadFromOcr(text);
  parsed.confidence = Math.round((parsed.confidence + confidence) / 2);
  return parsed;
}
