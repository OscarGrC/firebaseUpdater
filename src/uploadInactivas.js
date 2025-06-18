const admin = require('firebase-admin');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { parseEmpresa } = require('./parseEmpresa');
const { isValidDate, parseFechaManual } = require('./utils'); 

const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const excelPath = path.join(__dirname, '../data/empresasInactivas.xlsx'); // archivo 
const workbook = xlsx.readFile(excelPath);
const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

const modalidadesMeses = {
  Anual: 12,
  Semestral: 6,
  Trimestral: 3,
};

function primerDiaMes(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function ultimoDiaMes(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function fechaToStr(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function calcularFechas(row) {
  let inicioRaw = row['Inicio'];
  let renovarRaw = row['Renovar'];
  const modalidadRaw = row['modalidad'];

  const modalidad = modalidadRaw ? modalidadRaw.charAt(0).toUpperCase() + modalidadRaw.slice(1).toLowerCase() : null;
  const meses = modalidadesMeses[modalidad] || null;

  const inicioValido = typeof inicioRaw === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(inicioRaw);
  const renovarValido = typeof renovarRaw === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(renovarRaw);

  let inicio, renovar;

  if (inicioValido) inicio = inicioRaw;
  if (renovarValido) renovar = renovarRaw;

  if (!inicioValido && renovarValido && meses) {
    const [d, m, y] = renovarRaw.split('-').map(Number);
    let date = new Date(y, m - 1, d);
    date.setMonth(date.getMonth() - meses);
    date = primerDiaMes(date);
    inicio = fechaToStr(date);
  }

  if (inicioValido && !renovarValido && meses) {
    const [d, m, y] = inicio.split('-').map(Number);
    let date = new Date(y, m - 1, d);
    date.setMonth(date.getMonth() + meses);
    date = ultimoDiaMes(date);
    renovar = fechaToStr(date);
  }

  if (!inicio) inicio = '01-01-2000';
  if (!renovar) renovar = '01-01-2000';

  return { inicio, renovar };
}

const erroresLog = [];

async function uploadInactivas() {
  let success = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];

    const { inicio, renovar } = calcularFechas(raw);

    const filaNormalizada = {
      ...raw,
      Inicio: inicio,
      Renovar: renovar,
      modalidad: raw['modalidad'],
    };

    const { datos: empresa, errores } = parseEmpresa(filaNormalizada, i);

    if (errores.length > 0) {
      erroresLog.push({
        fila: i + 2,
        errores: errores.join(', '),
        razon_social: raw['Razón Social / Marca'] || '',
      });
      continue;
    }

    try {
      const docRef = await db.collection('BajasList').add(empresa);
      await docRef.update({ id: docRef.id });
      success++;
    } catch (err) {
      erroresLog.push({
        fila: i + 2,
        errores: `Error al guardar: ${err.message}`,
        razon_social: raw['Razón Social / Marca'] || '',
      });
    }
  }

  console.log(`✅ Cargados: ${success}`);
  console.log(`❌ Errores: ${erroresLog.length}`);

  if (erroresLog.length > 0) {
    const csv = 'fila,razon_social,errores\n' +
      erroresLog.map(e => `${e.fila},"${e.razon_social}","${e.errores}"`).join('\n');
    fs.writeFileSync(path.join(__dirname, '../logs/errores_inactivas.csv'), csv, 'utf8');
    console.log('📝 Errores guardados en logs/errores_inactivas.csv');
  }
}

uploadInactivas()
  .then(() => process.exit())
  .catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });
