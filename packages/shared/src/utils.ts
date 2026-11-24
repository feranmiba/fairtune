/**
 * Validates that an array of percentage numbers sums to 100 within floating point epsilon
 */
export function validateRoyaltySplits(percentages: number[]): {
  isValid: boolean;
  total: number;
  difference: number;
} {
  const total = percentages.reduce((acc, curr) => acc + curr, 0);
  const roundedTotal = Math.round(total * 100) / 100;
  const difference = Math.round((100.0 - roundedTotal) * 100) / 100;

  return {
    isValid: Math.abs(roundedTotal - 100.0) < 0.001,
    total: roundedTotal,
    difference,
  };
}

/**
 * Checks if a string is a valid Stellar Ed25519 public address (G...) format
 */
export function isValidStellarPublicKeyFormat(address: string): boolean {
  if (typeof address !== 'string') return false;
  // Stellar public keys are 56 alphanumeric characters starting with 'G'
  const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
  return stellarAddressRegex.test(address);
}

/**
 * Sanitizes an original filename to prevent directory traversal or invalid characters
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .substring(0, 255);
}
