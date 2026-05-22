function normalizeText(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function isValidEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpf(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return null;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function isValidCpf(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const calc = (slice) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
      sum += Number(slice[i]) * (slice.length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = calc(digits.slice(0, 9));
  const d2 = calc(digits.slice(0, 10));
  return d1 === Number(digits[9]) && d2 === Number(digits[10]);
}

function looksLikeCpf(value) {
  return onlyDigits(value).length >= 11;
}

function strongEnoughPassword(value) {
  return typeof value === "string" && value.length >= 6;
}

function pick(object, keys) {
  const result = {};
  keys.forEach((key) => {
    if (object[key] !== undefined) result[key] = object[key];
  });
  return result;
}

module.exports = {
  normalizeText,
  isValidEmail,
  onlyDigits,
  formatCpf,
  isValidCpf,
  looksLikeCpf,
  strongEnoughPassword,
  pick,
};
