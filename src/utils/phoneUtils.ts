/**
 * Convert Bangla digits to English digits
 */
export const convertBanglaToEnglishDigits = (str: string): string => {
  if (!str) return "";
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/[০-৯]/g, (w) => banglaDigits.indexOf(w).toString());
};

/**
 * Phone Number Normalization Utility
 * Ensures all phone numbers are stored and compared in a standard format.
 * Format: 01XXXXXXXXX (11 digits)
 */
export const normalizePhoneNumber = (phone: string): string => {
  const converted = convertBanglaToEnglishDigits(phone || "");
  let clean = converted.trim().replace(/\D/g, ""); // Remove non-digits
  
  // If starts with 880, remove 880
  if (clean.startsWith("880")) {
    clean = clean.substring(3);
  }
  
  // If it's 10 digits and doesn't start with 0, add 0
  if (clean.length === 10 && !clean.startsWith("0")) {
    clean = "0" + clean;
  }
  
  // Ensure it's 11 digits
  return clean;
};

/**
 * Validate Phone Number
 * Checks if the phone number is a valid Bangladeshi number.
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const normalized = normalizePhoneNumber(phone);
  const bdPhoneRegex = /^01[3-9]\d{8}$/;
  return bdPhoneRegex.test(normalized);
};
