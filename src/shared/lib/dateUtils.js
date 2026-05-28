/**
 * Utilidades para fechas solo-día (LocalDate del backend, YYYY-MM-DD).
 * Evita desfases por zona horaria al usar new Date('YYYY-MM-DD') (UTC).
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

export function parseLocalDate(value) {
  if (!value) return null;
  const match = String(value).match(ISO_DATE);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function toInputDateValue(value) {
  if (!value) return '';
  const match = String(value).match(ISO_DATE);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

export function formatLocalDate(value) {
  const date = parseLocalDate(value);
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Convierte texto DD/MM/AAAA a YYYY-MM-DD. Devuelve null si es inválido. */
export function parseDisplayDate(display) {
  if (!display || typeof display !== 'string') return null;
  const match = display.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Formatea dígitos mientras el usuario escribe: DD/MM/AAAA */
export function formatDateTyping(input) {
  const digits = String(input).replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function isIsoDateInRange(iso, min, max) {
  if (!iso) return true;
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}

export function getTomorrowInputDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isBeforeToday(value) {
  const date = parseLocalDate(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/** Formatea fecha y hora del servidor (LocalDateTime) en DD/MM/AAAA HH:mm */
export function formatDateTime(value) {
  if (!value) return '';
  const str = String(value);
  const date = /[zZ]|[+-]\d{2}:\d{2}$/.test(str)
    ? new Date(str)
    : new Date(str.includes('T') ? `${str}Z` : str);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
