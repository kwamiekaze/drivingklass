/**
 * OCR-based Lead Parser for DrivingKlass
 * Uses Tesseract.js for client-side OCR with deterministic regex parsing
 * NO AI/LLM - pure OCR + regex + rule-based logic
 * 
 * PARSING RULES:
 * 1. First name-like line = student_name
 * 2. First email after student_name = student_email
 * 3. First phone after student_email = student_phone
 * 4. If more contact info exists after student_phone:
 *    - Next name-like line = guardian_name
 *    - Next email after guardian_name = guardian_email
 *    - Next phone after guardian_email = guardian_phone
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
    normalizedLines: string[];
    studentNameLineIdx: number;
    studentEmailLineIdx: number;
    studentPhoneLineIdx: number;
    guardianNameLineIdx: number;
    guardianEmailLineIdx: number;
    guardianPhoneLineIdx: number;
    emailsFound: string[];
    phonesFound: string[];
  };
}

// Regex patterns (case-insensitive)
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /(\+?1[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;

// Badge/label words to ignore (case-insensitive, exact match)
const BADGE_WORDS = [
  'student', 'guardian', 'parent', 'emergency', 'contact',
  'email', 'phone', 'address', 'permit', 'license', 
  'overview', 'notes', 'edit', 'save', 'cancel', 'search',
  'loading', 'results', 'active', 'inactive', 'name', 'info'
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
 * Check if a line should be ignored (badge/label)
 */
function isBadgeLine(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  
  // Empty or very short (1-2 chars, not email/phone)
  if (trimmed.length <= 2) {
    // Check if it's not an email or phone
    if (!EMAIL_REGEX.test(line) && !PHONE_REGEX.test(line)) {
      EMAIL_REGEX.lastIndex = 0;
      PHONE_REGEX.lastIndex = 0;
      return true;
    }
  }
  
  // Exact match badge words
  if (BADGE_WORDS.includes(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a line contains an email
 */
function hasEmail(line: string): boolean {
  EMAIL_REGEX.lastIndex = 0;
  return EMAIL_REGEX.test(line);
}

/**
 * Check if a line contains a phone number
 */
function hasPhone(line: string): boolean {
  PHONE_REGEX.lastIndex = 0;
  return PHONE_REGEX.test(line);
}

/**
 * Extract email from a line
 */
function extractEmail(line: string): string | null {
  EMAIL_REGEX.lastIndex = 0;
  const match = line.match(EMAIL_REGEX);
  return match ? match[0] : null;
}

/**
 * Extract phone from a line
 */
function extractPhone(line: string): string | null {
  PHONE_REGEX.lastIndex = 0;
  const match = line.match(PHONE_REGEX);
  return match ? normalizePhone(match[0]) : null;
}

/**
 * Check if a line looks like a person's name
 * - Contains letters and spaces
 * - Not a badge or label
 * - Not containing emails or phones
 * - At least 2 characters
 */
function looksLikeName(line: string): boolean {
  const trimmed = line.trim();
  
  // Too short or too long
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  
  // Is a badge word
  if (isBadgeLine(line)) return false;
  
  // Contains email or phone
  if (hasEmail(line) || hasPhone(line)) return false;
  
  // Should have letters
  const letterCount = (trimmed.match(/[a-z]/gi) || []).length;
  if (letterCount < 2) return false;
  
  // Should be mostly letters/spaces
  const cleanedLength = trimmed.replace(/\s/g, '').length;
  if (cleanedLength === 0) return false;
  
  const ratio = letterCount / cleanedLength;
  return ratio > 0.6;
}

/**
 * Parse lead data from OCR text using EXACT deterministic rules
 * 
 * Rules:
 * A) Normalize lines (trim, remove empty)
 * B) Ignore badge lines (student, guardian, etc.)
 * C) student_name = first name-like line
 * D) student_email = first email AFTER student_name line
 * E) student_phone = first phone AFTER student_email line
 * F) Guardian info = ONLY if more contact info exists AFTER student_phone:
 *    - guardian_name = next name-like line after student_phone
 *    - guardian_email = first email after guardian_name
 *    - guardian_phone = first phone after guardian_email
 */
export function parseLeadFromOcr(text: string): OcrParsedLead {
  // Store raw text exactly as received
  const rawText = text;
  
  // Normalize text for parsing
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[^\S\n]+/g, ' ');
  
  // Split into non-empty trimmed lines
  const lines = normalized
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  // Filter out badge lines for processing but keep track
  const normalizedLines: string[] = [];
  const lineMapping: number[] = []; // Maps normalizedLines index to original lines index
  
  for (let i = 0; i < lines.length; i++) {
    if (!isBadgeLine(lines[i])) {
      normalizedLines.push(lines[i]);
      lineMapping.push(i);
    }
  }
  
  // Extract all emails and phones for debug
  EMAIL_REGEX.lastIndex = 0;
  PHONE_REGEX.lastIndex = 0;
  const allEmails = text.match(EMAIL_REGEX) || [];
  const allPhones = (text.match(PHONE_REGEX) || []).map(normalizePhone);
  
  const result: OcrParsedLead = {
    student_name: '',
    student_email: '',
    student_phone: '',
    guardian_name: '',
    guardian_email: '',
    guardian_phone: '',
    raw_ocr_text: rawText,
    confidence: 0,
    debug: {
      lines,
      normalizedLines,
      studentNameLineIdx: -1,
      studentEmailLineIdx: -1,
      studentPhoneLineIdx: -1,
      guardianNameLineIdx: -1,
      guardianEmailLineIdx: -1,
      guardianPhoneLineIdx: -1,
      emailsFound: allEmails,
      phonesFound: allPhones,
    }
  };
  
  // --- STEP 1: Find student_name (first name-like line) ---
  let studentNameIdx = -1;
  for (let i = 0; i < normalizedLines.length; i++) {
    if (looksLikeName(normalizedLines[i])) {
      studentNameIdx = i;
      result.student_name = normalizedLines[i];
      result.debug.studentNameLineIdx = lineMapping[i];
      break;
    }
  }
  
  // If no name found, we still continue to find email/phone
  const searchStartForEmail = studentNameIdx >= 0 ? studentNameIdx + 1 : 0;
  
  // --- STEP 2: Find student_email (first email after student_name) ---
  let studentEmailIdx = -1;
  for (let i = searchStartForEmail; i < normalizedLines.length; i++) {
    const email = extractEmail(normalizedLines[i]);
    if (email) {
      studentEmailIdx = i;
      result.student_email = email;
      result.debug.studentEmailLineIdx = lineMapping[i];
      break;
    }
  }
  
  // --- STEP 3: Find student_phone (first phone after student_email) ---
  const searchStartForPhone = studentEmailIdx >= 0 ? studentEmailIdx : searchStartForEmail;
  let studentPhoneIdx = -1;
  for (let i = searchStartForPhone; i < normalizedLines.length; i++) {
    const phone = extractPhone(normalizedLines[i]);
    if (phone) {
      studentPhoneIdx = i;
      result.student_phone = phone;
      result.debug.studentPhoneLineIdx = lineMapping[i];
      break;
    }
  }
  
  // --- STEP 4: Find guardian info (ONLY if more contact info after student_phone) ---
  if (studentPhoneIdx >= 0) {
    const guardianSearchStart = studentPhoneIdx + 1;
    
    // Look for guardian_name (next name-like line after student_phone)
    let guardianNameIdx = -1;
    for (let i = guardianSearchStart; i < normalizedLines.length; i++) {
      if (looksLikeName(normalizedLines[i])) {
        guardianNameIdx = i;
        result.guardian_name = normalizedLines[i];
        result.debug.guardianNameLineIdx = lineMapping[i];
        break;
      }
    }
    
    // Look for guardian_email (first email after guardian_name)
    const guardianEmailSearchStart = guardianNameIdx >= 0 ? guardianNameIdx + 1 : guardianSearchStart;
    let guardianEmailIdx = -1;
    for (let i = guardianEmailSearchStart; i < normalizedLines.length; i++) {
      const email = extractEmail(normalizedLines[i]);
      if (email && email !== result.student_email) {
        guardianEmailIdx = i;
        result.guardian_email = email;
        result.debug.guardianEmailLineIdx = lineMapping[i];
        break;
      }
    }
    
    // Look for guardian_phone (first phone after guardian_email)
    const guardianPhoneSearchStart = guardianEmailIdx >= 0 ? guardianEmailIdx : guardianEmailSearchStart;
    for (let i = guardianPhoneSearchStart; i < normalizedLines.length; i++) {
      const phone = extractPhone(normalizedLines[i]);
      if (phone && phone !== result.student_phone) {
        result.guardian_phone = phone;
        result.debug.guardianPhoneLineIdx = lineMapping[i];
        break;
      }
    }
  }
  
  // --- Fallbacks if we didn't find structured data ---
  // If no student name but we have email, try first non-email/phone line
  if (!result.student_name && allEmails.length > 0) {
    for (let i = 0; i < normalizedLines.length; i++) {
      const line = normalizedLines[i];
      if (!hasEmail(line) && !hasPhone(line) && looksLikeName(line)) {
        result.student_name = line;
        result.debug.studentNameLineIdx = lineMapping[i];
        break;
      }
    }
    if (!result.student_email) {
      result.student_email = allEmails[0];
    }
  }
  
  // If still no email/phone, take first found
  if (!result.student_email && allEmails.length > 0) {
    result.student_email = allEmails[0];
  }
  if (!result.student_phone && allPhones.length > 0) {
    result.student_phone = allPhones[0];
  }
  
  // Calculate confidence score
  let score = 0;
  if (result.student_name) score += 30;
  if (result.student_email) score += 30;
  if (result.student_phone) score += 30;
  if (result.guardian_name || result.guardian_email || result.guardian_phone) score += 10;
  result.confidence = score;
  
  return result;
}

/**
 * Preprocess image for better OCR results
 * - Resize to reasonable width
 * - Convert to grayscale
 * - Increase contrast
 */
async function preprocessImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Target max width
      const maxWidth = 1600;
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
      }
      
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Draw image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Convert to grayscale and increase contrast
      const contrastFactor = 1.3;
      const brightnessOffset = 10;
      
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale using luminosity method
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // Apply contrast and brightness
        let adjusted = ((gray - 128) * contrastFactor) + 128 + brightnessOffset;
        adjusted = Math.max(0, Math.min(255, adjusted));
        
        data[i] = adjusted;     // R
        data[i + 1] = adjusted; // G
        data[i + 2] = adjusted; // B
        // Alpha stays the same
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Could not create blob from canvas'));
        }
      }, 'image/png');
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    
    img.src = url;
  });
}

/**
 * Run OCR on an image file using Tesseract.js
 * Returns raw text extracted from the image EXACTLY as Tesseract returns
 */
export async function runOcr(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<{ text: string; confidence: number }> {
  // Preprocess image for better OCR
  let processedImage: Blob | File;
  try {
    processedImage = await preprocessImage(imageFile);
  } catch (error) {
    console.warn('Image preprocessing failed, using original:', error);
    processedImage = imageFile;
  }
  
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });
  
  try {
    // Configure for better text recognition
    await worker.setParameters({
      preserve_interword_spaces: '1',
    });
    
    const { data } = await worker.recognize(processedImage);
    
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
 * Full pipeline: Image -> Preprocess -> OCR -> Parse
 */
export async function extractLeadFromScreenshot(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<OcrParsedLead> {
  const { text, confidence } = await runOcr(imageFile, onProgress);
  const parsed = parseLeadFromOcr(text);
  // Average our parsing confidence with Tesseract's OCR confidence
  parsed.confidence = Math.round((parsed.confidence + confidence) / 2);
  return parsed;
}
