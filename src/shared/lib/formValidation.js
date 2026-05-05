/**
 * Helpers de validación para formularios.
 */

export function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value) {
  return /^[0-9]{7,15}$/.test(value);
}
