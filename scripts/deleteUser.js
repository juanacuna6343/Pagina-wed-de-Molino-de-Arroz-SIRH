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

  const email = args.email || process.env.DELETE_USER_EMAIL;
  if (!email) {
    console.error('Debe proporcionar --email=<correo> para eliminar.');
    process.exit(1);
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(user.uid);
    console.log('Usuario eliminado:', user.uid, email);
    process.exit(0);
  } catch (err) {
    if (err.errorInfo && err.errorInfo.code === 'auth/user-not-found') {
      console.log('El correo no existe en Firebase Auth:', email);
      process.exit(0);
    }
    console.error('Error eliminando usuario:', err.message || err);
    process.exit(1);
  }
}

main();