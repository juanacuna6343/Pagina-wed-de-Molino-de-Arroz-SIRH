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

function parseArgs() {
  const entries = process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.replace(/^--/, ''))
    .map((kv) => {
      const [k, ...rest] = kv.split('=');
      return [k, rest.join('=')];
    });
  return Object.fromEntries(entries);
}

async function main() {
  initAdmin();
  const args = parseArgs();

  const email = args.email || process.env.CREATE_USER_EMAIL || 'talento@molinoarroz.com';
  const password = args.password || process.env.CREATE_USER_PASSWORD || 'admin123';

  if (!email || !password) {
    console.error('Debe proporcionar email y password.');
    process.exit(1);
  }

  try {
    const user = await admin.auth().createUser({ email, password });
    console.log('Usuario creado:', user.uid, email);
    process.exit(0);
  } catch (err) {
    if (err.errorInfo && err.errorInfo.code === 'auth/email-already-exists') {
      console.log('El correo ya existe en Firebase Auth:', email);
      process.exit(0);
    }
    console.error('Error creando usuario:', err.message || err);
    process.exit(1);
  }
}

main();