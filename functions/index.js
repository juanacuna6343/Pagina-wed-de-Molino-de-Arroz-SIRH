const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
  console.log('Firebase Admin inicializado con variables de entorno');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.log('Firebase Admin inicializado con credenciales por defecto');
  admin.initializeApp();
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Query:`, req.query);
  console.log(`[HEADERS] x-devpreview: ${req.headers['x-devpreview']}, authorization: ${req.headers.authorization ? 'presente' : 'ausente'}`);
  next();
});

// Configuración de Nodemailer
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// ===================== FUNCIONES AUXILIARES =====================

// Función para generar OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Función para crear OTP en Firestore
async function createOtp(email) {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
  
  const otpRef = await admin.firestore().collection('otps').add({
    email: email.toLowerCase(),
    code,
    expiresAt,
    used: false,
    createdAt: new Date()
  });
  
  return code;
}

// Función para verificar OTP
async function verifyOtp(email, code) {
  const snapshot = await admin.firestore()
    .collection('otps')
    .where('email', '==', email.toLowerCase())
    .where('code', '==', code)
    .where('used', '==', false)
    .where('expiresAt', '>', new Date())
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return { ok: false };
  }
  
  const doc = snapshot.docs[0];
  return { ok: true, id: doc.id };
}

// Función para consumir OTP
async function consumeOtp(otpId) {
  await admin.firestore().collection('otps').doc(otpId).update({
    used: true,
    usedAt: new Date()
  });
}

// Función para enviar email OTP
async function sendOtpEmail(email, code) {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: 'Código de verificación - SIRH Molino de Arroz',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5530;">Código de Verificación</h2>
        <p>Tu código de verificación es:</p>
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
          ${code}
        </div>
        <p>Este código expira en 10 minutos.</p>
        <p style="color: #666; font-size: 12px;">Si no solicitaste este código, puedes ignorar este mensaje.</p>
      </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
}

// ===================== MIDDLEWARE DE AUTENTICACIÓN =====================

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verificando token:', error);
    return res.status(403).json({ error: 'Token inválido' });
  }
}

// ===================== RUTAS API =====================

// Ruta de prueba
app.get('/test', (req, res) => {
  res.json({ message: 'API funcionando correctamente', timestamp: new Date().toISOString() });
});

// Ruta de login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    // Verificar usuario en Firebase Auth
    try {
      const user = await admin.auth().getUserByEmail(email);
      
      // En Firebase Functions, no podemos verificar la contraseña directamente
      // El cliente debe usar Firebase Auth SDK para autenticarse
      res.json({ 
        success: true, 
        message: 'Usuario encontrado. Use Firebase Auth SDK en el cliente.',
        uid: user.uid 
      });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas OTP
app.post('/otp/send', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    
    const code = await createOtp(email);
    console.log(`[OTP] Enviando código ${code} a ${email}`);
    await sendOtpEmail(email, code);
    
    const payload = { ok: true };
    if (process.env.NODE_ENV !== 'production') payload.devCode = code;
    res.json(payload);
  } catch (err) {
    console.error('OTP send error:', err.message);
    res.status(500).json({ error: 'No fue posible enviar el código' });
  }
});

app.post('/otp/verify', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: 'Email y código requeridos' });
    
    console.log(`[OTP] Verificando código ${code} para ${email}`);
    const r = await verifyOtp(email, code);
    if (!r.ok) return res.status(400).json({ error: 'Código inválido o expirado' });
    
    res.json({ ok: true, otpId: r.id });
  } catch (err) {
    console.error('OTP verify error:', err.message);
    res.status(500).json({ error: 'No fue posible verificar el código' });
  }
});

app.post('/password/reset', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'Datos incompletos' });
    
    const r = await verifyOtp(email, code);
    if (!r.ok) return res.status(400).json({ error: 'Código inválido o expirado' });
    
    let uid;
    try {
      const user = await admin.auth().getUserByEmail(email);
      uid = user.uid;
      await admin.auth().updateUser(uid, { password: String(newPassword) });
    } catch (e) {
      const created = await admin.auth().createUser({ 
        email: String(email).toLowerCase(), 
        password: String(newPassword) 
      });
      uid = created.uid;
    }
    
    await consumeOtp(r.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Password reset error:', err.message);
    res.status(500).json({ error: 'No fue posible restablecer la contraseña' });
  }
});

// Rutas protegidas (requieren autenticación)
app.get('/dashboard', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Acceso autorizado al dashboard',
    user: req.user 
  });
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);