// Shared utilities for payment options and customizable feature bullet points

export const DEFAULT_PAY_NOW_POINTS = [
  "£{amount} due today to start process",
  "Remaining amount paid upon call with executive",
  "Premium concierge service included"
];

export const DEFAULT_PAY_IN_FULL_POINTS = [
  "Pay entire amount upfront",
  "Premium concierge service included"
];

export const DEFAULT_WHATS_INCLUDED_POINTS = [
  "1-on-1 Dedicated Senior Visa Case Officer",
  "Official Embassy Dossier Audit & Error-Check",
  "Priority Consulate / Biometrics Appointment Booking",
  "Confirmed Flight & Hotel Reservation Vouchers",
  "Consulate-Approved Travel Medical Insurance",
  "100% Pre-Check Money-Back Approval Guarantee"
];

/**
 * Replaces placeholders like £{amount} or {amount} or {symbol} in point text
 */
export const resolvePointText = (text, amount, symbol = '£') => {
  if (!text || typeof text !== 'string') return '';
  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const formattedAmount = Number.isInteger(numAmount) ? numAmount.toString() : numAmount.toFixed(2).replace(/\.00$/, '');
  
  return text
    .replace(/£?\{amount\}/g, `${symbol}${formattedAmount}`)
    .replace(/\{symbol\}/g, symbol);
};

/**
 * Helper to check if configuration has a Pay in Full option (> 0)
 */
export const hasPayInFullOption = (serviceFee) => {
  if (!serviceFee) return false;
  if (typeof serviceFee === 'object' && serviceFee !== null) {
    const payInFull = parseFloat(serviceFee.pay_in_full_amount);
    return !isNaN(payInFull) && payInFull > 0;
  }
  return false;
};

/**
 * Returns array of Pay Now points (with fallback to default)
 */
export const getPayNowPoints = (serviceFee) => {
  if (serviceFee && typeof serviceFee === 'object' && Array.isArray(serviceFee.pay_now_points) && serviceFee.pay_now_points.length > 0) {
    const filtered = serviceFee.pay_now_points.filter(p => typeof p === 'string' && p.trim().length > 0);
    if (filtered.length > 0) return filtered;
  }
  return DEFAULT_PAY_NOW_POINTS;
};

/**
 * Returns array of Pay in Full points (with fallback to default)
 */
export const getPayInFullPoints = (serviceFee) => {
  if (serviceFee && typeof serviceFee === 'object' && Array.isArray(serviceFee.pay_in_full_points) && serviceFee.pay_in_full_points.length > 0) {
    const filtered = serviceFee.pay_in_full_points.filter(p => typeof p === 'string' && p.trim().length > 0);
    if (filtered.length > 0) return filtered;
  }
  return DEFAULT_PAY_IN_FULL_POINTS;
};

/**
 * Returns array of "What's Included in Your Service" points (with fallback to default)
 */
export const getWhatsIncludedPoints = (source) => {
  if (Array.isArray(source) && source.length > 0) {
    const filtered = source.filter(p => typeof p === 'string' && p.trim().length > 0);
    if (filtered.length > 0) return filtered;
  }
  if (source && typeof source === 'object') {
    const candidate = source.whats_included || source.service_fee?.whats_included || source.form_schema?.whats_included;
    if (Array.isArray(candidate) && candidate.length > 0) {
      const filtered = candidate.filter(p => typeof p === 'string' && p.trim().length > 0);
      if (filtered.length > 0) return filtered;
    }
  }
  return DEFAULT_WHATS_INCLUDED_POINTS;
};

