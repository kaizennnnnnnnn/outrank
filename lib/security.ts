// Lightweight sanitization — strips all HTML tags
// No dependency on isomorphic-dompurify/canvas (which breaks on Vercel)

export const sanitize = (input: string): string => {
  return input
    .trim()
    .replace(/<[^>]*>/g, '')       // Strip HTML tags
    .replace(/&[a-z]+;/gi, '')     // Strip HTML entities
    .replace(/javascript:/gi, '')   // Strip JS protocol
    .replace(/on\w+\s*=/gi, '');   // Strip event handlers
};

export const sanitizeUsername = (username: string): string => {
  return username.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
};

export const validateLogValue = (value: number, max: number = 10000): boolean => {
  return Number.isFinite(value) && value > 0 && value <= max;
};

export const sanitizeBio = (bio: string): string => {
  return sanitize(bio).slice(0, 160);
};

export const sanitizeNote = (note: string): string => {
  return sanitize(note).slice(0, 280);
};

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isStrongPassword = (password: string): boolean => {
  return (
    password.length >= 8 &&
    /\d/.test(password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(password)
  );
};
