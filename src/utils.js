//src/utils.js

function isValidDate(str) {
    return /^\d{2}-\d{2}-\d{4}$/.test(str);
  }
  
  function normalizeBool(value) {
    if (typeof value === 'boolean') return value;
    const str = String(value).toLowerCase().trim();
    return ['1', 'true', 'sí', 'si', 'yes', 'x'].includes(str);
  }
  
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
  }
  
  function parseArray(str) {
    if (!str) return [];
    return String(str)
      .split(/[/,;\n]+|\s{2,}/) // separadores: / , ; doble espacio o salto
      .map(s => s.trim())
      .filter(Boolean);
  }
  /**
 * Convierte una fecha tipo "1 may 24" en "01-05-2024"
 * @param {string} fechaStr
 * @returns {string|null}
 */
function parseFechaManual(serial) {
  // Excel fecha base: 1 enero 1900 -> serial 1
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);

  const year = date_info.getFullYear();
  const month = date_info.getMonth() + 1; // 0-based
  const day = date_info.getDate();

  // Formatear a dd-mm-yyyy
  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
}
  module.exports = {
    isValidDate,
    normalizeBool,
    isValidEmail,
    parseArray,parseFechaManual
  };