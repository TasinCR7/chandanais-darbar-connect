// Bangla numeral utilities

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBanglaNumber(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => BANGLA_DIGITS[parseInt(d, 10)]);
}

export function pad2Bn(n: number): string {
  return toBanglaNumber(String(n).padStart(2, '0'));
}
