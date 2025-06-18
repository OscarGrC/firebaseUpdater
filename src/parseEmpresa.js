const {
  isValidDate,
  normalizeBool,
  isValidEmail,
  parseArray,
  parseFechaManual
} = require('./utils');

const modalidadesValidas = ['anual', 'semestral', 'trimestral','mensual'];

function validarModalidad(rawModalidad) {
  if (!rawModalidad) return { modalidad: null, error: 'modalidad faltante' };

  const mod = String(rawModalidad).toLowerCase().trim();
  if (modalidadesValidas.includes(mod)) {
    const modalidad = mod.charAt(0).toUpperCase() + mod.slice(1);
    return { modalidad, error: null };
  } else {
    return { modalidad: null, error: `modalidad inválida: ${rawModalidad}` };
  }
}

function parseEmpresa(row, index) {
  const errores = [];
  const empresa = {};

  // Campos básicos
  empresa.fecha_inicio = parseFechaManual(row['Inicio']);
  if (!empresa.fecha_inicio) errores.push('fecha_inicio inválida');

  empresa.fecha_renovacion = parseFechaManual(row['Renovar']);
  if (!empresa.fecha_renovacion) errores.push('fecha_renovacion inválida');

  const { modalidad, error: errorModalidad } = validarModalidad(row['modalidad']);
  if (errorModalidad) errores.push(errorModalidad);
  else empresa.modalidad = modalidad;

  // Booleans
  empresa.mybusiness = normalizeBool(row['MyBusiness']);
  empresa.pendiente_pago = normalizeBool(row['pendiente_pago']);
  empresa.renovacion = normalizeBool(row['renovacion']);

  // Textos normales
  empresa.contacto = (row['contacto'] || '').trim();
  empresa.telefono_contacto = String(row['telefono_contacto'] || '').trim();

  const rawEmails = parseArray(row['Email']);
const emailsValidos = rawEmails.filter(isValidEmail);
const emailsInvalidos = rawEmails.filter(e => !isValidEmail(e));

empresa.email = emailsValidos;

if (emailsInvalidos.length > 0) {
  errores.push(`email inválido: ${emailsInvalidos.join(', ')}`);
}


 empresa.razon_social = (row['Razón Social / Marca'] || '').trim();
  if (!empresa.razon_social) {
    empresa.razon_social = 'RAZON SOCIAL VACIA';
    // Ya no se agrega error por razon_social faltante
  }

  empresa.titular = (row['Titular'] || '').trim();
  empresa.telefono_titular = String(row['telefono_titular'] || '').trim();

  empresa.comentarios = (row['Comentarios'] || '').trim();

  // Campo nuevo por defecto
  empresa.logo = 'no';

  return {
    datos: errores.length ? null : empresa,
    errores
  };
}

module.exports = { parseEmpresa };
