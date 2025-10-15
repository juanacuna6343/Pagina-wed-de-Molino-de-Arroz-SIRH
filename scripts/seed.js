require('dotenv').config();
const admin = require('firebase-admin');

function initAdmin() {
  const hasFirebaseEnv =
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY;

  if (hasFirebaseEnv) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    };
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('Firebase Admin inicializado con credenciales FIREBASE_*');
    return;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    console.log('Firebase Admin inicializado con GOOGLE_APPLICATION_CREDENTIALS');
    return;
  }

  console.error('Falta configuración de Firebase Admin.');
  console.error('Configura FIREBASE_* en .env o GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON.');
  process.exit(1);
}

initAdmin();
const db = admin.firestore();

const EMP_COLLECTION = 'employees';
const CONTRACT_COLLECTION = 'contracts';

async function seed() {
  console.log('Sembrando datos iniciales en Firestore...');

  const employees = [
    {
      NRO_DOCUMENTO: '1001001001',
      NOMBRE: 'Juan',
      APELLIDO: 'Pérez',
      EDAD: 32,
      GENERO: 'Masculino',
      CARGO: 'Operario de molino',
      CORREO: 'juan.perez@molino.com',
      NRO_CONTACTO: '3001234567',
      ESTADO: 'activo',
      OBSERVACIONES: '',
    },
    {
      NRO_DOCUMENTO: '2002002002',
      NOMBRE: 'María',
      APELLIDO: 'Gómez',
      EDAD: 28,
      GENERO: 'Femenino',
      CARGO: 'Auxiliar de calidad',
      CORREO: 'maria.gomez@molino.com',
      NRO_CONTACTO: '3019876543',
      ESTADO: 'activo',
      OBSERVACIONES: 'Llamado de atención en 2024-05 por tardanza',
    },
    {
      NRO_DOCUMENTO: '3003003003',
      NOMBRE: 'Carlos',
      APELLIDO: 'Rodríguez',
      EDAD: 41,
      GENERO: 'Masculino',
      CARGO: 'Supervisor de planta',
      CORREO: 'carlos.rodriguez@molino.com',
      NRO_CONTACTO: '3025556677',
      ESTADO: 'activo',
      OBSERVACIONES: '',
    },
  ];

  // Crear empleados
  const empRefs = [];
  for (const e of employees) {
    const payload = { ...e, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection(EMP_COLLECTION).add(payload);
    console.log('Empleado creado:', ref.id, e.NOMBRE);
    empRefs.push({ id: ref.id, ...e });
  }

  // Crear contratos
  const contracts = [
    {
      Fecha_inicio: '2025-01-01',
      Fecha_fin: '2025-12-31',
      Valor: 24000000,
      employeeId: empRefs[0].id,
      Empleado: `${empRefs[0].NOMBRE} ${empRefs[0].APELLIDO}`,
    },
    {
      Fecha_inicio: '2024-03-01',
      Fecha_fin: '2024-12-31',
      Valor: 18000000,
      employeeId: empRefs[1].id,
      Empleado: `${empRefs[1].NOMBRE} ${empRefs[1].APELLIDO}`,
    },
    {
      Fecha_inicio: '2025-02-01',
      Fecha_fin: '2025-08-31',
      Valor: 36000000,
      employeeId: empRefs[2].id,
      Empleado: `${empRefs[2].NOMBRE} ${empRefs[2].APELLIDO}`,
    },
    {
      Fecha_inicio: '2023-01-01',
      Fecha_fin: '2023-12-31',
      Valor: 22000000,
      employeeId: empRefs[0].id,
      Empleado: `${empRefs[0].NOMBRE} ${empRefs[0].APELLIDO}`,
    },
  ];

  for (const c of contracts) {
    const payload = { ...c, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection(CONTRACT_COLLECTION).add(payload);
    console.log('Contrato creado:', ref.id, c.Empleado);
  }

  console.log('Seed completado.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });