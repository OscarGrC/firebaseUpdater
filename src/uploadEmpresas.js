const admin = require('firebase-admin');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { parseEmpresa } = require('./parseEmpresa');  // CORRECTO: importar como objeto desestructurado

const serviceAccount = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
db.collection('test').add({ test: 'ok' })
  .then(() => console.log('✅ Conexión correcta'))
  .catch((e) => console.error('❌ Error de autenticación:', e.message));
const excelPath = path.join(__dirname, '../data/empresas.xlsx');
const workbook = xlsx.readFile(excelPath);
const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

const erroresLog = [];

async function upload() {
  let success = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const { datos: empresa, errores } = parseEmpresa(raw, i);

    if (errores.length > 0) {
      erroresLog.push({
        fila: i + 2,
        errores: errores.join(', '),
        razon_social: raw['Razón Social / Marca'] || '',
      });
      continue;
    }

    try {
      const docRef = await db.collection('EmpresaList').add(empresa);
      await docRef.update({ id: docRef.id }); // Guardamos el ID generado
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
    fs.writeFileSync(path.join(__dirname, '../logs/errores.csv'), csv, 'utf8');
    console.log('📝 Errores guardados en logs/errores.csv');
  }
}

upload().then(() => process.exit()).catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
