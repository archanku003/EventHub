export function isValidEmail(email: string) {
  if (!email || typeof email !== "string") return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

// Strict check for gmail domain (exactly `@gmail.com`)
export function isGmailEmail(email: string) {
  if (!email || typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  // local-part can be anything non-space/non-@, domain must be exactly gmail.com
  const re = /^[^\s@]+@gmail\.com$/i;
  return re.test(normalized);
}

export default { isValidEmail, isGmailEmail };
