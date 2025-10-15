require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging para diagnosticar rutas
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Query:`, req.query);
  console.log(`[HEADERS] x-devpreview: ${req.headers['x-devpreview']}, authorization: ${req.headers.authorization ? 'presente' : 'ausente'}`);
  next();
});

// Firebase Admin initialization using environment variables
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

function initAdmin() {
  if (credsPath && fs.existsSync(credsPath)) {
    console.log('Firebase Admin inicializado con GOOGLE_APPLICATION_CREDENTIALS');
    admin.initializeApp({
      credential: admin.credential.cert(credsPath),
    });
  } else if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    console.log('Firebase Admin inicializado con variables de entorno');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    console.error('No se encontraron credenciales válidas para Firebase Admin');
    process.exit(1);
  }
}

initAdmin();

const db = admin.firestore();

// Constantes de colecciones
const EMP_COLLECTION = 'employees';
const CONTRACT_COLLECTION = 'contracts';
const OTP_COLLECTION = 'otp_codes';
const otpExpiryMinutes = 10;

// Middleware de autenticación
const authMiddleware = async (req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const devBypass = isDev && (req.headers['x-devpreview'] === '1' || req.query.devpreview === '1');
  
  console.log(`[AUTH] Ruta: ${req.path}, isDev: ${isDev}, devBypass: ${devBypass}`);
  console.log(`[AUTH] Headers x-devpreview: ${req.headers['x-devpreview']}, Query devpreview: ${req.query.devpreview}`);
  
  if (devBypass) { 
    console.log('[AUTH] Bypass de desarrollo activado');
    req.user = { devpreview: true }; 
    return next(); 
  }

  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.*)$/);
  if (!match) {
    console.log('[AUTH] Token no proporcionado');
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    console.log('[AUTH] Token válido para usuario:', decoded.uid);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('[AUTH] Error verificando token', err.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Crear router para las rutas API
const apiRouter = express.Router();

// RUTAS DE REPORTES GLOBALES
console.log('Registrando ruta: /api/reports/contracts/pdf');
apiRouter.get('/reports/contracts/pdf', authMiddleware, async (req, res) => {
  console.log('Ruta PDF llamada con headers:', req.headers);
  try {
    const snap = await db.collection(CONTRACT_COLLECTION).orderBy('Fecha_inicio').get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=contratos_todos.pdf');

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);
    const accent = '#16a34a';
    const dark = '#111827';

    doc.fillColor(dark).font('Helvetica-Bold').fontSize(20).text('Molino de Arroz — Reporte de Contratos (Todos)', { align: 'center' });
    doc.moveDown(0.4);
    doc.strokeColor(accent).lineWidth(2)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.6);

    const colX = [doc.page.margins.left, doc.page.margins.left + 200, doc.page.margins.left + 340, doc.page.margins.left + 440];
    let rowY = doc.y;
    const drawHeader = () => {
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Empleado', colX[0], rowY);
      doc.text('Inicio', colX[1], rowY);
      doc.text('Fin', colX[2], rowY);
      doc.text('Valor', colX[3], rowY);
      rowY += 20;
      doc.font('Helvetica').fontSize(11);
    };
    const ensurePage = () => {
      if (rowY > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        rowY = doc.page.margins.top;
        drawHeader();
      }
    };
    drawHeader();
    items.forEach((c) => {
      ensurePage();
      doc.text(String(c.Empleado || ''), colX[0], rowY);
      doc.text(String(c.Fecha_inicio || ''), colX[1], rowY);
      doc.text(String(c.Fecha_fin || ''), colX[2], rowY);
      doc.text(`$${Number(c.Valor || 0).toLocaleString('es-CO')}`, colX[3], rowY);
      rowY += 18;
    });

    doc.moveDown(1);
    doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text(`Generado: ${new Date().toLocaleString('es-CO')}`, { align: 'right' });
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generando PDF de contratos' });
  }
});

console.log('Registrando ruta: /api/reports/contracts/xlsx');
apiRouter.get('/reports/contracts/xlsx', authMiddleware, async (req, res) => {
  console.log('Ruta XLSX llamada con headers:', req.headers);
  try {
    const snap = await db.collection(CONTRACT_COLLECTION).orderBy('Fecha_inicio').get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Contratos');
    ws.columns = [
      { header: 'Empleado', key: 'Empleado', width: 24 },
      { header: 'Fecha inicio', key: 'Fecha_inicio', width: 16 },
      { header: 'Fecha fin', key: 'Fecha_fin', width: 16 },
      { header: 'Valor', key: 'Valor', width: 12 },
      { header: 'ID', key: 'id', width: 24 },
    ];
    items.forEach((c) => ws.addRow(c));

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=contratos_todos.xlsx');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generando XLSX de contratos' });
  }
});

// ========== OTP helpers ==========

function createTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn('GMAIL_USER/GMAIL_APP_PASSWORD no configurados. OTP por correo estará inactivo.');
    return null;
  }
  // Usar SMTP directo de Gmail (requiere App Password y 2FA)
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

async function sendOtpEmail(to, code) {
  const transporter = createTransport();
  if (!transporter) throw new Error('Email transporter no disponible');
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;">
      <h2>Verificación de seguridad</h2>
      <p>Tu código de verificación es:</p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</div>
      <p>Este código expira en ${otpExpiryMinutes} minutos.</p>
    </div>
  `;
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject: 'Código de verificación',
    html,
  });
}

async function createOtp(email) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + otpExpiryMinutes * 60 * 1000;
  const doc = {
    email: String(email).toLowerCase(),
    code,
    expiresAt,
    used: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await db.collection(OTP_COLLECTION).add(doc);
  return code;
}

async function verifyOtp(email, code) {
  const q = await db
    .collection(OTP_COLLECTION)
    .where('email', '==', String(email).toLowerCase())
    .limit(20)
    .get();
  const now = Date.now();
  for (const d of q.docs) {
    const data = d.data();
    if (!data.used && String(data.code) === String(code) && Number(data.expiresAt) > now) {
      return { ok: true, id: d.id };
    }
  }
  return { ok: false };
}

async function consumeOtp(otpId) {
  if (!otpId) return;
  await db.collection(OTP_COLLECTION).doc(otpId).update({ used: true, usedAt: admin.firestore.FieldValue.serverTimestamp() });
}

// Healthcheck
apiRouter.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Diagnóstico de conexión a Firestore
apiRouter.get('/diag', async (req, res) => {
  try {
    const empCount = (await db.collection(EMP_COLLECTION).limit(1).get()).size;
    const conCount = (await db.collection(CONTRACT_COLLECTION).limit(1).get()).size;
    res.json({ firestoreConnected: true, sample: { employees: empCount, contracts: conCount } });
  } catch (err) {
    console.error('Diag Firestore error:', err.message);
    res.status(500).json({ firestoreConnected: false, error: err.message });
  }
});

// ===================== EMPLEADOS (CRUD) =====================
apiRouter.get('/employees', authMiddleware, async (req, res) => {
  try {
    const snap = await db.collection(EMP_COLLECTION).orderBy('NOMBRE').get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando empleados' });
  }
});

apiRouter.get('/employees/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection(EMP_COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo empleado' });
  }
});

apiRouter.post('/employees', authMiddleware, async (req, res) => {
  try {
    const data = req.body || {};
    // Validación mínima
    const required = ['NRO_DOCUMENTO', 'NOMBRE', 'APELLIDO', 'EDAD', 'GENERO', 'CARGO', 'CORREO', 'NRO_CONTACTO', 'ESTADO'];
    for (const k of required) {
      if (!(k in data)) return res.status(400).json({ error: `Falta el campo ${k}` });
    }
    const payload = {
      NRO_DOCUMENTO: String(data.NRO_DOCUMENTO),
      NOMBRE: String(data.NOMBRE),
      APELLIDO: String(data.APELLIDO),
      EDAD: Number(data.EDAD),
      GENERO: String(data.GENERO),
      CARGO: String(data.CARGO),
      CORREO: String(data.CORREO),
      FOTO_URL: data.FOTO_URL ? String(data.FOTO_URL) : '',
      NRO_CONTACTO: String(data.NRO_CONTACTO),
      ESTADO: String(data.ESTADO), // 'activo' | 'retirado'
      OBSERVACIONES: data.OBSERVACIONES ? String(data.OBSERVACIONES) : '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection(EMP_COLLECTION).add(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando empleado' });
  }
});

apiRouter.put('/employees/:id', authMiddleware, async (req, res) => {
  try {
    const data = req.body || {};
    await db.collection(EMP_COLLECTION).doc(req.params.id).update({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const doc = await db.collection(EMP_COLLECTION).doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando empleado' });
  }
});

apiRouter.delete('/employees/:id', authMiddleware, async (req, res) => {
  try {
    await db.collection(EMP_COLLECTION).doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando empleado' });
  }
});

// ===================== CONTRATOS (CRUD) =====================
apiRouter.get('/contracts', authMiddleware, async (req, res) => {
  try {
    const { employeeId } = req.query;
    let ref = db.collection(CONTRACT_COLLECTION);
    // Evitar necesidad de índice compuesto: solo ordenamos si NO filtramos
    if (employeeId) {
      ref = ref.where('employeeId', '==', String(employeeId));
    } else {
      ref = ref.orderBy('Fecha_inicio');
    }
    const snap = await ref.get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listando contratos' });
  }
});

apiRouter.get('/contracts/:id', authMiddleware, async (req, res) => {
  try {
    const doc = await db.collection(CONTRACT_COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Contrato no encontrado' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo contrato' });
  }
});

apiRouter.post('/contracts', authMiddleware, async (req, res) => {
  try {
    const data = req.body || {};
    const required = ['Fecha_inicio', 'Fecha_fin', 'Valor', 'employeeId', 'Empleado'];
    for (const k of required) {
      if (!(k in data)) return res.status(400).json({ error: `Falta el campo ${k}` });
    }
    const payload = {
      Fecha_inicio: String(data.Fecha_inicio),
      Fecha_fin: String(data.Fecha_fin),
      Valor: Number(data.Valor),
      employeeId: String(data.employeeId),
      Empleado: String(data.Empleado),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection(CONTRACT_COLLECTION).add(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando contrato' });
  }
});

apiRouter.put('/contracts/:id', authMiddleware, async (req, res) => {
  try {
    const data = req.body || {};
    await db.collection(CONTRACT_COLLECTION).doc(req.params.id).update({ ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const doc = await db.collection(CONTRACT_COLLECTION).doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando contrato' });
  }
});

apiRouter.delete('/contracts/:id', authMiddleware, async (req, res) => {
  try {
    await db.collection(CONTRACT_COLLECTION).doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando contrato' });
  }
});

// ===================== BÚSQUEDA Y EXPORTACIÓN =====================
// Buscar por NRO_DOCUMENTO o NOMBRE
apiRouter.get('/search', authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Parámetro q requerido' });

    let empSnap = await db
      .collection(EMP_COLLECTION)
      .where('NRO_DOCUMENTO', '==', q)
      .get();

    if (empSnap.empty) {
      empSnap = await db
        .collection(EMP_COLLECTION)
        .where('NOMBRE', '==', q)
        .get();
    }

    if (empSnap.empty) return res.status(404).json({ error: 'Empleado no encontrado' });
    const empDoc = empSnap.docs[0];
    const employee = { id: empDoc.id, ...empDoc.data() };

    const contractsSnap = await db
      .collection(CONTRACT_COLLECTION)
      .where('employeeId', '==', empDoc.id)
      .get();
    const contracts = contractsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ employee, totalContratos: contracts.length, contratos: contracts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en búsqueda' });
  }
});

// Exportar PDF de contratos por empleado
apiRouter.get('/employees/:id/contracts/pdf', authMiddleware, async (req, res) => {
  try {
    const empDoc = await db.collection(EMP_COLLECTION).doc(req.params.id).get();
    if (!empDoc.exists) return res.status(404).json({ error: 'Empleado no encontrado' });
    const employee = { id: empDoc.id, ...empDoc.data() };

    const contractsSnap = await db
      .collection(CONTRACT_COLLECTION)
      .where('employeeId', '==', employee.id)
      .get();
    const contracts = contractsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=contratos_${employee.NRO_DOCUMENTO || employee.id}.pdf`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    const accent = '#16a34a';
    const dark = '#111827';
    const border = '#1f2937';
    const innerWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Título estilizado
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(20).text('Molino de Arroz — Reporte de Contratos', { align: 'center' });
    doc.moveDown(0.4);
    doc.strokeColor(accent).lineWidth(2)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();

    // Tarjeta con datos del empleado
    const cardTop = doc.y + 12;
    const cardHeight = 80;
    doc.lineWidth(1).strokeColor(border).rect(doc.page.margins.left, cardTop, innerWidth, cardHeight).stroke();
    let y = cardTop + 12;
    const x = doc.page.margins.left + 10;
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(12).text('Empleado:', x, y, { continued: true }).font('Helvetica').text(` ${employee.NOMBRE} ${employee.APELLIDO}`);
    y += 18;
    doc.font('Helvetica-Bold').text('Documento:', x, y, { continued: true }).font('Helvetica').text(` ${employee.NRO_DOCUMENTO}`);
    y += 18;
    doc.font('Helvetica-Bold').text('Cargo:', x, y, { continued: true }).font('Helvetica').text(` ${employee.CARGO || '-'}`);
    y += 18;
    doc.font('Helvetica-Bold').text('Estado:', x, y, { continued: true }).font('Helvetica').text(` ${employee.ESTADO}`);

    // Resumen
    doc.moveTo(doc.page.margins.left, cardTop + cardHeight + 10);
    doc.moveDown(3);
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(12).text(`Total de contratos: ${contracts.length}`);

    // Tabla de contratos con encabezado
    const tableX = doc.page.margins.left;
    const tableY = doc.y + 8;
    const colW = [50, 140, 140, 140];
    const colX = [tableX, tableX + colW[0], tableX + colW[0] + colW[1], tableX + colW[0] + colW[1] + colW[2]];
    const tableW = colW.reduce((a, b) => a + b, 0);

    // Encabezado
    doc.fillColor('#0b1220').rect(tableX, tableY, tableW, 24).fill();
    doc.fillColor('#e5e7eb').font('Helvetica-Bold').fontSize(11);
    doc.text('#', colX[0] + 6, tableY + 6);
    doc.text('Inicio', colX[1] + 6, tableY + 6);
    doc.text('Fin', colX[2] + 6, tableY + 6);
    doc.text('Valor', colX[3] + 6, tableY + 6);

    // Filas
    let rowY = tableY + 24;
    contracts.forEach((c, idx) => {
      // zebra
      if (idx % 2 === 0) {
        doc.save();
        doc.fillColor('#0b1220').opacity(0.06).rect(tableX, rowY, tableW, 22).fill();
        doc.restore();
      }
      doc.fillColor(dark).font('Helvetica').fontSize(11);
      doc.text(String(idx + 1), colX[0] + 6, rowY + 4);
      doc.text(String(c.Fecha_inicio), colX[1] + 6, rowY + 4);
      doc.text(String(c.Fecha_fin), colX[2] + 6, rowY + 4);
      doc.text(`$${Number(c.Valor).toLocaleString('es-CO')}`, colX[3] + 6, rowY + 4);
      rowY += 22;

      // salto de página si es necesario
      const bottomLimit = doc.page.height - doc.page.margins.bottom - 40;
      if (rowY > bottomLimit && idx < contracts.length - 1) {
        doc.addPage();
        // Redibujar encabezado en nueva página
        rowY = doc.page.margins.top;
        doc.fillColor('#0b1220').rect(tableX, rowY, tableW, 24).fill();
        doc.fillColor('#e5e7eb').font('Helvetica-Bold').fontSize(11);
        doc.text('#', colX[0] + 6, rowY + 6);
        doc.text('Inicio', colX[1] + 6, rowY + 6);
        doc.text('Fin', colX[2] + 6, rowY + 6);
        doc.text('Valor', colX[3] + 6, rowY + 6);
        rowY += 24;
      }
    });

    // Pie
    doc.moveDown(1);
    doc.fillColor('#6b7280').font('Helvetica').fontSize(9).text(`Generado: ${new Date().toLocaleString('es-CO')}`, { align: 'right' });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generando PDF' });
  }
});

// Exportar XLSX de contratos por empleado
apiRouter.get('/employees/:id/contracts/xlsx', authMiddleware, async (req, res) => {
  try {
    const empDoc = await db.collection(EMP_COLLECTION).doc(req.params.id).get();
    if (!empDoc.exists) return res.status(404).json({ error: 'Empleado no encontrado' });
    const employee = { id: empDoc.id, ...empDoc.data() };
    const contractsSnap = await db
      .collection(CONTRACT_COLLECTION)
      .where('employeeId', '==', employee.id)
      .get();
    const contracts = contractsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Contratos');
    ws.columns = [
      { header: 'ID', key: 'id', width: 24 },
      { header: 'Fecha inicio', key: 'Fecha_inicio', width: 16 },
      { header: 'Fecha fin', key: 'Fecha_fin', width: 16 },
      { header: 'Valor', key: 'Valor', width: 12 },
      { header: 'Empleado', key: 'Empleado', width: 24 },
    ];
    contracts.forEach((c) => ws.addRow(c));

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=contratos_${employee.NRO_DOCUMENTO || employee.id}.xlsx`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generando XLSX' });
  }
});

// ====== OTP API (sin auth, para recuperación) ======
apiRouter.post('/otp/send', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    // Enviar OTP a cualquier correo (sin requerir usuario existente)
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

apiRouter.post('/otp/verify', async (req, res) => {
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

apiRouter.post('/password/reset', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'Datos incompletos' });
    const r = await verifyOtp(email, code);
    if (!r.ok) return res.status(400).json({ error: 'Código inválido o expirado' });
    // Si el usuario no existe, crearlo; si existe, actualizar contraseña
    let uid;
    try {
      const user = await admin.auth().getUserByEmail(email);
      uid = user.uid;
      await admin.auth().updateUser(uid, { password: String(newPassword) });
    } catch (e) {
      // Crear usuario nuevo si no existe
      const created = await admin.auth().createUser({ email: String(email).toLowerCase(), password: String(newPassword) });
      uid = created.uid;
    }
    await consumeOtp(r.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Password reset error:', err.message);
    res.status(500).json({ error: 'No fue posible restablecer la contraseña' });
  }
});

// ===================== SERVIDOR =====================

// Montar el router API
app.use('/api', apiRouter);

// Servir archivos estáticos DESPUÉS de todas las rutas API
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});