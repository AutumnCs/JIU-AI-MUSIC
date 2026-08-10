export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') throw new Error('invalid_email');
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('invalid_email');
  }
  return email;
}

export function validatePassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8 || value.length > 72) {
    throw new Error('invalid_password');
  }
  return value;
}

export function validateDisplayName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('invalid_display_name');
  const displayName = value.trim();
  if (displayName.length < 1 || displayName.length > 24) throw new Error('invalid_display_name');
  return displayName;
}
